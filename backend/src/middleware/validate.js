import { badRequest } from "./errors.js";

/** Validate req.body against a Zod schema; 400 VALIDATION_ERROR with details. */
export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      next(badRequest("Request body failed validation", details));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

/** Validate req.query against a Zod schema (coercion-friendly). */
export function validateQuery(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(badRequest("Query parameters failed validation",
        parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
      return;
    }
    req.query = parsed.data;
    next();
  };
}
