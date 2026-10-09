import { Router } from "express";
import { AccessRequest } from "../models.js";
import { asyncHandler, forbidden } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { rateLimit, userOrIpKey } from "../middleware/rateLimit.js";
import { accessRequestCreateSchema, accessRequestListSchema } from "./schemas.js";
import { pageEnvelope, pagination } from "../lib/http.js";
import {
  submitAccessRequest, decideAccessRequest, getOwnRequest, serializeRequest, assertNotSuspended,
} from "../services/approvals.js";

function createLimiter() {
  return (req, res, next) => {
    const p = req.app.get("config").rateLimit.accessRequest;
    return rateLimit({ prefix: "rl:access", windowMs: p.windowMs, max: p.max, key: userOrIpKey })(req, res, next);
  };
}

/** Student self-service: create + inspect own request. */
export function accessRequestRoutes() {
  const router = Router();
  router.use(requireAuth);

  router.post("/", createLimiter(), validateBody(accessRequestCreateSchema), asyncHandler(async (req, res, next) => {
    if (req.user.role !== "student") {
      return next(forbidden("FORBIDDEN", "Only student accounts request program access"));
    }
    assertNotSuspended(req.user);
    if (req.user.accountStatus === "approved") {
      return next(forbidden("FORBIDDEN", "This account is already approved"));
    }
    const created = await submitAccessRequest(req.user, { note: req.body.note });
    res.status(201).json({ data: serializeRequest(created) });
  }));

  router.get("/me", asyncHandler(async (req, res) => {
    const latest = await getOwnRequest(req.user);
    res.json({ data: serializeRequest(latest) });
  }));

  return router;
}

/** Admin moderation queue. */
export function adminAccessRequestRoutes() {
  const router = Router();

  router.get("/", validateQuery(accessRequestListSchema), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = req.query.status ? { status: req.query.status } : {};
    const total = await AccessRequest.countDocuments(filter);
    const docs = await AccessRequest.find(filter)
      .populate("user", "githubLogin displayName studentId")
      .populate("decidedBy", "githubLogin displayName")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(pageEnvelope({
      items: docs.map(serializeRequest),
      total, page, limit,
    }));
  }));

  async function decide(req, res, decision) {
    const doc = await decideAccessRequest({
      requestId: req.params.id,
      adminUser: req.user,
      decision,
      folderRoot: req.app.get("config").repo.folderRoot,
    });
    res.json({ data: serializeRequest(doc) });
  }

  router.post("/:id/approve", asyncHandler(async (req, res) => decide(req, res, "approve")));
  router.post("/:id/reject", asyncHandler(async (req, res) => decide(req, res, "reject")));

  return router;
}

