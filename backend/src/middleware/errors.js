/** Centralized error model → stable API error shape. */

export class AppError extends Error {
  constructor(status, code, message, details = undefined, retryAfterSec = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSec = retryAfterSec;
  }
}

export const badRequest = (message = "Invalid request", details) =>
  new AppError(400, "VALIDATION_ERROR", message, details);
export const unauthorized = (code = "AUTH_REQUIRED", message = "Authentication required") =>
  new AppError(401, code, message);
export const forbidden = (code = "FORBIDDEN", message = "Forbidden") =>
  new AppError(403, code, message);
export const notFound = (message = "Not found") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (code, message, details) =>
  new AppError(409, code, message, details);

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** 404 for unknown /api routes (non-API fallthrough is left to the caller). */
export function apiNotFound(req, res, next) {
  next(notFound(`No such endpoint: ${req.method} ${req.path}`));
}

/**
 * Final error handler. 5xx responses never leak stack traces or internals
 * in production; operational logging redacts secrets (see app.js logger).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(isProd) {
  return (err, req, res, _next) => {
    if (!err.status && /CORS blocked/.test(err.message || "")) {
      err = new AppError(403, "FORBIDDEN", "Origin not allowed");
    }
    const status = err.status && Number.isInteger(err.status) ? err.status : 500;
    const code = err.code || "INTERNAL_ERROR";
    if (status >= 500) {
      req.log?.error?.({ err: String(err && err.stack || err), reqId: req.id }, "unhandled error");
    }
    const body = { error: { code, message: status >= 500 && isProd ? "Unexpected server error" : (err.message || "Unexpected server error") } };
    if (err.details !== undefined && status < 500) body.error.details = err.details;
    if (err.retryAfterSec !== undefined) {
      body.error.retryAfter = err.retryAfterSec;
      res.setHeader("Retry-After", String(err.retryAfterSec));
    }
    res.status(status).json(body);
  };
}
