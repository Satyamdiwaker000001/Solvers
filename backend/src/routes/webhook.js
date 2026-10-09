import crypto from "node:crypto";
import { Router } from "express";
import { WebhookEvent } from "../models.js";
import { AppError, asyncHandler, badRequest } from "../middleware/errors.js";
import { concurrencyLimit, rateLimit, ipKey } from "../middleware/rateLimit.js";

function signaturesMatch(secret, payload, header) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * GitHub webhook intake (Phase 2 scope: receive → validate → dedupe → store
 * as PENDING, 202). Verification workers are deferred; PENDING is surfaced
 * as "analysis pending", never as verified success.
 */
export function webhookRoutes() {
  const router = Router();

  router.post(
    "/github/webhook",
    (req, res, next) => {
      const p = req.app.get("config").rateLimit.webhook;
      return rateLimit({ prefix: "rl:webhook", windowMs: p.windowMs, max: p.max, key: ipKey })(req, res, next);
    },
    (req, res, next) => {
      const c = req.app.get("config").concurrency;
      return concurrencyLimit({ key: "webhook:intake", max: c.webhookMax, ttlMs: c.webhookSlotTtlMs })(req, res, next);
    },
    asyncHandler(async (req, res, next) => {
      const cfg = req.app.get("config");
      if (!cfg.webhookSecret || !cfg.repo.fullName) {
        return next(new AppError(503, "GITHUB_INTEGRATION_UNAVAILABLE", "GitHub integration is not configured on this server"));
      }
      const raw = req.body;
      if (!Buffer.isBuffer(raw)) {
        return next(badRequest("Expected a raw JSON webhook payload"));
      }
      if (!signaturesMatch(cfg.webhookSecret, raw, req.get("x-hub-signature-256"))) {
        return next(new AppError(401, "FORBIDDEN", "Invalid webhook signature"));
      }
      const deliveryId = req.get("x-github-delivery");
      if (!deliveryId) return next(badRequest("Missing X-GitHub-Delivery header"));
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        return next(badRequest("Malformed JSON payload"));
      }
      const repo = payload?.repository?.full_name || "";
      if (repo && repo !== cfg.repo.fullName) {
        return next(badRequest("Event is not for the configured repository"));
      }
      try {
        await WebhookEvent.create({
          deliveryId,
          event: req.get("x-github-event") || "",
          repo: repo || cfg.repo.fullName,
          status: "PENDING",
        });
      } catch (err) {
        if (err && err.code === 11000) {
          // Duplicate delivery (GitHub retries): idempotent no-op.
          return res.status(202).json({ data: { accepted: true, duplicate: true } });
        }
        throw err;
      }
      return res.status(202).json({ data: { accepted: true, status: "PENDING" } });
    }),
  );

  return router;
}
