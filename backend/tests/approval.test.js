import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { AccessRequest } from "../src/models.js";
import { bootApp, loginStudent, loginAdmin, post } from "./helpers.js";

describe("approval workflow and 24-hour cooldown", () => {
  let t;
  let admin;
  before(async () => {
    t = await bootApp();
    admin = await loginAdmin(t, t.github, 101);
  });
  after(async () => { await t.cleanup(); });

  async function approveStudent(githubId, login) {
    const s = await loginStudent(t, t.github, githubId, login);
    await post(s.agent, s.csrf, "/api/v1/access-requests", { note: "please approve" }).expect(201);
    const reqs = await admin.agent.get("/api/v1/admin/access-requests?status=pending").expect(200);
    const target = reqs.body.data.find((r) => r.note === "please approve" && r.status === "PENDING");
    assert.ok(target, "new request visible in admin queue");
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${target.id}/approve`).expect(200);
    return s;
  }

  it("new students can request access; duplicates are rejected", async () => {
    const s = await loginStudent(t, t.github, 401, "applicant");
    const created = await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
    assert.equal(created.body.data.status, "PENDING");
    await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(409)
      .expect((res) => assert.equal(res.body.error.code, "IDEMPOTENCY_CONFLICT"));
    const mine = await s.agent.get("/api/v1/access-requests/me").expect(200);
    assert.equal(mine.body.data.id, created.body.data.id);
  });

  it("pending applicants cannot reach protected student routes", async () => {
    const s = await loginStudent(t, t.github, 402, "waiting");
    await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
    await s.agent.get("/api/v1/assignments").expect(403)
      .expect((res) => assert.equal(res.body.error.code, "ACCESS_PENDING"));
  });

  it("approval grants access and mints a stable student ID", async () => {
    const s = await approveStudent(403, "grad");
    const me = await s.agent.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.accessState, "APPROVED");
    assert.match(me.body.data.user.studentId, /^STU\d{4}$/);
    assert.ok(me.body.data.user.folder.includes(me.body.data.user.studentId));
    await s.agent.get("/api/v1/assignments").expect(200);
  });

  it("rejection sets reapplyAfter ~24h and blocks early reapplication", async () => {
    const s = await loginStudent(t, t.github, 404, "unlucky");
    const created = await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
    const rejected = await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${created.body.data.id}/reject`).expect(200);
    const lockMs = new Date(rejected.body.data.reapplyAfter).getTime() - new Date(rejected.body.data.decidedAt).getTime();
    assert.ok(Math.abs(lockMs - 24 * 3_600_000) < 5_000, "lock is decided_at + 24h");

    await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(403)
      .expect((res) => {
        assert.equal(res.body.error.code, "REAPPLICATION_LOCKED");
        assert.ok(res.body.error.retryAfter > 23 * 3_600, "retryAfter reflects server time");
        assert.ok(res.headers["retry-after"], "Retry-After header present");
      });
  });

  it("reapplication succeeds after the lock expires (server clock, not client clock)", async () => {
    const s = await loginStudent(t, t.github, 405, "patient");
    const created = await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${created.body.data.id}/reject`).expect(200);
    // Simulate time passing server-side (a manipulated client clock changes nothing).
    await AccessRequest.updateOne(
      { _id: created.body.data.id },
      { $set: { reapplyAfter: new Date(Date.now() - 1_000) } },
    );
    await post(s.agent, s.csrf, "/api/v1/access-requests", { note: "second try" }).expect(201);
  });

  it("concurrent duplicate requests create exactly one pending request", async () => {
    const s = await loginStudent(t, t.github, 406, "hasty");
    const results = await Promise.all(
      Array.from({ length: 8 }, () => post(s.agent, s.csrf, "/api/v1/access-requests", {})),
    );
    const created = results.filter((r) => r.status === 201);
    const conflicted = results.filter((r) => r.status === 409);
    assert.equal(created.length, 1, `expected 1 created, got ${created.length}`);
    assert.equal(conflicted.length, 7);
    const pending = await AccessRequest.countDocuments({ status: "pending", user: { $exists: true } });
    assert.ok(pending >= 1);
  });

  it("stale/invalid transitions fail without corrupting state", async () => {
    const s = await loginStudent(t, t.github, 407, "settled");
    const created = await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${created.body.data.id}/approve`).expect(200);
    // Second decision on a non-pending request: conflict, original stands.
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${created.body.data.id}/reject`).expect(409);
    const after = await AccessRequest.findById(created.body.data.id).lean();
    assert.equal(after.status, "approved");
    // Unknown id: 404.
    await post(admin.agent, admin.csrf, "/api/v1/admin/access-requests/000000000000000000000000/approve").expect(404);
  });

  it("non-admins cannot decide requests; admin decisions are audited", async () => {
    const s = await loginStudent(t, t.github, 408, "sneaky");
    const created = await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
    await post(s.agent, s.csrf, `/api/v1/admin/access-requests/${created.body.data.id}/approve`).expect(403);
    const log = await admin.agent.get("/api/v1/admin/audit-log?limit=50").expect(200);
    const actions = log.body.data.map((e) => e.action);
    assert.ok(actions.includes("ACCESS_APPROVE"), "approvals are audit-logged");
    assert.ok(actions.includes("ACCESS_REJECT"), "rejections are audit-logged");
  });
});
