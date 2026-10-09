import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { bootApp, agent, oauthLogin, studentProfile } from "./helpers.js";

describe("authentication and authorization", () => {
  let t;
  before(async () => { t = await bootApp(); });
  after(async () => { await t.cleanup(); });

  it("OAuth start returns a GitHub authorize URL carrying state", async () => {
    const a = agent(t.app);
    const res = await a.get("/api/v1/auth/github/start").expect(200);
    const url = new URL(res.body.data.authorizeUrl);
    assert.ok(url.hostname.includes("github.com"));
    assert.equal(url.searchParams.get("client_id"), "test-client-id");
    assert.ok(url.searchParams.get("state"));
  });

  it("callback rejects a forged/unknown state", async () => {
    const a = agent(t.app);
    await a.get("/api/v1/auth/github/start").expect(200);
    await a.get("/api/v1/auth/github/callback")
      .query({ code: "x", state: "forged-state" })
      .expect(400)
      .expect((res) => assert.match(res.body.error.code, /VALIDATION_ERROR/));
  });

  it("callback rejects a missing code", async () => {
    const a = agent(t.app);
    const start = await a.get("/api/v1/auth/github/start").expect(200);
    const state = new URL(start.body.data.authorizeUrl).searchParams.get("state");
    await a.get("/api/v1/auth/github/callback").query({ state }).expect(400);
  });

  it("callback surfaces GitHub exchange failures as 400, not 500", async () => {
    const a = agent(t.app);
    const start = await a.get("/api/v1/auth/github/start").expect(200);
    const state = new URL(start.body.data.authorizeUrl).searchParams.get("state");
    t.github.exchangeCode = async () => { throw new Error("bad_verification_code"); };
    await a.get("/api/v1/auth/github/callback").query({ code: "bad", state }).expect(400);
  });

  it("first GitHub login creates a pending student; repeat login reuses it", async () => {
    const a = agent(t.app);
    await oauthLogin(a, t.github, studentProfile(301, "first-timer"));
    const me = await a.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.githubLogin, "first-timer");
    assert.equal(me.body.data.user.role, "student");
    assert.equal(me.body.data.user.accessState, "PENDING");

    const b = agent(t.app);
    await oauthLogin(b, t.github, studentProfile(301, "first-timer-renamed"));
    const me2 = await b.get("/api/v1/auth/me").expect(200);
    assert.equal(me2.body.data.user.id, me.body.data.user.id, "same GitHub numeric ID => same user");
    assert.equal(me2.body.data.user.githubLogin, "first-timer-renamed", "login follows GitHub");
  });

  it("allowlisted GitHub IDs become the two admins; others never do", async () => {
    const a = agent(t.app);
    await oauthLogin(a, t.github, studentProfile(101, "prof-rao"));
    const me = await a.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.role, "admin");
    assert.equal(me.body.data.user.accessState, "APPROVED");

    const s = agent(t.app);
    await oauthLogin(s, t.github, studentProfile(999, "not-a-prof"));
    const meS = await s.get("/api/v1/auth/me").expect(200);
    assert.equal(meS.body.data.user.role, "student");
  });

  it("admin role is revoked when the ID leaves the allowlist", async () => {
    // Same database, stricter allowlist: 101 is no longer authorized.
    const t2 = await bootApp({ ADMIN_GITHUB_IDS: "102,103" }, { mongod: t.mongod });
    const a = agent(t2.app);
    await oauthLogin(a, t2.github, studentProfile(101, "prof-rao"));
    const me = await a.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.role, "student", "demoted after allowlist removal");
    await t2.cleanup();
  });

  it("unauthenticated /me is 401; students cannot reach admin routes", async () => {
    const anon = agent(t.app);
    await anon.get("/api/v1/auth/me").expect(401)
      .expect((res) => assert.equal(res.body.error.code, "AUTH_REQUIRED"));

    const s = agent(t.app);
    await oauthLogin(s, t.github, studentProfile(302, "plain-student"));
    await s.get("/api/v1/admin/problems").expect(403)
      .expect((res) => assert.equal(res.body.error.code, "FORBIDDEN"));
    await s.post("/api/v1/admin/problems").send({}).expect(403);
  });

  it("logout invalidates the session", async () => {
    const a = agent(t.app);
    const csrf = await oauthLogin(a, t.github, studentProfile(303, "leaver"));
    await a.get("/api/v1/auth/me").expect(200);
    await a.post("/api/v1/auth/logout").set("x-csrf-token", csrf).expect(200);
    await a.get("/api/v1/auth/me").expect(401);
  });

  it("mutations without a CSRF token are rejected", async () => {
    const a = agent(t.app);
    await oauthLogin(a, t.github, studentProfile(304, "no-csrf"));
    await a.post("/api/v1/access-requests").send({ note: "hi" }).expect(403);
  });
});
