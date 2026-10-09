import { AccessRequest, User } from "../models.js";
import { AppError, conflict, forbidden, notFound } from "../middleware/errors.js";
import { recordAudit } from "../middleware/audit.js";
import { nextStudentId } from "../lib/studentIds.js";

export const REAPPLY_LOCK_MS = 24 * 3_600_000;

/**
 * Submit an access request for an authenticated student.
 * Guards (in order): existing pending (409), active rejection lock (403 +
 * retryAfter from the SERVER-recorded timestamp). A partial unique index is
 * the final backstop against concurrent duplicates.
 */
export async function submitAccessRequest(user, { note = "" } = {}) {
  const existingPending = await AccessRequest.findOne({ user: user._id, status: "pending" }).lean();
  if (existingPending) {
    throw conflict("IDEMPOTENCY_CONFLICT", "An access request is already pending for this account");
  }
  const latestRejected = await AccessRequest.findOne({ user: user._id, status: "rejected" })
    .sort({ decidedAt: -1 })
    .lean();
  if (latestRejected && latestRejected.reapplyAfter && latestRejected.reapplyAfter.getTime() > Date.now()) {
    const retryAfterSec = Math.max(1, Math.ceil((latestRejected.reapplyAfter.getTime() - Date.now()) / 1000));
    throw new AppError(403, "REAPPLICATION_LOCKED",
      "A previous request was rejected; reapplication is locked for 24 hours from the rejection time",
      undefined, retryAfterSec);
  }
  try {
    const created = await AccessRequest.create({ user: user._id, status: "pending", note: String(note || "").slice(0, 500) });
    return created.toObject();
  } catch (err) {
    if (err && err.code === 11000) {
      throw conflict("IDEMPOTENCY_CONFLICT", "An access request is already pending for this account");
    }
    throw err;
  }
}

const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._ +-]*[A-Za-z0-9._+-]$|^[A-Za-z0-9]$/;

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate and normalize a student repository folder.
 * Ensures the folder is rooted at folderRoot (e.g. students/) with a valid child segment.
 * Accepts either "students/Name" or just "Name".
 */
export function validateStudentFolder(rawFolder, folderRoot = "students/") {
  if (typeof rawFolder !== "string" || !rawFolder.trim()) {
    return { valid: false, error: "Folder path is required and cannot be empty" };
  }
  const root = folderRoot.endsWith("/") ? folderRoot : `${folderRoot}/`;
  let norm = rawFolder.trim().replace(/\\/g, "/");
  if (!norm.startsWith(root)) {
    norm = `${root}${norm}`;
  }
  norm = norm.replace(/\/+$/, "");
  if (norm.includes("//") || norm.includes("..") || norm.includes("/./")) {
    return { valid: false, error: "Folder path contains invalid or traversal segments" };
  }
  const rel = norm.slice(root.length);
  if (!rel || rel.includes("/")) {
    return { valid: false, error: "Student folder must be a direct subdirectory of the student root" };
  }
  if (!SEGMENT_RE.test(rel)) {
    return { valid: false, error: `Invalid student folder name: '${rel}'` };
  }
  return { valid: true, folder: norm };
}

/**
 * Decide a pending request atomically: only a document still in `pending`
 * transitions, so repeated/stale decisions 404 instead of corrupting state.
 * Approving a first-time student allocates the stable internal ID + folder.
 */
export async function decideAccessRequest({ requestId, adminUser, decision, folderRoot, customFolder }) {
  if (!["approve", "reject"].includes(decision)) {
    throw new AppError(400, "VALIDATION_ERROR", "Decision must be 'approve' or 'reject'");
  }
  if (typeof requestId !== "string" || !/^[0-9a-fA-F]{24}$/.test(requestId)) {
    throw notFound("Access request not found");
  }

  let validatedFolder = null;
  if (decision === "approve" && customFolder) {
    const res = validateStudentFolder(customFolder, folderRoot);
    if (!res.valid) {
      throw new AppError(400, "VALIDATION_ERROR", res.error);
    }
    validatedFolder = res.folder;
  }

  const now = new Date();
  const update = decision === "approve"
    ? { $set: { status: "approved", decidedAt: now, decidedBy: adminUser._id, reapplyAfter: null } }
    : { $set: { status: "rejected", decidedAt: now, decidedBy: adminUser._id, reapplyAfter: new Date(now.getTime() + REAPPLY_LOCK_MS) } };

  const request = await AccessRequest.findOneAndUpdate(
    { _id: requestId, status: "pending" },
    update,
    { new: true },
  );
  if (!request) {
    const exists = await AccessRequest.findById(requestId).lean();
    if (!exists) throw notFound("Access request not found");
    throw conflict("IDEMPOTENCY_CONFLICT", `Request is already ${exists.status}; only pending requests can be decided`);
  }

  if (decision === "approve") {
    const student = await User.findById(request.user);
    if (student) {
      let changed = false;
      if (student.accountStatus !== "approved") { student.accountStatus = "approved"; changed = true; }

      if (validatedFolder) {
        // Enforce uniqueness against other students
        const existing = await User.findOne({
          folder: new RegExp(`^${escapeRegex(validatedFolder)}$`, "i"),
          _id: { $ne: student._id },
        }).lean();
        if (existing) {
          throw conflict("FOLDER_ALREADY_CLAIMED", `Folder '${validatedFolder}' is already claimed by another student`);
        }
        student.folder = validatedFolder;
        changed = true;
      }

      if (!student.studentId) {
        const { studentId, folder } = await nextStudentId(folderRoot);
        student.studentId = studentId;
        if (!student.folder) {
          // Check that generated folder doesn't conflict
          const existingGen = await User.findOne({
            folder: new RegExp(`^${escapeRegex(folder)}$`, "i"),
            _id: { $ne: student._id },
          }).lean();
          if (existingGen) {
            throw conflict("FOLDER_ALREADY_CLAIMED", `Generated folder '${folder}' is already claimed by another student`);
          }
          student.folder = folder;
        }
        changed = true;
      }
      if (changed) await student.save();
    }
  } else {
    await User.updateOne(
      { _id: request.user, accountStatus: { $ne: "suspended" } },
      { $set: { accountStatus: "rejected" } },
    );
  }

  await recordAudit({
    actorId: adminUser._id,
    action: decision === "approve" ? "ACCESS_APPROVE" : "ACCESS_REJECT",
    targetType: "access-request",
    targetId: request._id,
    detail: decision === "reject" ? "Rejected; 24h reapply lock from server-recorded rejection time." : "Approved.",
  });
  return request.toObject();
}

export async function getOwnRequest(user) {
  const latest = await AccessRequest.findOne({ user: user._id }).sort({ submittedAt: -1 }).lean();
  return latest;
}

export function serializeRequest(r) {
  if (!r) return null;
  // Admin listings populate `user` (and `decidedBy`); self-service views do
  // not. Handle both so populated logins are never lost to "[object Object]".
  const u = r.user && typeof r.user === "object" ? r.user : null;
  const decider = r.decidedBy && typeof r.decidedBy === "object" ? r.decidedBy : null;
  return {
    id: String(r._id),
    userId: u ? String(u._id) : String(r.user),
    githubLogin: u ? u.githubLogin : undefined,
    displayName: u ? u.displayName : undefined,
    avatarUrl: u ? (u.avatarUrl || null) : undefined,
    studentId: u ? (u.studentId || null) : undefined,
    status: r.status.toUpperCase(),
    submittedAt: r.submittedAt,
    decidedAt: r.decidedAt || null,
    decidedBy: decider ? (decider.displayName || decider.githubLogin || String(decider._id)) : (r.decidedBy ? String(r.decidedBy) : null),
    reapplyAfter: r.reapplyAfter || null,
    note: r.note || "",
  };
}

export function serializeUser(u) {
  if (!u) return null;
  return {
    id: String(u._id),
    githubLogin: u.githubLogin,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl || (u.githubUserId ? `https://avatars.githubusercontent.com/u/${u.githubUserId}?v=4` : null),
    role: u.role,
    accessState: String(u.accountStatus).toUpperCase(),
    studentId: u.studentId || null,
    folder: u.folder || null,
  };
}

/** Guard for student self-service: suspended accounts stay locked out. */
export function assertNotSuspended(user) {
  if (user.accountStatus === "suspended") {
    throw forbidden("ACCESS_NOT_APPROVED", "This account has been suspended");
  }
}
