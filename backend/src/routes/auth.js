import crypto from "node:crypto";
import { Router } from "express";
import { User } from "../models.js";
import { asyncHandler, unauthorized, badRequest } from "../middleware/errors.js";
import { rateLimit, ipKey } from "../middleware/rateLimit.js";
import { ensureCsrfToken, rotateCsrfToken } from "../middleware/csrf.js";
import { serializeUser } from "../services/approvals.js";
import { nextStudentId } from "../lib/studentIds.js";
import { buildAuthorizeUrl } from "../lib/github.js";

const OAUTH_STATE_TTL_MS = 10 * 60_000;

export function authRateLimiter() {
  return (req, res, next) => {
    const cfg = req.app.get("config");
    const p = cfg.rateLimit.auth;
    return rateLimit({ prefix: "rl:auth", windowMs: p.windowMs, max: p.max, key: ipKey })(req, res, next);
  };
}

function clientOrigin(req) {
  const origins = req.app.get("config").clientOrigins;
  return origins[0];
}

/**
 * Resolve a GitHub identity to an internal user. Role is derived ONLY from
 * the ADMIN_GITHUB_IDS allowlist; existing admins removed from the allowlist
 * are demoted (revocation). Students approved earlier keep their status and
 * stable studentId.
 */
async function resolveUser(cfg, profile) {
  const isAdmin = cfg.adminGithubIds.includes(profile.githubUserId);
  let user = await User.findOne({ githubUserId: profile.githubUserId });
  if (!user) {
    user = new User({
      githubUserId: profile.githubUserId,
      githubLogin: profile.githubLogin,
      displayName: profile.displayName || profile.githubLogin,
      role: isAdmin ? "admin" : "student",
      accountStatus: isAdmin ? "approved" : "pending",
    });
    if (isAdmin) {
      const { studentId, folder } = await nextStudentId(cfg.repo.folderRoot);
      user.studentId = studentId;
      user.folder = folder;
    }
    await user.save();
    return user;
  }
  let changed = false;
  if (user.githubLogin !== profile.githubLogin) { user.githubLogin = profile.githubLogin; changed = true; }
  if (!user.displayName && profile.displayName) { user.displayName = profile.displayName; changed = true; }
  if (isAdmin && user.role !== "admin") {
    user.role = "admin";
    if (user.accountStatus !== "suspended") user.accountStatus = "approved";
    if (!user.studentId) {
      const { studentId, folder } = await nextStudentId(cfg.repo.folderRoot);
      user.studentId = studentId;
      user.folder = folder;
    }
    changed = true;
  }
  if (!isAdmin && user.role === "admin") {
    // Removed from the allowlist: revoke admin, fall back to student flow.
    user.role = "student";
    if (user.accountStatus === "approved" && !user.studentId) {
      const { studentId, folder } = await nextStudentId(cfg.repo.folderRoot);
      user.studentId = studentId;
      user.folder = folder;
    }
    changed = true;
  }
  if (changed) await user.save();
  return user;
}

export function authRoutes() {
  const router = Router();

  router.get("/github/start", asyncHandler(async (req, res) => {
    const cfg = req.app.get("config");
    const state = crypto.randomBytes(24).toString("hex");
    req.session.oauthState = { state, createdAt: Date.now() };
    const url = buildAuthorizeUrl({
      oauthBase: cfg.github.oauthBase,
      clientId: cfg.github.clientId,
      callbackUrl: cfg.github.callbackUrl,
      scope: cfg.github.scope,
      state,
    });
    res.json({ data: { authorizeUrl: url } });
  }));

  // Browser callback: validates state, exchanges code server-side, establishes
  // a session, then redirects to the SPA finish page (which calls GET /me).
  router.get("/github/callback", asyncHandler(async (req, res, next) => {
    const cfg = req.app.get("config");
    const { code, state, error } = req.query;
    const finish = (params) => res.redirect(`${clientOrigin(req)}/auth/finish${params}`);
    if (error) {
      return finish(`?error=${encodeURIComponent("OAuth provider refused authorization")}`);
    }
    const saved = req.session.oauthState;
    delete req.session.oauthState;
    if (!saved || !state || saved.state !== state) {
      return next(badRequest("Invalid OAuth state — please restart sign-in"));
    }
    if (Date.now() - saved.createdAt > OAUTH_STATE_TTL_MS) {
      return next(badRequest("OAuth state expired — please restart sign-in"));
    }
    if (!code || typeof code !== "string") {
      return next(badRequest("Missing OAuth authorization code"));
    }
    try {
      const github = req.app.get("github");
      const token = await github.exchangeCode(code);
      const profile = await github.fetchProfile(token);
      const user = await resolveUser(cfg, profile);
      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });
      req.session.userId = String(user._id);
      rotateCsrfToken(req);
      return finish(`?status=${user.accountStatus}&role=${user.role}`);
    } catch (err) {
      return next(badRequest(`GitHub sign-in failed: ${err.message}`));
    }
  }));

  router.post("/logout", asyncHandler(async (req, res) => {
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie("dsa.sid", { path: "/" });
    res.clearCookie("csrf-token", { path: "/" });
    res.json({ data: { ok: true } });
  }));

  router.get("/me", asyncHandler(async (req, res, next) => {
    if (!req.user) return next(unauthorized());
    res.json({ data: { user: serializeUser(req.user) } });
  }));

  router.get("/csrf", ensureCsrfToken, (req, res) => {
    res.json({ data: { csrfToken: req.session.csrfToken } });
  });

  return router;
}
