import crypto from "node:crypto";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import cors from "cors";
import { loadSessionUser, requireAdmin } from "./middleware/auth.js";
import { apiNotFound, errorHandler } from "./middleware/errors.js";
import { checkCsrfToken, ensureCsrfToken } from "./middleware/csrf.js";
import { rateLimit, ipKey } from "./middleware/rateLimit.js";
import { authRoutes, authRateLimiter } from "./routes/auth.js";
import { accessRequestRoutes, adminAccessRequestRoutes } from "./routes/accessRequests.js";
import { adminProblemRoutes } from "./routes/problems.js";
import { adminAssignmentRoutes, studentAssignmentRoutes } from "./routes/assignments.js";
import { adminOpsRoutes, studentReportRoutes } from "./routes/ops.js";
import { webhookRoutes } from "./routes/webhook.js";
import { dbState } from "./db.js";
import { createGithubClient } from "./lib/github.js";

/** Fields that must never appear in logs. */
const SECRET_KEYS = ["password", "secret", "token", "authorization", "cookie", "set-cookie", "client_secret", "access_token"];

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.includes(k.toLowerCase()) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

function requestLogger(req, res, next) {
  req.id = crypto.randomBytes(8).toString("hex");
  const start = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      reqId: req.id, method: req.method, path: req.originalUrl,
      status: res.statusCode, ms: Date.now() - start,
    }));
  });
  req.log = {
    error: (obj, msg) => console.error(JSON.stringify({ reqId: req.id, msg, ...redact(obj || {}) })),
  };
  next();
}

function corsOriginFn(allowlist) {
  return (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser / same-origin
    if (allowlist.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin ${origin}`));
  };
}

export function createApp(cfg, { githubClient = null } = {}) {
  const app = express();
  app.set("config", cfg);
  app.set("trust proxy", 1);
  app.set("csrfSecureCookies", cfg.isProd);
  app.set("github", githubClient || createGithubClient({
    oauthBase: cfg.github.oauthBase,
    apiBase: cfg.github.apiBase,
    clientId: cfg.github.clientId,
    clientSecret: cfg.github.clientSecret,
    callbackUrl: cfg.github.callbackUrl,
  }));

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    origin: corsOriginFn(cfg.clientOrigins),
    credentials: true,
    allowedHeaders: ["Content-Type", "x-session-id", "x-csrf-token", "Authorization"],
    exposedHeaders: ["x-session-id", "x-csrf-token"],
  }));
  app.use(requestLogger);

  // Webhook needs the RAW body for HMAC validation; mounted before express.json
  // (body-parser skips already-parsed requests downstream).
  app.use("/api/v1/integrations", express.raw({ type: "application/json", limit: cfg.jsonLimit }), webhookRoutes());

  // Apply the shared API limiter before JSON parsing and session/database work
  // so abusive traffic is rejected as early as possible.
  const general = cfg.rateLimit.general;
  app.use("/api/", rateLimit({ prefix: "rl:general", windowMs: general.windowMs, max: general.max, key: ipKey }));

  app.use(express.json({ limit: cfg.jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: cfg.jsonLimit }));

  const sessionStore = MongoStore.create({ mongoUrl: cfg.mongoUri, collectionName: "sessions", ttl: Math.floor(cfg.sessionMaxAgeMs / 1000) });
  app.set("sessionStore", sessionStore);

  function signSessionId(val, secret) {
    return `${val}.${crypto.createHmac("sha256", secret).update(val).digest("base64").replace(/=+$/, "")}`;
  }

  // Fallback for browsers (like Chrome) blocking 3rd-party cross-site cookies on onrender.com
  app.use((req, _res, next) => {
    const rawSid = req.headers["x-session-id"];
    if (rawSid) {
      const signed = `s:${signSessionId(String(rawSid).trim(), cfg.sessionSecret)}`;
      const cookies = (req.headers.cookie || "").split("; ").filter((c) => c && !c.startsWith("dsa.sid="));
      cookies.push(`dsa.sid=${encodeURIComponent(signed)}`);
      req.headers.cookie = cookies.join("; ");
    }
    next();
  });

  app.use(session({
    name: "dsa.sid",
    secret: cfg.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: cfg.isProd,
      sameSite: cfg.isProd ? "none" : "lax",
      partitioned: cfg.isProd,
      maxAge: cfg.sessionMaxAgeMs,
      path: "/",
    },
  }));

  app.use(loadSessionUser);
  app.use(ensureCsrfToken);

  const adminWrite = cfg.rateLimit.adminWrite;
  const adminWriteLimit = rateLimit({ prefix: "rl:admin", windowMs: adminWrite.windowMs, max: adminWrite.max, key: (req) => String(req.user?._id || req.ip) });

  // Mutations require a CSRF token (login & webhook use their own credentials).
  const mutating = (req, res, next) => {
    if (req.path === "/admin/login") return next();
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return checkCsrfToken(req, res, next);
    return next();
  };

  // Public / session bootstrap
  app.get("/", (_req, res) => res.json({ status: "online", service: "Solvers DSA Backend API", database: "connected", health: "/api/v1/health" }));
  app.get("/api/v1/health", (_req, res) => res.json({ data: { ok: true } }));
  app.get("/api/v1/ready", (_req, res) => {
    if (dbState() !== 1) return res.status(503).json({ error: { code: "NOT_READY", message: "Database not connected" } });
    return res.json({ data: { ok: true } });
  });
  app.use("/api/v1/auth", authRateLimiter(), mutating, authRoutes());
  app.use("/api/v1/access-requests", mutating, accessRequestRoutes());

  // Admin (mounted before the student catch-all at /api/v1 so the
  // student requireApprovedStudent guard never intercepts /admin/* paths).
  app.use("/api/v1/admin/access-requests", requireAdmin, adminWriteLimit, mutating, adminAccessRequestRoutes());
  app.use("/api/v1/admin/problems", requireAdmin, adminWriteLimit, mutating, adminProblemRoutes());
  app.use("/api/v1/admin/assignments", requireAdmin, adminWriteLimit, mutating, adminAssignmentRoutes());
  app.use("/api/v1/admin", requireAdmin, mutating, adminOpsRoutes());

  // Student
  app.use("/api/v1/assignments", mutating, studentAssignmentRoutes());
  app.use("/api/v1", mutating, studentReportRoutes()); // /progress/me, /leaderboard

  app.use("/api/", apiNotFound);
  app.use(errorHandler(cfg.isProd));
  return app;
}
