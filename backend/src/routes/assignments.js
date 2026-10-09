import { Router } from "express";
import { Assignment } from "../models.js";
import { asyncHandler, notFound } from "../middleware/errors.js";
import { requireApprovedStudent, requireAdmin } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { assignmentCreateSchema, assignmentPatchSchema, paginationSchema } from "./schemas.js";
import { pageEnvelope, pagination, isValidObjectId } from "../lib/http.js";
import { recordAudit } from "../middleware/audit.js";
import {
  createAssignment, listAssignmentsForUser, getAssignmentForUser, listAssignmentsForAdmin,
} from "../services/assignments.js";

/** Student view: only entitled assignments, other targets hidden. */
export function studentAssignmentRoutes() {
  const router = Router();

  router.get("/", requireApprovedStudent, asyncHandler(async (req, res) => {
    res.json({ data: await listAssignmentsForUser(req.user) });
  }));

  router.get("/:id", requireApprovedStudent, asyncHandler(async (req, res) => {
    res.json({ data: await getAssignmentForUser(req.user, req.params.id) });
  }));

  return router;
}

/** Admin: create (COMMON fan-out / INDIVIDUAL selection) + full listing + edit/archive. */
export function adminAssignmentRoutes() {
  const router = Router();
  router.use(requireAdmin);

  router.get("/", validateQuery(paginationSchema), asyncHandler(async (req, res) => {
    const { page, limit } = pagination(req.query);
    const { docs, total } = await listAssignmentsForAdmin({ page, limit });
    res.json(pageEnvelope({ items: docs, total, page, limit }));
  }));

  router.post("/", validateBody(assignmentCreateSchema), asyncHandler(async (req, res) => {
    const doc = await createAssignment({
      adminUser: req.user,
      problemId: req.body.problemId,
      type: req.body.type,
      title: req.body.title,
      dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null,
      instructions: req.body.instructions,
      dailyMinimum: req.body.dailyMinimum,
      studentIds: req.body.studentIds,
    });
    res.status(201).json({ data: doc && serializeCreated(doc) });
  }));

  router.patch("/:id", validateBody(assignmentPatchSchema), asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Assignment not found");
    const doc = await Assignment.findById(req.params.id);
    if (!doc) throw notFound("Assignment not found");

    if (req.body.title !== undefined) doc.title = req.body.title;
    if (req.body.instructions !== undefined) doc.instructions = req.body.instructions;
    if (req.body.dueAt !== undefined) doc.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
    if (req.body.status !== undefined) doc.status = req.body.status;
    if (req.body.dailyMinimum !== undefined) doc.dailyMinimum = req.body.dailyMinimum;

    await doc.save();
    await recordAudit({
      actorId: req.user._id,
      action: "ASSIGNMENT_UPDATE",
      targetType: "assignment",
      targetId: doc._id,
      detail: `Updated assignment: ${doc.title || doc._id} (status=${doc.status})`,
    });
    res.json({ data: serializeCreated(doc) });
  }));

  router.post("/:id/archive", asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Assignment not found");
    const doc = await Assignment.findByIdAndUpdate(req.params.id, { status: "archived" }, { new: true });
    if (!doc) throw notFound("Assignment not found");
    await recordAudit({
      actorId: req.user._id,
      action: "ASSIGNMENT_ARCHIVE",
      targetType: "assignment",
      targetId: doc._id,
      detail: `Archived assignment ${doc.title || doc._id}`,
    });
    res.json({ data: serializeCreated(doc) });
  }));

  return router;
}

function serializeCreated(doc) {
  return {
    id: String(doc._id),
    problemId: String(doc.problem),
    type: doc.type,
    title: doc.title || "",
    dueAt: doc.dueAt || null,
    instructions: doc.instructions || "",
    dailyMinimum: doc.dailyMinimum || 0,
    status: doc.status,
    targetCount: (doc.targets || []).length,
    targets: (doc.targets || []).map((t) => ({
      studentId: String(t.student),
      completionStatus: t.completionStatus,
    })),
    createdAt: doc.createdAt,
  };
}
