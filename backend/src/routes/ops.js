import { Router } from "express";
import { AuditLog, ProgressEvent, Submission, User, WebhookEvent } from "../models.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errors.js";
import { requireApprovedStudent } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { paginationSchema, reviewSchema } from "./schemas.js";
import { pageEnvelope, pagination, isValidObjectId } from "../lib/http.js";
import { recordAudit } from "../middleware/audit.js";
import { computeLeaderboard } from "../services/leaderboard.js";
import { serializeUser } from "../services/approvals.js";

/** Admin: students, per-student progress, review queue + decisions, audit, integration. */
export function adminOpsRoutes() {
  const router = Router();

  router.get("/students", validateQuery(paginationSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { role: "student" };
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
    const student = await User.findOne({ _id: req.params.id, role: "student" }).lean();
    if (!student) throw notFound("Student not found");
    const submissions = await Submission.find({ student: student._id })
      .populate("assignment", "title type")
      .sort({ firstObservedAt: -1 })
      .lean();
    const events = await ProgressEvent.find({ student: student._id }).sort({ occurredAt: -1 }).limit(200).lean();
    res.json({ data: { student: serializeUser(student), submissions, progressEvents: events } });
  }));

  router.get("/submissions/review-queue", validateQuery(paginationSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { outcome: { $in: ["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"] } };
    const total = await Submission.countDocuments(filter);
    const docs = await Submission.find(filter)
      .populate("student", "displayName githubLogin studentId")
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
      sub.outcome = "VERIFIED";
      sub.eventType = "NEW_PROBLEM_VERIFIED";
      await ProgressEvent.updateOne(
        { sourceKey: `submission:${sub._id}` },
        { $setOnInsert: { student: sub.student, eventType: "NEW_PROBLEM_VERIFIED", occurredAt: new Date(), meta: { assignmentId: String(sub.assignment) } } },
        { upsert: true },
      );
    } else {
      sub.outcome = "INCOMPLETE";
      sub.eventType = "NO_QUALIFYING_CHANGE";
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
    const last = await WebhookEvent.findOne({}).sort({ receivedAt: -1 }).lean();
    const configured = Boolean(cfg.repo.fullName && cfg.webhookSecret);
    res.json({
      data: {
        repo: { fullName: cfg.repo.fullName, branch: cfg.repo.branch, folderRoot: cfg.repo.folderRoot },
        status: !configured ? "NOT_CONFIGURED" : pending > 20 ? "DEGRADED" : "HEALTHY",
        pendingEvents: pending,
        lastReceivedAt: last ? last.receivedAt : null,
        // Analysis workers are deferred (see docs/limitations): PENDING means
        // "received, not yet analyzed" — never reported as verified.
        note: "Webhook intake only; verification workers are not yet implemented.",
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
      submissions.filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED").map((s) => String(s.assignment)),
    ).size;
    res.json({ data: { student: serializeUser(req.user), verified, submissions } });
  }));

  router.get("/leaderboard", requireApprovedStudent, asyncHandler(async (req, res) => {
    res.json({ data: await computeLeaderboard(req.app.get("config")) });
  }));

  return router;
}
