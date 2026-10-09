import { RateBucket, Slot } from "../models.js";
import { AppError } from "./errors.js";

/**
 * MongoDB-backed fixed-window rate limiter. Counters live in the shared
 * database (with TTL cleanup), so limits hold across multiple app instances —
 * unlike in-process counters (FR-RATE-05).
 */
export function rateLimit({ prefix, windowMs, max, key = (req) => req.ip }) {
  if (!prefix || !windowMs || !max) throw new Error("rateLimit requires prefix, windowMs, max");
  return async (req, _res, next) => {
    try {
      const now = Date.now();
      const windowStart = now - (now % windowMs);
      const bucketId = `${prefix}:${key(req)}:${windowStart}`;
      const expiresAt = new Date(windowStart + windowMs + 60_000);
      const bucket = await RateBucket.findOneAndUpdate(
        { _id: bucketId },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true },
      ).lean();
      if (bucket.count > max) {
        const retryAfterSec = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
        return next(new AppError(429, "RATE_LIMITED", "Rate limit exceeded", undefined, retryAfterSec));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export const ipKey = (req) => String(req.ip || "unknown");
export const userOrIpKey = (req) => String((req.user && req.user._id) || req.ip || "unknown");

/**
 * Distributed concurrency guard via short-lived Mongo leases. Returns 429
 * when all slots are taken; stale slots (crashed workers) self-heal through
 * the TTL window. Always use try/finally to release.
 */
export async function acquireSlot(slotKey, max, ttlMs) {
  const now = new Date();
  const freshAfter = new Date(now.getTime() - ttlMs);
  // Reset a stale counter before attempting acquisition.
  await Slot.updateOne(
    { _id: slotKey, updatedAt: { $lt: freshAfter } },
    { $set: { count: 0, updatedAt: now } },
  );
  const doc = await Slot.findOneAndUpdate(
    { _id: slotKey, count: { $lt: max } },
    { $inc: { count: 1 }, $set: { updatedAt: now } },
    { upsert: false, new: true },
  ).lean();
  if (!doc) {
    // First-ever acquisition: create the counter, then retry once.
    try {
      await Slot.create({ _id: slotKey, count: 0, updatedAt: now });
    } catch {
      // Lost the create race; fall through to one acquisition attempt.
    }
    const retry = await Slot.findOneAndUpdate(
      { _id: slotKey, count: { $lt: max } },
      { $inc: { count: 1 }, $set: { updatedAt: now } },
      { new: true },
    ).lean();
    return retry !== null;
  }
  return true;
}

export async function releaseSlot(slotKey) {
  await Slot.updateOne({ _id: slotKey, count: { $gt: 0 } }, { $inc: { count: -1 }, $set: { updatedAt: new Date() } });
}

/**
 * Express middleware wrapper around the slot guard (429 when saturated).
 * The lease is released when the response finishes so intake slots do not
 * leak across requests; stale slots still self-heal via the TTL window.
 */
export function concurrencyLimit({ key, max, ttlMs }) {
  return async (_req, res, next) => {
    try {
      const ok = await acquireSlot(key, max, ttlMs);
      if (!ok) {
        return next(new AppError(429, "RATE_LIMITED", "Server is busy processing similar work; please retry shortly", undefined, 5));
      }
      res.on("finish", () => {
        releaseSlot(key).catch(() => {});
      });
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
