/**
 * Live-mode adapter tests (Phase 2).
 *
 * `VITE_API_BASE_URL` is set below BEFORE the service layer is imported, so
 * `services/http.js` runs in live mode with `globalThis.fetch` stubbed to
 * replay canned backend payloads. These tests prove the normalization,
 * status derivation, publish transitions, request bodies, and error-code
 * mapping the UI depends on — without needing a running server.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

process.env.VITE_API_BASE_URL = "http://backend.test";

const BASE = "http://backend.test";
const seen = [];
const handlers = new Map();
let problemsAdminForbidden = false;
let csrfRotations = 0;

const on = (method, path, handler) => handlers.set(`${method} ${path}`, handler);

function json(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => headers[String(k).toLowerCase()] ?? null },
    json: async () => body,
  };
}

const ME = {
  id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  githubLogin: "alice",
  displayName: "Alice",
  role: "student",
  accessState: "APPROVED",
  studentId: "STU0007",
  folder: "students/STU0007",
};

const PROB = {
  id: "bbbbbbbbbbbbbbbbbbbbbbbb",
  title: "Two Sum",
  statement: "Given an array of integers nums and an integer target, return indices.",
  topic: "Arrays",
  difficulty: "Easy",
  examples: ["Input: nums = [2,7], target = 9 → Output: [0,1]"],
  constraints: [],
  sourceUrl: "",
  status: "PUBLISHED",
};

const ASG_COMMON = {
  id: "cccccccccccccccccccccccc",
  problemId: PROB.id,
  problem: { ...PROB },
  type: "COMMON",
  title: "Week 1",
  dueAt: null,
  instructions: "",
  status: "active",
  targets: [{ studentId: ME.id, completionStatus: "not_started" }],
  targetCount: 1,
  createdAt: "2026-09-01T00:00:00Z",
};

const ASG_SOLO = {
  id: "dddddddddddddddddddddddd",
  problemId: PROB.id,
  problem: { ...PROB },
  type: "INDIVIDUAL",
  title: "Stretch",
  dueAt: null,
  instructions: "Catch up.",
  status: "active",
  targets: [{ studentId: ME.id, completionStatus: "not_started" }],
  targetCount: 1,
  createdAt: "2026-09-02T00:00:00Z",
};

const SUB_VERIFIED = {
  _id: "eeeeeeeeeeeeeeeeeeeeeeee",
  student: ME.id,
  assignment: { _id: ASG_COMMON.id, title: "Week 1", type: "COMMON" },
  commitSha: "abc123",
  path: "students/STU0007/two-sum.py",
  outcome: "VERIFIED",
  eventType: "NEW_PROBLEM_VERIFIED",
  firstObservedAt: new Date(Date.now() - 2 * 24 * 3_600_000).toISOString(),
  additions: 10,
  deletions: 0,
  note: "",
};

const SUB_REVIEW = {
  _id: "ffffffffffffffffffffffff",
  student: ME.id,
  assignment: { _id: ASG_SOLO.id, title: "Stretch", type: "INDIVIDUAL" },
  commitSha: "def456",
  path: "students/STU0007/stretch.py",
  outcome: "NEEDS_REVIEW",
  eventType: "NEEDS_REVIEW",
  firstObservedAt: new Date().toISOString(),
  additions: 5,
  deletions: 1,
  note: "",
};

globalThis.fetch = async (url, opts = {}) => {
  const method = (opts.method || "GET").toUpperCase();
  const path = String(url).startsWith(BASE) ? String(url).slice(BASE.length) : String(url);
  seen.push({ method, path, headers: opts.headers || {}, body: opts.body });
  const bare = path.split("?")[0];
  const handler = handlers.get(`${method} ${path}`) || handlers.get(`${method} ${bare}`);
  if (!handler) return json(404, { error: { code: "NOT_FOUND", message: `no stub for ${method} ${path}` } });
  return handler({ method, path, headers: opts.headers || {}, body: opts.body });
};

let api;

before(async () => {
  on("GET", "/api/v1/auth/csrf", () => json(200, { data: { csrfToken: `csrf-${csrfRotations}` } }));
  on("GET", "/api/v1/auth/me", () => json(200, { data: { user: ME } }));
  on("GET", "/api/v1/assignments", () => json(200, { data: [ASG_COMMON, ASG_SOLO] }));
  on("GET", "/api/v1/progress/me", () => json(200, {
    data: { student: ME, verified: 1, submissions: [SUB_VERIFIED, SUB_REVIEW] },
  }));
  on("GET", "/api/v1/admin/problems", () => {
    if (problemsAdminForbidden) return json(403, { error: { code: "FORBIDDEN", message: "Professor-admin access only" } });
    return json(200, { data: [{ ...PROB, status: "draft" }], pagination: { total: 1 } });
  });
  on("GET", "/api/v1/admin/students", () => json(200, {
    data: [{ ...ME, verified: 1, evidence: 2, flags: 1 }],
    pagination: { total: 1 },
  }));
  on("GET", `/api/v1/admin/students/${ME.id}/progress`, () => json(200, {
    data: {
      student: ME,
      submissions: [SUB_VERIFIED],
      progressEvents: [{ occurredAt: new Date().toISOString() }],
    },
  }));
  on("GET", "/api/v1/admin/assignments", () => json(200, { data: [ASG_COMMON], pagination: { total: 1 } }));
  on("GET", "/api/v1/leaderboard", () => json(200, {
    data: {
      formula: "Score = 10 × distinct verified problems + 2 × active days (7-day window, UTC).",
      window: "Last 7 days",
      entries: [{ rank: 1, studentId: "STU0007", displayName: "Alice", githubLogin: "alice", verifiedProblems: 1, activeDays: 2, score: 14 }],
    },
  }));
  on("GET", "/api/v1/admin/access-requests", () => json(200, {
    data: [{ id: "req1", userId: ME.id, githubLogin: "alice", status: "PENDING", submittedAt: "2026-10-01T00:00:00Z", decidedAt: null, decidedBy: null, reapplyAfter: null, note: "" }],
    pagination: { total: 1 },
  }));
  on("GET", "/api/v1/admin/submissions/review-queue", () => json(200, {
    data: [{
      ...SUB_REVIEW,
      student: { _id: ME.id, displayName: "Alice", githubLogin: "alice", studentId: "STU0007" },
      assignment: { _id: ASG_SOLO.id, title: "Stretch", type: "INDIVIDUAL" },
    }],
    pagination: { total: 1 },
  }));
  on("GET", "/api/v1/admin/audit-log", () => json(200, {
    data: [{ _id: "audit1", actor: { displayName: "Prof", githubLogin: "prof" }, action: "ACCESS_APPROVE", targetType: "access-request", targetId: "req1", createdAt: "2026-10-01T00:00:00Z", detail: "ok" }],
  }));
  on("GET", "/api/v1/admin/github/integration-status", () => json(200, {
    data: { repo: { fullName: "org/repo", branch: "main", folderRoot: "students/" }, status: "HEALTHY", pendingEvents: 0, lastReceivedAt: "2026-10-01T00:00:00Z", note: "intake only" },
  }));
  on("POST", "/api/v1/admin/problems", ({ body }) => {
    const parsed = JSON.parse(body);
    return json(201, { data: { ...PROB, ...parsed, id: "new-prob-id", status: parsed.status || "draft" } });
  });
  on("PATCH", "/api/v1/admin/problems/bbbbbbbbbbbbbbbbbbbbbbbb", () => json(200, { data: PROB }));
  on("POST", "/api/v1/admin/problems/new-prob-id/publish", () => json(200, { data: { ...PROB, id: "new-prob-id", status: "PUBLISHED" } }));
  on("POST", "/api/v1/admin/assignments", ({ body }) => {
    const parsed = JSON.parse(body);
    return json(201, { data: { id: "new-asg", targetCount: (parsed.studentIds || []).length, ...parsed } });
  });
  on("POST", "/api/v1/admin/access-requests/req1/approve", () => json(200, {
    data: { id: "req1", userId: ME.id, githubLogin: "alice", status: "APPROVED", submittedAt: "2026-10-01T00:00:00Z", decidedAt: "2026-10-02T00:00:00Z", decidedBy: "Prof", reapplyAfter: null, note: "" },
  }));
  on("POST", "/api/v1/admin/access-requests/req1/reject", () => json(409, { error: { code: "IDEMPOTENCY_CONFLICT", message: "already decided" } }));
  on("POST", "/api/v1/access-requests", () => json(403, {
    error: { code: "REAPPLICATION_LOCKED", message: "locked", retryAfter: 3600 },
  }, { "retry-after": "3600" }));
  on("POST", "/api/v1/admin/submissions/ffffffffffffffffffffffff/reviews", ({ body }) => {
    const parsed = JSON.parse(body);
    assert.equal(parsed.decision, "accept");
    return json(200, { data: { id: "ffffffffffffffffffffffff", outcome: "VERIFIED" } });
  });

  api = await import("../src/services/api.js");
});

describe("live-mode adapters (stubbed backend)", () => {
  it("detects live mode from the base URL", () => {
    assert.equal(api.isLiveMode(), true);
  });

  it("normalizes the session user (name fallback included)", async () => {
    const { data } = await api.getMe();
    assert.equal(data.user.githubLogin, "alice");
    assert.equal(data.user.name, "Alice");
    assert.equal(data.user.accessState, "APPROVED");
  });

  it("derives assignment status from submissions, not client input", async () => {
    const { data } = await api.getStudentAssignments();
    const common = data.find((a) => a.id === ASG_COMMON.id);
    const solo = data.find((a) => a.id === ASG_SOLO.id);
    assert.equal(common.status, "VERIFIED");
    assert.equal(solo.status, "NEEDS_REVIEW");
    assert.equal(common.problem.title, "Two Sum");
    assert.equal(common.submissions.length, 1);
  });

  it("builds the overview from stored evidence (distinct verified)", async () => {
    const { data } = await api.getStudentOverview();
    assert.equal(data.verified, 1);
    assert.equal(data.pending, 1);
    assert.equal(data.needsReview, 1);
    assert.equal(data.totalCommitsEvidence, 2);
    assert.equal(data.activitySeries.length, 14);
  });

  it("returns the admin problem catalog normalized", async () => {
    const { data } = await api.getProblems();
    assert.equal(data[0].status, "DRAFT");
    assert.equal(data[0].title, "Two Sum");
  });

  it("students derive the catalog from assignments when the admin list is forbidden", async () => {
    problemsAdminForbidden = true;
    try {
      const { data } = await api.getProblems();
      assert.ok(data.some((p) => p.title === "Two Sum"));
      assert.equal(data[0].statement.length > 0, true);
    } finally {
      problemsAdminForbidden = false;
    }
  });

  it("sends the CSRF header on mutations", async () => {
    await api.createAssignment({ problemId: PROB.id, type: "COMMON", title: "W1" });
    const post = seen.find((s) => s.method === "POST" && s.path === "/api/v1/admin/assignments");
    assert.ok(post.headers["x-csrf-token"], "CSRF header must accompany POST");
    const sent = JSON.parse(post.body);
    assert.deepEqual(sent.studentIds, []);
  });

  it("posts the validated student selection for individual work", async () => {
    await api.createAssignment({ problemId: PROB.id, type: "INDIVIDUAL", studentIds: [ME.id], instructions: "Go." });
    const posts = seen.filter((s) => s.method === "POST" && s.path === "/api/v1/admin/assignments");
    const sent = JSON.parse(posts[posts.length - 1].body);
    assert.deepEqual(sent.studentIds, [ME.id]);
    assert.equal(sent.instructions, "Go.");
  });

  it("surfaces server approval errors with stable codes", async () => {
    await assert.rejects(api.submitAccessRequest(""), (e) => e.code === "REAPPLICATION_LOCKED" && e.retryAfter === 3600);
    await assert.rejects(api.decideAccessRequest("req1", "reject"), (e) => e.code === "IDEMPOTENCY_CONFLICT");
    const { data } = await api.decideAccessRequest("req1", "approve");
    assert.equal(data.status, "APPROVED");
  });

  it("publishes through the dedicated endpoint on create", async () => {
    const { data } = await api.saveProblem({
      title: "Two Sum", statement: "Given an array of integers nums and an integer target, return indices of the two numbers.", topic: "Arrays", difficulty: "Easy", examples: [], constraints: [], sourceUrl: "", status: "PUBLISHED",
    });
    assert.equal(data.status, "PUBLISHED");
    const published = seen.some((s) => s.path === "/api/v1/admin/problems/new-prob-id/publish");
    assert.equal(published, true);
  });

  it("composes the admin overview from paginated totals", async () => {
    const { data } = await api.getAdminOverview();
    assert.equal(data.pendingRequests, 1);
    assert.equal(data.needsReview, 1);
    assert.equal(data.totalStudents, 1);
    assert.equal(data.verifiedWeek, 1);
    assert.equal(data.integration.status, "HEALTHY");
  });

  it("normalizes review queue, audit log, and integration status", async () => {
    const q = await api.getReviewQueue();
    assert.equal(q.data[0].studentName, "Alice");
    assert.equal(q.data[0].assignmentTitle, "Stretch");
    const r = await api.recordReview("ffffffffffffffffffffffff", "accept", "good");
    assert.equal(r.data.outcome, "VERIFIED");
    const log = await api.getAuditLog();
    assert.equal(log.data[0].actor, "Prof");
    const status = await api.getIntegrationStatus();
    assert.equal(status.data.queue.depth, 0);
    assert.equal(status.data.lastSync, "2026-10-01T00:00:00Z");
  });

  it("resolves a STU-ID to the backend record for student reports", async () => {
    const { data } = await api.getStudentReport("STU0007");
    assert.equal(data.student.displayName, "Alice");
    assert.equal(data.submissions.length, 1);
  });

  it("keeps leaderboard entries server-shaped with names", async () => {
    const { data } = await api.getLeaderboard();
    assert.equal(data.entries[0].displayName, "Alice");
    assert.equal(data.entries[0].score, 14);
  });
});
