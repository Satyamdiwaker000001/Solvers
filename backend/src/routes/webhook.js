import crypto from "node:crypto";
import { Router } from "express";
import { User, WebhookEvent } from "../models.js";
import { AppError, asyncHandler, badRequest } from "../middleware/errors.js";
import { concurrencyLimit, rateLimit, ipKey } from "../middleware/rateLimit.js";
import { triggerWebhookWorker } from "../services/evidence.js";

function signaturesMatch(secret, payload, header) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * GitHub webhook intake: receive → validate → dedupe → store
 * as PENDING with validated payload → trigger asynchronous worker.
 * Returns 202 only after durable persistence. Never claims processed or verified here.
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
      if (!deliveryId || typeof deliveryId !== "string" || !deliveryId.trim()) {
        return next(badRequest("Missing X-GitHub-Delivery header"));
      }
      const event = req.get("x-github-event");
      if (!event || typeof event !== "string" || !event.trim()) {
        return next(badRequest("Missing X-GitHub-Event header"));
      }
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        return next(badRequest("Malformed JSON payload"));
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return next(badRequest("Malformed JSON payload"));
      }
      const repo = payload?.repository?.full_name || "";
      if (!repo || repo !== cfg.repo.fullName) {
        return next(badRequest("Event is not for the configured repository"));
      }
      try {
        const githubUserId = String(payload?.pull_request?.user?.id || payload?.sender?.id || "");
        const student = githubUserId ? await User.findOne({ githubUserId, role: "student" }).select("_id").lean() : null;
        await WebhookEvent.create({
          deliveryId: deliveryId.trim(),
          event: event.trim(),
          repo,
          pullRequestId: payload?.pull_request?.id ? String(payload.pull_request.id) : "",
          pullRequestNumber: Number.isInteger(payload?.pull_request?.number) ? payload.pull_request.number : null,
          pullRequestAction: event.trim() === "pull_request" ? String(payload?.action || "") : "",
          pullRequestUrl: typeof payload?.pull_request?.html_url === "string" ? payload.pull_request.html_url.slice(0, 2000) : "",
          student: student?._id || null,
          payload,
          status: "PENDING",
        });
      } catch (err) {
        if (err && err.code === 11000) {
          // Duplicate delivery (GitHub retries): idempotent no-op.
          return res.status(202).json({ data: { accepted: true, duplicate: true } });
        }
        throw err;
      }
      // Pulse worker asynchronously — does not block the webhook HTTP acknowledgement.
      triggerWebhookWorker(req.app);

      return res.status(202).json({ data: { accepted: true, status: "PENDING" } });
    }),
  );

  return router;
}
