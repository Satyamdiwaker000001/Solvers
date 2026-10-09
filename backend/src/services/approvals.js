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

/**
 * Decide a pending request atomically: only a document still in `pending`
 * transitions, so repeated/stale decisions 404 instead of corrupting state.
 * Approving a first-time student allocates the stable internal ID + folder.
 */
export async function decideAccessRequest({ requestId, adminUser, decision, folderRoot }) {
  if (!["approve", "reject"].includes(decision)) {
    throw new AppError(400, "VALIDATION_ERROR", "Decision must be 'approve' or 'reject'");
  }
  if (typeof requestId !== "string" || !/^[0-9a-fA-F]{24}$/.test(requestId)) {
    throw notFound("Access request not found");
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
      if (!student.studentId) {
        const { studentId, folder } = await nextStudentId(folderRoot);
        student.studentId = studentId;
        student.folder = folder;
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
