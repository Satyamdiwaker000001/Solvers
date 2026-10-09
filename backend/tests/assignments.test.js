import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { bootApp, loginStudent, loginAdmin, post, patch } from "./helpers.js";

async function mkApproved(t, admin, gid, login) {
  const s = await loginStudent(t, t.github, gid, login);
  await post(s.agent, s.csrf, "/api/v1/access-requests", {}).expect(201);
  const queue = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=100").expect(200);
  const target = queue.body.data.find((r) => r.status === "PENDING");
  assert.ok(target, "expected a pending request to approve");
  await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${target.id}/approve`).expect(200);
  // Re-login so the session reflects approval (role/status re-read per request anyway).
  return s;
}

async function mkProblem(admin, overrides = {}) {
  const draft = await post(admin.agent, admin.csrf, "/api/v1/admin/problems", {
    title: "Two Sum",
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
    topic: "Arrays",
    difficulty: "Easy",
    ...overrides,
  }).expect(201);
  await post(admin.agent, admin.csrf, `/api/v1/admin/problems/${draft.body.data.id}/publish`).expect(200);
  return draft.body.data;
}

describe("problems and assignments", () => {
  let t;
  let admin;
  let alice;
  let bob;
  before(async () => {
    t = await bootApp();
    admin = await loginAdmin(t, t.github, 101);
    alice = await mkApproved(t, admin, 501, "alice");
    bob = await mkApproved(t, admin, 502, "bob");
  });
  after(async () => { await t.cleanup(); });

  it("admin creates, edits, publishes and lists problems", async () => {
    const created = await post(admin.agent, admin.csrf, "/api/v1/admin/problems", {
      title: "Two Sum",
      statement: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
      topic: "Arrays",
      difficulty: "Easy",
    }).expect(201);
    assert.equal(created.body.data.status, "DRAFT");
    const edited = await patch(admin.agent, admin.csrf, `/api/v1/admin/problems/${created.body.data.id}`, { topic: "Arrays & Hashing" }).expect(200);
    assert.equal(edited.body.data.topic, "Arrays & Hashing");
    const published = await post(admin.agent, admin.csrf, `/api/v1/admin/problems/${created.body.data.id}/publish`).expect(200);
    assert.equal(published.body.data.status, "PUBLISHED");
    const list = await admin.agent.get("/api/v1/admin/problems?status=published").expect(200);
    assert.ok(list.body.data.some((p) => p.id === created.body.data.id));
  });

  it("common assignments fan out to every approved student", async () => {
    const problem = await mkProblem(admin);
    const asg = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "COMMON", title: "Week 1", instructions: "Push to your folder.",
    }).expect(201);
    assert.equal(asg.body.data.type, "COMMON");
    assert.equal(asg.body.data.targetCount, 2, "both approved students targeted");
    assert.equal(asg.body.data.instructions, "Push to your folder.");

    for (const s of [alice, bob]) {
      const list = await s.agent.get("/api/v1/assignments").expect(200);
      assert.ok(list.body.data.some((a) => a.id === asg.body.data.id), "approved student sees common work");
    }
  });

  it("individual assignments need a valid selection and stay private", async () => {
    const problem = await mkProblem(admin);
    const aliceMe = await alice.agent.get("/api/v1/auth/me").expect(200);
    const aliceDbId = aliceMe.body.data.user.id;

    const asg = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "INDIVIDUAL", title: "Stretch", studentIds: [aliceDbId],
    }).expect(201);
    assert.equal(asg.body.data.targets.length, 1);

    const aliceList = await alice.agent.get("/api/v1/assignments").expect(200);
    assert.ok(aliceList.body.data.some((a) => a.id === asg.body.data.id));
    const bobList = await bob.agent.get("/api/v1/assignments").expect(200);
    assert.ok(!bobList.body.data.some((a) => a.id === asg.body.data.id), "other students must not see it");
    await bob.agent.get(`/api/v1/assignments/${asg.body.data.id}`).expect(403);
    // Targets of other students are hidden even from entitled readers.
    const detail = await alice.agent.get(`/api/v1/assignments/${asg.body.data.id}`).expect(200);
    assert.equal(detail.body.data.targets.length, 1);

    // Empty selection, unknown id, and unapproved students are rejected.
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "INDIVIDUAL", studentIds: [],
    }).expect(400);
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "INDIVIDUAL", studentIds: ["000000000000000000000000"],
    }).expect(400);
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "INDIVIDUAL", studentIds: ["not-an-id"],
    }).expect(400);
  });

  it("draft problems cannot be assigned", async () => {
    const draft = await post(admin.agent, admin.csrf, "/api/v1/admin/problems", {
      title: "Draft Work", statement: "This statement is long enough to pass validation rules easily.",
    }).expect(201);
    assert.equal(draft.body.data.status, "DRAFT");
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: draft.body.data.id, type: "COMMON",
    }).expect(400);
  });

  it("students cannot create problems or assignments", async () => {
    await post(alice.agent, alice.csrf, "/api/v1/admin/problems", {
      title: "Sneaky", statement: "Students must never publish their own problem statements here.",
    }).expect(403);
    const problem = await mkProblem(admin);
    await post(alice.agent, alice.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "COMMON",
    }).expect(403);
  });

  it("assignments persist across server restarts (new app, same database)", async () => {
    const problem = await mkProblem(admin);
    const asg = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.id, type: "COMMON", title: "Survivor",
    }).expect(201);
    const t2 = await bootApp({}, { mongod: t.mongod });
    try {
      const admin2 = await loginAdmin(t2, t2.github, 102);
      const list = await admin2.agent.get("/api/v1/admin/assignments?limit=100").expect(200);
      assert.ok(list.body.data.some((a) => a.id === asg.body.data.id), "assignment survived restart");
    } finally {
      await t2.cleanup();
    }
  });
});
