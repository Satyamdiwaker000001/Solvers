import { Router } from "express";
import { Problem } from "../models.js";
import { asyncHandler, badRequest, notFound } from "../middleware/errors.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { problemCreateSchema, problemPatchSchema, problemListSchema } from "./schemas.js";
import { isValidObjectId, pageEnvelope, pagination } from "../lib/http.js";
import { recordAudit } from "../middleware/audit.js";
import { nextProblemCode } from "../lib/problemIds.js";

function serializeProblem(p) {
  return {
    id: String(p._id),
    problemCode: p.problemCode || null,
    title: p.title,
    statement: p.statement,
    topic: p.topic || "",
    difficulty: p.difficulty,
    examples: p.examples || [],
    constraints: p.constraints || [],
    sourceUrl: p.sourceUrl || "",
    status: p.status.toUpperCase(),
    createdBy: p.createdBy ? String(p.createdBy) : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Admin problem catalog: create / edit / publish / archive / list. */
export function adminProblemRoutes() {
  const router = Router();

  router.get("/", validateQuery(problemListSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = req.query.status ? { status: req.query.status } : {};
    const total = await Problem.countDocuments(filter);
    const docs = await Problem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    res.json(pageEnvelope({ items: docs.map(serializeProblem), total, page, limit }));
  }));

  router.post("/", validateBody(problemCreateSchema), asyncHandler(async (req, res) => {
    const doc = await Problem.create({ ...req.body, problemCode: await nextProblemCode(), createdBy: req.user._id });
    await recordAudit({ actorId: req.user._id, action: "PROBLEM_CREATE", targetType: "problem", targetId: doc._id, detail: doc.title });
    res.status(201).json({ data: serializeProblem(doc.toObject()) });
  }));

  router.patch("/:id", validateBody(problemPatchSchema), asyncHandler(async (req, res) => {
    // Editing a published problem with submissions is intentionally a plain
    // content update; history rewrites are out of scope (open decision FR-PS-06).
    if (!isValidObjectId(req.params.id)) throw notFound("Problem not found");
    const doc = await Problem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doc) throw notFound("Problem not found");
    await recordAudit({ actorId: req.user._id, action: "PROBLEM_UPDATE", targetType: "problem", targetId: doc._id, detail: doc.title });
    res.json({ data: serializeProblem(doc.toObject()) });
  }));

  async function setStatus(req, res, status, action) {
    if (!isValidObjectId(req.params.id)) throw notFound("Problem not found");
    const doc = await Problem.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!doc) throw notFound("Problem not found");
    await recordAudit({ actorId: req.user._id, action, targetType: "problem", targetId: doc._id, detail: `${doc.title} → ${status}` });
    res.json({ data: serializeProblem(doc.toObject()) });
  }

  router.post("/:id/publish", asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) throw notFound("Problem not found");
    const doc = await Problem.findById(req.params.id);
    if (!doc) throw notFound("Problem not found");
    if (!doc.title || !doc.statement) throw badRequest("Title and statement are required before publishing");
    return setStatus(req, res, "published", "PROBLEM_PUBLISH");
  }));

  router.post("/:id/archive", asyncHandler(async (req, res) => setStatus(req, res, "archived", "PROBLEM_ARCHIVE")));

  return router;
}
