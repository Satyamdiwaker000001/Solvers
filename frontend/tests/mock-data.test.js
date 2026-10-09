import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  students, assignments, submissions,
} from "../src/mocks/data.js";
import {
  getLeaderboard, submitAccessRequest, decideAccessRequest,
} from "../src/services/api.js";

describe("mock dataset integrity (mirrors SRS business rules)", () => {
  it("leaderboard verified counts are reproducible from qualifying events (BR-09)", async () => {
    const { data } = await getLeaderboard();
    for (const entry of data.entries) {
      const distinct = new Set(
        submissions
          .filter((s) => s.studentId === entry.studentId && s.eventType === "NEW_PROBLEM_VERIFIED")
          .map((s) => s.assignmentId),
      ).size;
      assert.equal(entry.verifiedProblems, distinct, `mismatch for ${entry.studentId}`);
    }
  });

  it("comment-only edits never count as extra solved problems (FR-PROG-02)", () => {
    const stu006 = submissions.filter((s) => s.studentId === "STU006" && s.assignmentId === "ASG-0001");
    assert.ok(stu006.length >= 2, "fixture needs the comment-only follow-up");
    const distinct = new Set(
      stu006.filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED").map((s) => s.assignmentId),
    );
    assert.equal(distinct.size, 1);
  });

  it("individual assignments target only listed students (BR-05)", () => {
    const ids = new Set(students.map((s) => s.id));
    for (const a of assignments) {
      assert.ok(a.targets.length > 0, `${a.id} has no targets`);
      for (const t of a.targets) assert.ok(ids.has(t), `${a.id} targets unknown ${t}`);
      if (a.type === "INDIVIDUAL") {
        assert.ok(a.targets.length < students.length, `${a.id} should not target the class`);
      }
    }
  });

  it("similarity flags carry evidence and never a verdict (BR-08, NFR-FAIR-01)", () => {
    const flagged = submissions.filter((s) => s.outcome === "NEEDS_REVIEW");
    assert.ok(flagged.length > 0, "fixture needs a review case");
    for (const s of flagged) {
      if (s.similarity) {
        assert.ok(s.similarity.detail && s.similarity.against, `${s.id} lacks supporting evidence`);
      }
    }
  });

  it("duplicate pending requests are rejected (FR-AUTH-08)", async () => {
    await assert.rejects(
      submitAccessRequest("newbie-dev-99"),
      (e) => e.code === "IDEMPOTENCY_CONFLICT",
    );
  });

  it("rejection sets a ~24h reapply lock (FR-AUTH-06)", async () => {
    const before = Date.now();
    const { data } = await decideAccessRequest("REQ-9002", "reject");
    assert.equal(data.status, "REJECTED");
    const delta = new Date(data.reapplyAfter).getTime() - new Date(data.decidedAt).getTime();
    assert.ok(Math.abs(delta - 24 * 3_600_000) < 5_000, "lock must be decided_at + 24h");
    assert.ok(Date.now() - before < 30_000);
  });
});
