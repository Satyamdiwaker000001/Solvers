import { Router } from "express";
import { AccessRequest, Assignment, AuditLog, ProgressEvent, Submission, TrackingPolicy, User, WebhookEvent } from "../models.js";
import { asyncHandler, badRequest, notFound, conflict } from "../middleware/errors.js";
import { requireApprovedStudent } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import {
  paginationSchema,
  reviewSchema,
  studentFolderUpdateSchema,
  submissionAssignStudentSchema,
  submissionAssignAssignmentSchema,
  trackingPolicySchema,
} from "./schemas.js";
import { pageEnvelope, pagination, isValidObjectId } from "../lib/http.js";
import { recordAudit } from "../middleware/audit.js";
import { computeLeaderboard } from "../services/leaderboard.js";
import { serializeUser, validateStudentFolder } from "../services/approvals.js";
import { buildProgressReport } from "../services/reports.js";

/** Admin: students, per-student progress, review queue + decisions, audit, integration. */
export function adminOpsRoutes() {
  const router = Router();

  router.get("/tracking-policy", asyncHandler(async (_req, res) => {
    const policy = await TrackingPolicy.findOne({ key: "default" }).lean();
    res.json({ data: { dailyMinimum: policy?.dailyMinimum ?? 1, updatedAt: policy?.updatedAt || null } });
  }));

  router.patch("/tracking-policy", validateBody(trackingPolicySchema), asyncHandler(async (req, res) => {
    const policy = await TrackingPolicy.findOneAndUpdate(
      { key: "default" },
      { $set: { dailyMinimum: req.body.dailyMinimum, updatedBy: req.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    await recordAudit({ actorId: req.user._id, action: "TRACKING_POLICY_UPDATE", targetType: "tracking_policy", targetId: "default", detail: `Daily minimum: ${policy.dailyMinimum}` });
    res.json({ data: { dailyMinimum: policy.dailyMinimum, updatedAt: policy.updatedAt } });
  }));

  router.get("/overview", asyncHandler(async (_req, res) => {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [pendingRequests, needsReview, totalStudents, activeAssignments, verifiedWeek, overdueRows, activity] = await Promise.all([
      AccessRequest.countDocuments({ status: "pending" }),
      Submission.countDocuments({ outcome: { $in: ["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"] } }),
      User.countDocuments({ role: "student", accountStatus: "approved" }),
      Assignment.countDocuments({ status: "active" }),
      ProgressEvent.countDocuments({ occurredAt: { $gte: weekStart }, eventType: "NEW_PROBLEM_VERIFIED" }),
      Assignment.aggregate([
        { $match: { status: "active", dueAt: { $lt: now } } },
        { $unwind: "$targets" },
        { $match: { "targets.completionStatus": { $ne: "verified" } } },
        { $count: "total" },
      ]),
      ProgressEvent.aggregate([
        { $match: { occurredAt: { $gte: weekStart }, eventType: "NEW_PROBLEM_VERIFIED" } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } }, verified: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      data: {
        pendingRequests,
        needsReview,
        verifiedWeek,
        totalStudents,
        activeAssignments,
        overdueAssignments: overdueRows[0]?.total || 0,
        activitySeries: activity.map((row) => ({ day: row._id, verified: row.verified, progress: 0, review: 0 })),
        integration: { status: "UNKNOWN", message: "GitHub integration status is available from the integration panel." },
      },
    });
  }));

  router.get("/students", validateQuery(paginationSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    // The admin student directory contains enrolled users only. Pending and
    // rejected OAuth identities remain available through access-request
    // history, but are not treated as registered students.
    const filter = { role: "student", accountStatus: "approved" };
    const total = await User.countDocuments(filter);
    const docs = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const ids = docs.map((d) => d._id);
    const verifiedAgg = await Submission.aggregate([
      { $match: { student: { $in: ids }, eventType: "NEW_PROBLEM_VERIFIED" } },
      { $group: { _id: { student: "$student", assignment: "$assignment" } } },
      { $group: { _id: "$_id.student", verified: { $sum: 1 } } },
    ]);
    const evidenceAgg = await Submission.aggregate([
      { $match: { student: { $in: ids } } },
      { $group: { _id: "$student", evidence: { $sum: 1 } } },
    ]);
    const flagsAgg = await Submission.aggregate([
      { $match: { student: { $in: ids }, outcome: { $in: ["NEEDS_REVIEW", "CHECK_FAILED"] } } },
      { $group: { _id: "$student", flags: { $sum: 1 } } },
    ]);
    const byId = (rows, key) => new Map(rows.map((r) => [String(r._id), r[key]]));
    const verified = byId(verifiedAgg, "verified");
    const evidence = byId(evidenceAgg, "evidence");
    const flags = byId(flagsAgg, "flags");
    res.json(pageEnvelope({
      items: docs.map((d) => ({
        ...serializeUser(d),
        verified: verified.get(String(d._id)) || 0,
        evidence: evidence.get(String(d._id)) || 0,
        flags: flags.get(String(d._id)) || 0,
      })),
      total, page, limit,
    }));
  }));

  router.get("/students/:id/progress", asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Student not found");
    const student = await User.findOne({ _id: req.params.id, role: "student", accountStatus: "approved" }).lean();
    if (!student) throw notFound("Student not found");
    const submissions = await Submission.find({ student: student._id })
      .populate("assignment", "title type")
      .sort({ firstObservedAt: -1 })
      .lean();
    const events = await ProgressEvent.find({ student: student._id }).sort({ occurredAt: -1 }).limit(200).lean();
    const report = await buildProgressReport({ studentId: student._id, period: req.query.period || "all" });
    res.json({ data: { student: serializeUser(student), submissions, progressEvents: events, report } });
  }));

  router.get("/submissions/review-queue", validateQuery(paginationSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { outcome: { $in: ["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"] } };
    const total = await Submission.countDocuments(filter);
    const docs = await Submission.find(filter)
      .populate("student", "displayName githubLogin studentId avatarUrl")
      .populate("assignment", "title type")
      .sort({ firstObservedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(pageEnvelope({ items: docs, total, page, limit }));
  }));

  router.post("/submissions/:id/reviews", validateBody(reviewSchema), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Submission not found");
    const sub = await Submission.findById(req.params.id);
    if (!sub) throw notFound("Submission not found");
    if (!["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"].includes(sub.outcome)) {
      throw badRequest(`Submission is already ${sub.outcome}; only queued items can be reviewed`);
    }
    const { decision, comment } = req.body;
    if (decision === "accept") {
      if (!sub.student) {
        throw badRequest("Cannot accept submission with unresolved student identity; assign a student first", "UNRESOLVED_STUDENT");
      }
      if (sub.note && sub.note.includes("ambiguous assignment match")) {
        throw badRequest("Cannot accept submission with ambiguous assignment matches; link an assignment first", "AMBIGUOUS_ASSIGNMENT");
      }
      sub.outcome = "VERIFIED";
      sub.eventType = "NEW_PROBLEM_VERIFIED";
      sub.reviewedBy = req.user._id;
      sub.reviewedAt = new Date();
      sub.reviewComment = String(comment || "").slice(0, 1000);

      await ProgressEvent.updateOne(
        { sourceKey: `submission:${sub._id}` },
        {
          $setOnInsert: {
            student: sub.student,
            eventType: "NEW_PROBLEM_VERIFIED",
            occurredAt: new Date(),
            meta: { assignmentId: sub.assignment ? String(sub.assignment) : null },
          },
        },
        { upsert: true },
      );

      if (sub.assignment) {
        await Assignment.updateOne(
          { _id: sub.assignment, "targets.student": sub.student },
          { $set: { "targets.$.completionStatus": "verified" } },
        ).catch(() => {});
      }
    } else {
      sub.outcome = "INCOMPLETE";
      sub.eventType = "NO_QUALIFYING_CHANGE";
      sub.reviewedBy = req.user._id;
      sub.reviewedAt = new Date();
      sub.reviewComment = String(comment || "").slice(0, 1000);

      await ProgressEvent.deleteOne({ sourceKey: `submission:${sub._id}` });

      if (sub.assignment && sub.student) {
        await Assignment.updateOne(
          { _id: sub.assignment, "targets.student": sub.student },
          { $set: { "targets.$.completionStatus": "in_progress" } },
        ).catch(() => {});
      }
    }
    await sub.save();
    await recordAudit({
      actorId: req.user._id,
      action: "REVIEW_DECISION",
      targetType: "submission",
      targetId: sub._id,
      detail: `${decision}: ${(comment || "no comment").slice(0, 500)}`,
    });
    res.json({ data: { id: String(sub._id), outcome: sub.outcome } });
  }));

  router.patch("/students/:id/folder", validateBody(studentFolderUpdateSchema), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Student not found");
    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) throw notFound("Student not found");

    const cfg = req.app.get("config");
    const check = validateStudentFolder(req.body.folder, cfg.repo.folderRoot);
    if (!check.valid) {
      throw badRequest(check.error);
    }
    const targetFolder = check.folder;

    const existing = await User.findOne({
      folder: new RegExp(`^${targetFolder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      _id: { $ne: student._id },
    }).lean();
    if (existing) {
      throw conflict("FOLDER_ALREADY_CLAIMED", `Folder '${targetFolder}' is already claimed by student ${existing.studentId || existing._id}`);
    }

    student.folder = targetFolder;
    await student.save();

    await recordAudit({
      actorId: req.user._id,
      action: "STUDENT_FOLDER_UPDATE",
      targetType: "user",
      targetId: student._id,
      detail: `Assigned folder: ${targetFolder}`,
    });

    res.json({ data: serializeUser(student) });
  }));

  router.patch("/submissions/:id/assign-student", validateBody(submissionAssignStudentSchema), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Submission not found");
    const sub = await Submission.findById(req.params.id);
    if (!sub) throw notFound("Submission not found");

    const student = await User.findOne({ _id: req.body.studentId, role: "student", accountStatus: "approved" });
    if (!student) throw notFound("Approved student not found");

    if (sub.assignment) {
      const existing = await Submission.findOne({
        student: student._id,
        assignment: sub.assignment,
        commitSha: sub.commitSha,
        _id: { $ne: sub._id },
      });
      if (existing) {
        throw conflict("SUBMISSION_COLLISION", "A submission for this student, assignment, and commit already exists");
      }
    }

    sub.student = student._id;
    sub.note = `${sub.note || ""}; resolved_identity=assigned-by-admin to student ${student.studentId || student._id}`.slice(0, 1000);
    await sub.save();

    await recordAudit({
      actorId: req.user._id,
      action: "SUBMISSION_ASSIGN_STUDENT",
      targetType: "submission",
      targetId: sub._id,
      detail: `Assigned to student ${student.studentId || student._id} (${student.githubLogin})`,
    });

    res.json({ data: { id: String(sub._id), studentId: String(student._id), outcome: sub.outcome } });
  }));

  router.patch("/submissions/:id/assign-assignment", validateBody(submissionAssignAssignmentSchema), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Submission not found");
    const sub = await Submission.findById(req.params.id);
    if (!sub) throw notFound("Submission not found");

    const assignment = await Assignment.findById(req.body.assignmentId).populate("problem");
    if (!assignment) throw notFound("Assignment not found");
    if (assignment.status !== "active") {
      throw badRequest("Cannot link an inactive or archived assignment");
    }

    if (sub.student) {
      if (assignment.type === "INDIVIDUAL") {
        const isTargeted = Array.isArray(assignment.targets) && assignment.targets.some((t) => String(t.student) === String(sub.student));
        if (!isTargeted) {
          throw badRequest("Assignment does not target this student");
        }
      }
      const existing = await Submission.findOne({
        student: sub.student,
        assignment: assignment._id,
        commitSha: sub.commitSha,
        _id: { $ne: sub._id },
      });
      if (existing) {
        throw conflict("SUBMISSION_COLLISION", "A submission for this student, assignment, and commit already exists");
      }
    }

    sub.assignment = assignment._id;
    let cleanNote = (sub.note || "").replace(/ambiguous assignment match: candidates \[[^\]]*\];?\s*/gi, "").trim();
    if (cleanNote.startsWith(";")) cleanNote = cleanNote.replace(/^;\s*/, "");
    sub.note = `${cleanNote ? cleanNote + "; " : ""}resolved_assignment=assigned by admin to assignment ${assignment._id}`.slice(0, 1000);
    await sub.save();

    if (sub.student) {
      await Assignment.updateOne(
        { _id: assignment._id, "targets.student": sub.student, "targets.completionStatus": { $in: ["not_started", "in_progress"] } },
        { $set: { "targets.$.completionStatus": "needs_review" } },
      ).catch(() => {});
    }

    await recordAudit({
      actorId: req.user._id,
      action: "SUBMISSION_ASSIGN_ASSIGNMENT",
      targetType: "submission",
      targetId: sub._id,
      detail: `Assigned to assignment ${assignment._id} (${assignment.title || assignment.problem?.title})`,
    });

    res.json({ data: { id: String(sub._id), assignmentId: String(assignment._id), outcome: sub.outcome } });
  }));

  router.get("/audit-log", validateQuery(paginationSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const total = await AuditLog.countDocuments({});
    const docs = await AuditLog.find({})
      .populate("actor", "displayName githubLogin role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(pageEnvelope({ items: docs, total, page, limit }));
  }));

  router.get("/github/integration-status", asyncHandler(async (req, res) => {
    const cfg = req.app.get("config");
    const pending = await WebhookEvent.countDocuments({ status: "PENDING" });
    const processing = await WebhookEvent.countDocuments({ status: "PROCESSING" });
    const processed = await WebhookEvent.countDocuments({ status: "PROCESSED" });
    const failed = await WebhookEvent.countDocuments({ status: "FAILED" });
    const retryable = await WebhookEvent.countDocuments({ status: "FAILED", retryable: true });
    const terminallyFailed = await WebhookEvent.countDocuments({ status: "FAILED", retryable: false });
    const last = await WebhookEvent.findOne({}).sort({ receivedAt: -1 }).lean();
    const configured = Boolean(cfg.repo.fullName && cfg.webhookSecret);
    res.json({
      data: {
        repo: { fullName: cfg.repo.fullName, branch: cfg.repo.branch, folderRoot: cfg.repo.folderRoot },
        status: !configured ? "NOT_CONFIGURED" : (pending + processing) > 20 ? "DEGRADED" : "HEALTHY",
        pendingEvents: pending,
        processingEvents: processing,
        processedEvents: processed,
        failedEvents: failed,
        retryableEvents: retryable,
        terminallyFailedEvents: terminallyFailed,
        lastReceivedAt: last ? last.receivedAt : null,
        note: "Webhook intake with idempotent evidence worker (services/evidence.js); PENDING is analysis-pending, never verified.",
      },
    });
  }));

  router.get("/leaderboard", asyncHandler(async (req, res) => {
    res.json({ data: await computeLeaderboard(req.app.get("config")) });
  }));

  return router;
}

/** Student: own report + shared leaderboard. */
export function studentReportRoutes() {
  const router = Router();

  router.get("/progress/me", requireApprovedStudent, asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ student: req.user._id })
      .populate("assignment", "title type")
      .sort({ firstObservedAt: -1 })
      .lean();
    const verified = new Set(
      submissions
        .filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED" && s.assignment)
        .map((s) => String(s.assignment._id || s.assignment)),
    ).size;
    const report = await buildProgressReport({ studentId: req.user._id, period: req.query.period || "all" });
    res.json({ data: { student: serializeUser(req.user), verified, submissions, report } });
  }));

  router.get("/leaderboard", requireApprovedStudent, asyncHandler(async (req, res) => {
    res.json({ data: await computeLeaderboard(req.app.get("config")) });
  }));

  return router;
}
