import { User } from "../models.js";
import { unauthorized, forbidden } from "./errors.js";

/**
 * Session carries only { userId }. Role/status are re-read from MongoDB on
 * every request so approval changes and admin revocation take effect
 * immediately, and client-supplied roles can never escalate privilege.
 */
export async function loadSessionUser(req, _res, next) {
  req.user = null;
  try {
    let userId = req.session && req.session.userId;
    if (!userId && req.headers["x-session-id"]) {
      const store = req.app.get("sessionStore");
      const sid = String(req.headers["x-session-id"]).trim();
      if (store && sid) {
        const sess = await new Promise((resolve) => store.get(sid, (_err, s) => resolve(s)));
        if (sess?.userId) userId = sess.userId;
      }
    }
    if (!userId) return next();
    const user = await User.findById(userId).lean();
    if (!user) {
      // Account removed server-side: drop the stale session silently.
      await new Promise((resolve) => req.session.destroy(() => resolve()));
      return next();
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  return next();
}

/** Approved students only. Pending/rejected/suspended get explicit 403 codes. */
export function requireApprovedStudent(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "student") return next(forbidden("FORBIDDEN", "Student access only"));
  if (req.user.accountStatus === "approved") return next();
  if (req.user.accountStatus === "pending") {
    return next(forbidden("ACCESS_PENDING", "Program access is pending professor approval"));
  }
  return next(forbidden("ACCESS_NOT_APPROVED", "Program access is not approved for this account"));
}

/** Approved students or any admin (for shared surfaces like leaderboard). */
export function requireStudentOrAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role === "admin") return next();
  if (req.user.accountStatus === "approved") return next();
  if (req.user.accountStatus === "pending") {
    return next(forbidden("ACCESS_PENDING", "Program access is pending professor approval"));
  }
  return next(forbidden("ACCESS_NOT_APPROVED", "Program access is not approved for this account"));
}

/** Admin-only. Role comes from the DB record, which is set exclusively from
 * the ADMIN_GITHUB_IDS allowlist at OAuth time — never from client input. */
export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") {
    return next(forbidden("FORBIDDEN", "Professor-admin access only"));
  }
  return next();
}
