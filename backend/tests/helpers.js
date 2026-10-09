import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { loadConfig } from "../src/config.js";
import { connectDb } from "../src/db.js";
import { createApp } from "../src/app.js";

/**
 * Boots the full app against an isolated in-memory MongoDB.
 * Pass { mongod } to share one database across boots (restart simulation).
 */
export async function bootApp(envOverrides = {}, { mongod: shared = null } = {}) {
  const mongod = shared || await MongoMemoryServer.create();
  const cfg = loadConfig({
    NODE_ENV: "test",
    PORT: "0",
    MONGODB_URI: mongod.getUri("dsa_test"),
    SESSION_SECRET: "test-session-secret-that-is-long-enough",
    CLIENT_ORIGIN: "http://localhost:5173",
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    GITHUB_CALLBACK_URL: "http://localhost:5000/api/v1/auth/github/callback",
    ADMIN_GITHUB_IDS: "101,102",
    // Generous defaults so functional suites don't trip rate limits by
    // sharing one IP/DB; ratelimit.test.js overrides these down explicitly.
    RL_GENERAL_MAX: "10000",
    RL_AUTH_MAX: "1000",
    RL_ACCESS_MAX: "1000",
    RL_ADMIN_MAX: "1000",
    RL_WEBHOOK_MAX: "10000",
    ...envOverrides,
  });
  const github = {
    exchangeCode: async () => { throw new Error("github.exchangeCode not stubbed for this test"); },
    fetchProfile: async () => { throw new Error("github.fetchProfile not stubbed for this test"); },
    fetchCommit: async () => ({ additions: 1, deletions: 0, files: [] }),
  };
  if (mongoose.connection.readyState === 0) {
    await connectDb(cfg.mongoUri);
  }
  const app = createApp(cfg, { githubClient: github });
  return {
    app, cfg, github, mongod,
    cleanup: async () => {
      try { await app.get("sessionStore").close(); } catch { /* already closed */ }
      if (!shared) {
        await mongoose.disconnect();
        await mongod.stop();
      }
    },
  };
}

export function agent(app) {
  return request.agent(app);
}

/** Drive the real OAuth handshake with a stubbed GitHub backend. */
export async function oauthLogin(agentReq, github, profile) {
  const start = await agentReq.get("/api/v1/auth/github/start").expect(200);
  const state = new URL(start.body.data.authorizeUrl).searchParams.get("state");
  github.exchangeCode = async () => "test-access-token";
  github.fetchProfile = async () => profile;
  await agentReq.get("/api/v1/auth/github/callback").query({ code: "test-code", state }).expect(302);
  const csrf = await agentReq.get("/api/v1/auth/csrf").expect(200);
  return csrf.body.data.csrfToken;
}

export const studentProfile = (id, login) => ({
  githubUserId: String(id),
  githubLogin: login,
  displayName: `Test ${login}`,
});

export async function loginStudent(t, github, id = 201, login = "student-a") {
  const a = agent(t.app);
  const csrf = await oauthLogin(a, github, studentProfile(id, login));
  return { agent: a, csrf };
}

export async function loginAdmin(t, github, id = 101) {
  const a = agent(t.app);
  const csrf = await oauthLogin(a, github, studentProfile(id, `prof-${id}`));
  return { agent: a, csrf };
}

/** POST with CSRF header; asserts nothing about status (caller checks). */
export function post(a, csrf, url, body = {}) {
  let r = a.post(url).set("x-csrf-token", csrf);
  if (body !== undefined) r = r.send(body);
  return r;
}

export function patch(a, csrf, url, body = {}) {
  return a.patch(url).set("x-csrf-token", csrf).send(body);
}
