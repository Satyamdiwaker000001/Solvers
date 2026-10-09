import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import helmet from "helmet";
import { errorHandler } from "../src/middleware/errors.js";
import { bootApp, loginStudent, loginAdmin, post, agent } from "./helpers.js";

describe("security controls and error handling", () => {
  let t;
  let admin;
  before(async () => {
    t = await bootApp({ RL_GENERAL_MAX: "1000" });
    admin = await loginAdmin(t, t.github, 101);
  });
  after(async () => { await t.cleanup(); });

  it("secure headers are present (helmet)", async () => {
    await agent(t.app).get("/api/v1/health").expect(200)
      .expect((res) => {
        assert.equal(res.headers["x-content-type-options"], "nosniff");
        assert.ok(res.headers["x-frame-options"] || res.headers["content-security-policy"], "framing protection present");
      });
    assert.ok(helmet, "helmet is wired (import guard)");
  });

  it("unlisted origins are rejected, not served", async () => {
    await agent(t.app).get("/api/v1/health").set("Origin", "https://evil.example").expect(403)
      .expect((res) => assert.equal(res.body.error.code, "FORBIDDEN"));
  });

  it("invalid payloads yield 400 with field details, never success", async () => {
    await post(admin.agent, admin.csrf, "/api/v1/admin/problems", {
      title: "x", statement: "short",
    }).expect(400).expect((res) => {
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
      assert.ok(Array.isArray(res.body.error.details));
    });
    // Unknown problem id and malformed id are 404, not 500.
    await admin.agent.get("/api/v1/admin/students/000000000000000000000000/progress").expect(404);
    await admin.agent.get("/api/v1/admin/students/not-an-id/progress").expect(404);
    await admin.agent.get("/api/v1/no-such-route").expect(404)
      .expect((res) => assert.equal(res.body.error.code, "NOT_FOUND"));
  });

  it("suspended accounts cannot use protected routes", async () => {
    const s = await loginStudent(t, t.github, 701, "suspended-case");
    const { User } = await import("../src/models.js");
    await User.updateOne({ githubUserId: "701" }, { $set: { accountStatus: "suspended" } });
    await s.agent.get("/api/v1/assignments").expect(403)
      .expect((res) => assert.equal(res.body.error.code, "ACCESS_NOT_APPROVED"));
  });

  it("production errors hide internals (no stack traces)", async () => {
    const handler = errorHandler(true);
    let status;
    let body;
    const res = {
      status: (s) => { status = s; return res; },
      setHeader: () => {},
      json: (b) => { body = b; },
    };
    handler(new Error("db password=hunter2 exploded"), { log: {} }, res, () => {});
    assert.equal(status, 500);
    assert.equal(body.error.message, "Unexpected server error");
    assert.ok(!JSON.stringify(body).includes("hunter2"));
    assert.ok(!JSON.stringify(body).includes("exploded"));
  });

  it("all error responses share the {error:{code,message}} shape", async () => {
    const s = await loginStudent(t, t.github, 702, "shape-check");
    const r1 = await s.agent.get("/api/v1/auth/me").expect(200);
    assert.ok(r1.body.data.user);
    const anon = agent(t.app);
    for (const r of [
      await anon.get("/api/v1/auth/me"),
      await anon.get("/api/v1/assignments"),
    ]) {
      assert.ok(r.body.error && typeof r.body.error.code === "string", "stable error shape");
    }
  });
});
