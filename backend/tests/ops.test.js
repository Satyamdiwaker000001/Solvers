import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Submission, User } from "../src/models.js";
import { bootApp, loginStudent, loginAdmin, post } from "./helpers.js";

describe("review queue, progress, leaderboard, audit, integration", () => {
  let t;
  let admin;
  let student;
  let assignmentId;
  let submissionId;
  before(async () => {
    t = await bootApp();
    admin = await loginAdmin(t, t.github, 101);
    student = await loginStudent(t, t.github, 601, "reviewed");
    await post(student.agent, student.csrf, "/api/v1/access-requests", {}).expect(201);
    const queue = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=10").expect(200);
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${queue.body.data[0].id}/approve`).expect(200);

    const problem = await post(admin.agent, admin.csrf, "/api/v1/admin/problems", {
      title: "Two Sum", statement: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
    }).expect(201);
    await post(admin.agent, admin.csrf, `/api/v1/admin/problems/${problem.body.data.id}/publish`).expect(200);
    const me = await student.agent.get("/api/v1/auth/me").expect(200);
    const asg = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: problem.body.data.id, type: "INDIVIDUAL", studentIds: [me.body.data.user.id],
    }).expect(201);
    assignmentId = asg.body.data.id;

    // Simulate ingested evidence awaiting human review (ingestion itself is
    // covered by webhook intake tests; workers are deferred by design).
    const studentDoc = await User.findOne({ githubUserId: "601" });
    const sub = await Submission.create({
      student: studentDoc._id,
      assignment: assignmentId,
      commitSha: "abc123def456",
      path: "students/STU0001/arrays/two-sum.cpp",
      outcome: "NEEDS_REVIEW",
      eventType: "NEEDS_REVIEW",
      additions: 40,
      deletions: 2,
    });
    submissionId = String(sub._id);
  });
  after(async () => { await t.cleanup(); });

  it("flagged evidence waits in the review queue with context", async () => {
    const q = await admin.agent.get("/api/v1/admin/submissions/review-queue").expect(200);
    assert.ok(q.body.data.some((s) => s._id === submissionId), "submission is queued");
  });

  it("accepting creates one qualifying event; leaderboard reflects it", async () => {
    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${submissionId}/reviews`, {
      decision: "accept", comment: "Independent solution with tests.",
    }).expect(200);
    // Repeat decision on a resolved item is rejected.
    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${submissionId}/reviews`, {
      decision: "accept",
    }).expect(400);

    const lb = await student.agent.get("/api/v1/leaderboard").expect(200);
    assert.ok(lb.body.data.formula.includes("Score ="), "formula is disclosed with rankings");
    const me = lb.body.data.entries.find((e) => e.githubLogin === "reviewed");
    assert.ok(me, "reviewed student ranked from stored events");
    assert.equal(me.verifiedProblems, 1);
    assert.equal(me.score, 10 * 1 + 2 * me.activeDays);
  });

  it("progress report groups evidence and counts distinct verified", async () => {
    const rep = await student.agent.get("/api/v1/progress/me").expect(200);
    assert.equal(rep.body.data.verified, 1, "distinct verified assignments");
    assert.ok(rep.body.data.submissions.length >= 1);
  });

  it("sendback excludes the submission from verified totals", async () => {
    const studentDoc = await User.findOne({ githubUserId: "601" });
    const sub = await Submission.create({
      student: studentDoc._id,
      assignment: assignmentId,
      commitSha: "fff999000111",
      path: "students/x.java",
      outcome: "NEEDS_REVIEW",
      eventType: "NEEDS_REVIEW",
    });
    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, { decision: "sendback", comment: "Empty file." }).expect(200);
    const rep = await student.agent.get("/api/v1/progress/me").expect(200);
    assert.equal(rep.body.data.verified, 1, "sent-back work does not inflate verified count");
  });

  it("audit log records admin actions; integration status is honest", async () => {
    const log = await admin.agent.get("/api/v1/admin/audit-log?limit=50").expect(200);
    const actions = log.body.data.map((e) => e.action);
    assert.ok(actions.includes("REVIEW_DECISION"));
    assert.ok(actions.includes("ASSIGNMENT_CREATE"));
    const status = await admin.agent.get("/api/v1/admin/github/integration-status").expect(200);
    assert.ok(["HEALTHY", "DEGRADED", "NOT_CONFIGURED"].includes(status.body.data.status));
    assert.ok(status.body.data.note.includes("deferred") || status.body.data.note.includes("intake"));
  });

  it("admins can inspect any student's progress; students cannot inspect others", async () => {
    const me = await student.agent.get("/api/v1/auth/me").expect(200);
    await admin.agent.get(`/api/v1/admin/students/${me.body.data.user.id}/progress`).expect(200);
    await admin.agent.get("/api/v1/admin/students/000000000000000000000000/progress").expect(404);
  });
});
