import crypto from "node:crypto";
import { Router } from "express";
import { AdminCredential, User } from "../models.js";
import { asyncHandler, unauthorized, badRequest } from "../middleware/errors.js";
import { rateLimit, ipKey } from "../middleware/rateLimit.js";
import { ensureCsrfToken, rotateCsrfToken } from "../middleware/csrf.js";
import { serializeUser, submitAccessRequest } from "../services/approvals.js";
import { nextStudentId } from "../lib/studentIds.js";
import { buildAuthorizeUrl } from "../lib/github.js";
import { verifyPassword } from "../lib/passwords.js";
import { validateBody } from "../middleware/validate.js";
import { adminLoginSchema } from "./schemas.js";

const OAUTH_STATE_TTL_MS = 10 * 60_000;

function generateSignedState(secret) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const ts = Date.now().toString(36);
  const data = `${nonce}.${ts}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifySignedState(state, secret) {
  if (!state || typeof state !== "string") return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const data = `${nonce}.${ts}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (sig.length !== expectedSig.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return false;
  const createdTime = parseInt(ts, 36);
  if (isNaN(createdTime) || Date.now() - createdTime > OAUTH_STATE_TTL_MS) return false;
  return true;
}

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
 * stable studentId. GitHub login renames update githubLogin without changing
 * the internal canonical identity.
 */
async function resolveUser(cfg, profile) {
  if (!profile || profile.githubUserId === undefined || profile.githubUserId === null) {
    throw new Error("GitHub profile is missing numeric user id");
  }
  const numericId = String(profile.githubUserId).trim();
  if (!/^\d+$/.test(numericId)) {
    throw new Error("Invalid GitHub numeric user id");
  }
  const githubLogin = String(profile.githubLogin || "").trim();
  if (!githubLogin) {
    throw new Error("GitHub profile is missing login");
  }

  const isAdmin = cfg.adminGithubIds.includes(numericId);
  let user = await User.findOne({ githubUserId: numericId });
  if (!user) {
    user = new User({
      githubUserId: numericId,
      githubLogin,
      displayName: String(profile.displayName || githubLogin).trim(),
      avatarUrl: profile.avatarUrl || "",
      role: isAdmin ? "admin" : "student",
      accountStatus: isAdmin ? "approved" : "pending",
    });
    if (isAdmin) {
      const { studentId, folder } = await nextStudentId(cfg.repo.folderRoot);
      user.studentId = studentId;
      user.folder = folder;
    }
    await user.save();
    if (!isAdmin) {
      try {
        await submitAccessRequest(user, { note: "First-time sign-in access request" });
      } catch {
        // Ignored if already pending or locked
      }
    }
    return user;
  }
  let changed = false;
  if (user.githubLogin !== githubLogin) {
    user.githubLogin = githubLogin;
    changed = true;
  }
  const newDisplayName = String(profile.displayName || "").trim();
  if (newDisplayName && user.displayName !== newDisplayName) {
    user.displayName = newDisplayName;
    changed = true;
  }
  const newAvatarUrl = String(profile.avatarUrl || "").trim();
  if (user.avatarUrl !== newAvatarUrl) {
    user.avatarUrl = newAvatarUrl;
    changed = true;
  }
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
  if (!isAdmin && user.role === "student" && user.accountStatus === "pending") {
    try {
      await submitAccessRequest(user, { note: "Student sign-in access request" });
    } catch {
      // Ignored if already pending or locked
    }
  }
  return user;
}

export function authRoutes() {
  const router = Router();

  router.get("/github/start", asyncHandler(async (req, res) => {
    const cfg = req.app.get("config");
    const state = generateSignedState(cfg.sessionSecret);
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
    const saved = req.session?.oauthState;
    delete req.session?.oauthState;
    const isValidSigned = verifySignedState(state, cfg.sessionSecret);
    const isValidSession = saved && saved.state === state && (Date.now() - saved.createdAt <= OAUTH_STATE_TTL_MS);

    if (!isValidSigned && !isValidSession) {
      return next(badRequest("Invalid OAuth state — please restart sign-in"));
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
      await new Promise((resolve) => req.session.save(() => resolve()));
      // Return sid in query params as cross-domain fallback so Chrome/Safari never lose authentication
      return finish(`?status=${user.accountStatus}&role=${user.role}&sid=${req.sessionID}`);
    } catch (err) {
      return next(badRequest(`GitHub sign-in failed: ${err.message}`));
    }
  }));

  router.post("/admin/login", validateBody(adminLoginSchema), asyncHandler(async (req, res, next) => {
    const cfg = req.app.get("config");
    const { username, password } = req.body;
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const credential = await AdminCredential.findOne({ username: cleanUser, active: true }).select("+passwordHash");
    const passMatch = credential ? verifyPassword(cleanPass, credential.passwordHash) : false;

    const numericAdminId = cfg.adminGithubIds[0];
    let adminUser = await User.findOne({ githubUserId: numericAdminId });

    if (!credential || !passMatch) {
      return next(unauthorized("Invalid administrator credentials"));
    }

    if (!adminUser) {
      const { studentId, folder } = await nextStudentId(cfg.repo.folderRoot);
      adminUser = new User({
        githubUserId: numericAdminId,
        githubLogin: "professor-admin",
        displayName: "Professor Admin",
        role: "admin",
        accountStatus: "approved",
        studentId,
        folder,
      });
      await adminUser.save();
    } else if (adminUser.role !== "admin") {
      adminUser.role = "admin";
      adminUser.accountStatus = "approved";
      await adminUser.save();
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.userId = String(adminUser._id);
    credential.lastLoginAt = new Date();
    await credential.save();
    rotateCsrfToken(req);
    res.json({ data: { user: serializeUser(adminUser), sessionId: req.sessionID } });
  }));

  router.post("/logout", asyncHandler(async (req, res) => {
    const isProd = req.app.get("config").isProd;
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    const cookieOpts = { path: "/", secure: isProd, sameSite: isProd ? "none" : "lax" };
    res.clearCookie("dsa.sid", cookieOpts);
    res.clearCookie("csrf-token", cookieOpts);
    res.json({ data: { ok: true } });
  }));

  router.get("/me", asyncHandler(async (req, res, next) => {
    if (!req.user) return next(unauthorized());
    res.json({ data: { user: serializeUser(req.user) } });
  }));

  router.patch("/me", asyncHandler(async (req, res, next) => {
    if (!req.user) return next(unauthorized());
    const { avatarUrl, displayName } = req.body || {};
    const updates = {};
    if (typeof avatarUrl === "string") updates.avatarUrl = avatarUrl.trim();
    if (typeof displayName === "string" && displayName.trim()) updates.displayName = displayName.trim();
    
    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ data: { user: serializeUser(updated) } });
  }));

  router.get("/csrf", ensureCsrfToken, (req, res) => {
    res.json({ data: { csrfToken: req.session.csrfToken } });
  });

  return router;
}
