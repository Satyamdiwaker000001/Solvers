/**
 * Environment-based configuration with fail-fast startup validation.
 * Every secret / integration knob comes from the environment; nothing is
 * hard-coded. Call loadConfig() once at boot (and in tests with overrides).
 */

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalInt(value, fallback, name, { min = 1 } = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`Invalid ${name}: expected integer >= ${min}, got ${JSON.stringify(value)}`);
  }
  return n;
}

function parseAdminIds(value) {
  const raw = requiredString(value, "ADMIN_GITHUB_IDS");
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length !== 2) {
    throw new Error(
      `ADMIN_GITHUB_IDS must contain exactly two GitHub numeric user IDs (locked: two professor-admins), got ${ids.length}`,
    );
  }
  for (const id of ids) {
    if (!/^\d+$/.test(id)) throw new Error(`ADMIN_GITHUB_IDS contains non-numeric ID: ${JSON.stringify(id)}`);
  }
  if (ids[0] === ids[1]) throw new Error("ADMIN_GITHUB_IDS must contain two distinct IDs");
  return ids;
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProd = nodeEnv === "production";

  const sessionSecret = isProd
    ? requiredString(env.SESSION_SECRET, "SESSION_SECRET")
    : (env.SESSION_SECRET || "dev-only-insecure-secret").trim();
  if (!isProd && !env.SESSION_SECRET) {
    console.warn("[config] SESSION_SECRET not set — using an insecure dev default. Never use this in production.");
  }

  const origins = (env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",").map((s) => s.trim()).filter(Boolean);

  return {
    nodeEnv,
    isProd,
    port: optionalInt(env.PORT, 5000, "PORT", { min: 0 }),
    mongoUri: requiredString(env.MONGODB_URI, "MONGODB_URI"),
    sessionSecret,
    sessionMaxAgeMs: optionalInt(env.SESSION_MAX_AGE_MS, 12 * 3_600_000, "SESSION_MAX_AGE_MS"),
    clientOrigins: origins,
    trustProxy: optionalInt(env.TRUST_PROXY, isProd ? 1 : 0, "TRUST_PROXY", { min: 0 }),
    jsonLimit: env.JSON_LIMIT || "256kb",

    github: {
      clientId: requiredString(env.GITHUB_CLIENT_ID, "GITHUB_CLIENT_ID"),
      clientSecret: requiredString(env.GITHUB_CLIENT_SECRET, "GITHUB_CLIENT_SECRET"),
      callbackUrl: requiredString(env.GITHUB_CALLBACK_URL, "GITHUB_CALLBACK_URL"),
      scope: env.GITHUB_SCOPE || "read:user",
      apiBase: (env.GITHUB_API_BASE || "https://api.github.com").replace(/\/$/, ""),
      oauthBase: (env.GITHUB_OAUTH_BASE || "https://github.com").replace(/\/$/, ""),
    },
    adminGithubIds: parseAdminIds(env.ADMIN_GITHUB_IDS),

    repo: {
      fullName: env.CENTRAL_REPO_FULL_NAME || "",
      branch: env.CENTRAL_REPO_BRANCH || "main",
      folderRoot: env.CENTRAL_REPO_FOLDER_ROOT || "students/",
    },
    webhookSecret: env.GITHUB_WEBHOOK_SECRET || "",

    rateLimit: {
      general: { windowMs: optionalInt(env.RL_GENERAL_WINDOW_MS, 60_000, "RL_GENERAL_WINDOW_MS"), max: optionalInt(env.RL_GENERAL_MAX, 600, "RL_GENERAL_MAX") },
      auth: { windowMs: optionalInt(env.RL_AUTH_WINDOW_MS, 15 * 60_000, "RL_AUTH_WINDOW_MS"), max: optionalInt(env.RL_AUTH_MAX, 30, "RL_AUTH_MAX") },
      accessRequest: { windowMs: optionalInt(env.RL_ACCESS_WINDOW_MS, 3_600_000, "RL_ACCESS_WINDOW_MS"), max: optionalInt(env.RL_ACCESS_MAX, 10, "RL_ACCESS_MAX") },
      adminWrite: { windowMs: optionalInt(env.RL_ADMIN_WINDOW_MS, 60_000, "RL_ADMIN_WINDOW_MS"), max: optionalInt(env.RL_ADMIN_MAX, 120, "RL_ADMIN_MAX") },
      webhook: { windowMs: optionalInt(env.RL_WEBHOOK_WINDOW_MS, 60_000, "RL_WEBHOOK_WINDOW_MS"), max: optionalInt(env.RL_WEBHOOK_MAX, 120, "RL_WEBHOOK_MAX") },
      // NOTE: numeric defaults are operational placeholders (docs defer exact
      // thresholds until load/hosting is known). All are env-configurable.
    },
    concurrency: {
      webhookMax: optionalInt(env.CONC_WEBHOOK_MAX, 5, "CONC_WEBHOOK_MAX"),
      webhookSlotTtlMs: optionalInt(env.CONC_WEBHOOK_SLOT_TTL_MS, 60_000, "CONC_WEBHOOK_SLOT_TTL_MS"),
    },
    leaderboard: {
      verifiedWeight: Number(env.LB_VERIFIED_WEIGHT ?? 10),
      activeDayWeight: Number(env.LB_ACTIVE_DAY_WEIGHT ?? 2),
      windowDays: optionalInt(env.LB_WINDOW_DAYS, 7, "LB_WINDOW_DAYS"),
      timezone: env.REPORT_TIMEZONE || "UTC",
      // Formula pending professor sign-off (FR-LB-04); defaults are documented
      // in the leaderboard response itself.
    },
  };
}

export function leaderboardFormulaText(cfg) {
  const lb = cfg.leaderboard;
  return (
    `Score = ${lb.verifiedWeight} × distinct verified problems + ` +
    `${lb.activeDayWeight} × active days (${lb.windowDays}-day window, ${lb.timezone}). ` +
    `Tie-break: more verified → earlier first verification. ` +
    `Pending-review and failed checks are excluded until resolved.`
  );
}
