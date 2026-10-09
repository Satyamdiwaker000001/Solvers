import crypto from "node:crypto";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { acquireSlot, releaseSlot } from "../src/middleware/rateLimit.js";
import { bootApp, agent, loginAdmin } from "./helpers.js";

function sign(secret, body) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("rate limiting, concurrency, webhook intake", () => {
  let t;
  before(async () => {
    t = await bootApp({
      RL_GENERAL_MAX: "1000",
      RL_AUTH_MAX: "3",
      RL_ADMIN_MAX: "3",
      RL_WEBHOOK_MAX: "1000",
      GITHUB_WEBHOOK_SECRET: "wh-secret",
      CENTRAL_REPO_FULL_NAME: "college-org/dsa-practice",
    });
  });
  after(async () => { await t.cleanup(); });

  it("general limiter returns 429 with Retry-After and a stable code", async () => {
    // Tighten only for this scenario via a dedicated boot.
    const t2 = await bootApp({ RL_GENERAL_MAX: "2", RL_AUTH_MAX: "1000" }, { mongod: t.mongod });
    try {
      const a = agent(t2.app);
      await a.get("/api/v1/health").expect(200);
      await a.get("/api/v1/health").expect(200);
      await a.get("/api/v1/health").expect(429)
        .expect((res) => {
          assert.equal(res.body.error.code, "RATE_LIMITED");
          assert.ok(Number(res.headers["retry-after"]) >= 1);
        });
    } finally {
      await t2.cleanup();
    }
  });

  it("sensitive endpoints have their own stricter policy", async () => {
    // Same client IP and shared counters: reset the auth budget so this
    // test gets exactly 3 starts, then restore a clean slate for later tests.
    const { RateBucket } = await import("../src/models.js");
    await RateBucket.deleteMany({});
    try {
      const a = agent(t.app);
      for (let i = 0; i < 3; i++) await a.get("/api/v1/auth/github/start").expect(200);
      await a.get("/api/v1/auth/github/start").expect(429)
        .expect((res) => assert.equal(res.body.error.code, "RATE_LIMITED"));
    } finally {
      await RateBucket.deleteMany({});
    }
  });

  it("admin write policy is separate from the general policy", async () => {
    const admin = await loginAdmin(t, t.github, 101);
    const payload = { title: "Rate Prob", statement: "A sufficiently long statement for validation to pass here." };
    const postProblem = () => admin.agent.post("/api/v1/admin/problems")
      .set("x-csrf-token", admin.csrf)
      .send(payload);
    // Same admin user: exhaust the 3 allowed writes, the 4th is throttled.
    await postProblem().expect(201);
    await postProblem().expect(201);
    await postProblem().expect(201);
    await postProblem().expect(429)
      .expect((res) => assert.equal(res.body.error.code, "RATE_LIMITED"));
  });

  it("webhook rejects bad signatures, dedupes deliveries, enforces slots", async () => {
    const body = JSON.stringify({ repository: { full_name: "college-org/dsa-practice" }, ref: "refs/heads/main" });
    const base = agent(t.app).post("/api/v1/integrations/github/webhook")
      .set("Content-Type", "application/json")
      .set("x-github-event", "push");

    await base.set("x-hub-signature-256", "sha256=bad").set("x-github-delivery", "d1").send(body).expect(401);

    const good = { "x-hub-signature-256": sign("wh-secret", body), "x-github-delivery": "d2" };
    let r = agent(t.app).post("/api/v1/integrations/github/webhook").set("Content-Type", "application/json").set("x-github-event", "push");
    for (const [k, v] of Object.entries(good)) r = r.set(k, v);
    await r.send(body).expect(202).expect((res) => assert.equal(res.body.data.accepted, true));

    // Duplicate delivery (GitHub retry): idempotent, no double intake.
    let r2 = agent(t.app).post("/api/v1/integrations/github/webhook").set("Content-Type", "application/json").set("x-github-event", "push");
    for (const [k, v] of Object.entries(good)) r2 = r2.set(k, v);
    await r2.send(body).expect(202).expect((res) => assert.equal(res.body.data.duplicate, true));

    // Saturated intake slots: 429, then recovery after release.
    for (let i = 0; i < 5; i++) assert.equal(await acquireSlot("webhook:intake", 5, 60_000), true);
    let r3 = agent(t.app).post("/api/v1/integrations/github/webhook").set("Content-Type", "application/json").set("x-github-event", "push")
      .set("x-hub-signature-256", sign("wh-secret", body)).set("x-github-delivery", "d3");
    await r3.send(body).expect(429);
    await releaseSlot("webhook:intake");
  });

  it("unconfigured integration fails closed with 503", async () => {
    const t2 = await bootApp({ RL_GENERAL_MAX: "1000" }, { mongod: t.mongod });
    try {
      await agent(t2.app).post("/api/v1/integrations/github/webhook")
        .set("Content-Type", "application/json").send("{}").expect(503)
        .expect((res) => assert.equal(res.body.error.code, "GITHUB_INTEGRATION_UNAVAILABLE"));
    } finally {
      await t2.cleanup();
    }
  });
});
