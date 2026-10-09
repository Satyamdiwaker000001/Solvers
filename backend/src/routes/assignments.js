import { Router } from "express";
import { asyncHandler } from "../middleware/errors.js";
import { requireApprovedStudent, requireAdmin } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { assignmentCreateSchema, paginationSchema } from "./schemas.js";
import { pageEnvelope, pagination } from "../lib/http.js";
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

/** Admin: create (COMMON fan-out / INDIVIDUAL selection) + full listing. */
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
      studentIds: req.body.studentIds,
    });
    res.status(201).json({ data: doc && serializeCreated(doc) });
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
    status: doc.status,
    targetCount: (doc.targets || []).length,
    targets: (doc.targets || []).map((t) => ({
      studentId: String(t.student),
      completionStatus: t.completionStatus,
    })),
    createdAt: doc.createdAt,
  };
}
