/**
 * Service layer — MOCK implementation for the frontend foundation phase.
 *
 * Every function simulates its future REST endpoint (see 06-api-spec.md) with a
 * short delay and returns { data } shaped like the real API will. When the
 * backend exists, replace the body of each function with a fetch() call through
 * `apiClient` in services/http.js — call sites must NOT change.
 *
 * Honesty rule: anything returned here is demo data. The UI labels demo mode
 * and never claims persistence across reloads for admin mutations beyond this session.
 */
import {
  accessRequests, activitySeries, assignments, auditLog, leaderboard,
  leaderboardFormula, problems, studentById, submissions, students, CENTRAL_REPO,
} from "../mocks/data.js";

const LATENCY = 450;
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));
const clone = (v) => JSON.parse(JSON.stringify(v));

/* ---------- student ---------- */
export async function getStudentOverview(studentId) {
  await wait();
  const subs = submissions.filter((s) => s.studentId === studentId);
  const verified = new Set(subs.filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED").map((s) => s.assignmentId)).size;
  const myAssignments = assignments.filter((a) => a.targets.includes(studentId));
  const pending = myAssignments.filter((a) => !subs.some((s) => s.assignmentId === a.id && s.eventType === "NEW_PROBLEM_VERIFIED")).length;
  const needsReview = subs.filter((s) => s.outcome === "NEEDS_REVIEW").length;
  const student = studentById(studentId);
  return { data: { student, verified, pending, needsReview, totalCommitsEvidence: subs.length, activitySeries: clone(activitySeries) } };
}

export async function getStudentAssignments(studentId) {
  await wait();
  const list = assignments
    .filter((a) => a.targets.includes(studentId))
    .map((a) => {
      const subs = submissions.filter((s) => s.studentId === studentId && s.assignmentId === a.id);
      const verified = subs.some((s) => s.eventType === "NEW_PROBLEM_VERIFIED");
      const review = subs.some((s) => s.outcome === "NEEDS_REVIEW");
      const status = verified ? "VERIFIED" : review ? "NEEDS_REVIEW" : subs.length ? "IN_PROGRESS" : "NOT_STARTED";
      return { ...clone(a), submissions: clone(subs), status };
    });
  return { data: list };
}

export async function getStudentSubmissions(studentId) {
  await wait();
  return { data: clone(submissions.filter((s) => s.studentId === studentId).sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1))) };
}

export async function getLeaderboard() {
  await wait();
  return { data: { formula: leaderboardFormula, window: "Last 7 days · server timezone UTC (proposed)", entries: clone(leaderboard) } };
}

/* ---------- admin ---------- */
export async function getAdminOverview() {
  await wait(600);
  const pendingRequests = accessRequests.filter((r) => r.status === "PENDING").length;
  const needsReview = submissions.filter((s) => s.outcome === "NEEDS_REVIEW").length;
  const verifiedWeek = submissions.filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED").length;
  return {
    data: {
      pendingRequests, needsReview, verifiedWeek, totalStudents: students.length,
      activeAssignments: assignments.filter((a) => a.status === "ACTIVE").length,
      activitySeries: clone(activitySeries),
      integration: { status: "DEGRADED", message: "Webhook deliveries delayed ~4 min; reconciliation job healthy.", lastSync: "2026-10-09T08:32:00Z" },
    },
  };
}

export async function getAccessRequests() { await wait(); return { data: clone(accessRequests) }; }
export async function getProblems() { await wait(); return { data: clone(problems) }; }
export async function getStudents() {
  await wait();
  const data = students.map((s) => {
    const subs = submissions.filter((x) => x.studentId === s.id);
    return { ...s, verified: new Set(subs.filter((x) => x.eventType === "NEW_PROBLEM_VERIFIED").map((x) => x.assignmentId)).size, evidence: subs.length, flags: subs.filter((x) => x.outcome === "NEEDS_REVIEW" || x.outcome === "CHECK_FAILED").length };
  });
  return { data };
}
export async function getStudentReport(studentId) {
  await wait();
  return { data: { student: studentById(studentId), submissions: clone(submissions.filter((s) => s.studentId === studentId)) } };
}
export async function getReviewQueue() {
  await wait();
  return { data: clone(submissions.filter((s) => ["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"].includes(s.outcome))) };
}
export async function getAuditLog() { await wait(300); return { data: clone(auditLog).reverse() }; }
export async function getIntegrationStatus() {
  await wait(300);
  return {
    data: {
      repo: CENTRAL_REPO, status: "DEGRADED",
      message: "Push webhooks delayed ~4 min (GitHub incident watch). Last reconciliation 08:32 UTC recovered 3 events.",
      queue: { depth: 4, oldestAgeSec: 236, deadLetter: 0 }, lastSync: "2026-10-09T08:32:00Z",
    },
  };
}

/* ---------- mock mutations (session-only) ---------- */
export async function decideAccessRequest(id, decision) {
  await wait(500);
  const r = accessRequests.find((x) => x.id === id);
  if (!r) throw new Error("Request not found (mock).");
  r.status = decision === "approve" ? "APPROVED" : "REJECTED";
  r.decidedAt = new Date().toISOString();
  r.decidedBy = "prof. Rao (demo)";
  r.reapplyAfter = decision === "approve" ? null : new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  return { data: clone(r) };
}

export async function submitAccessRequest(githubLogin) {
  await wait(500);
  const locked = accessRequests.find((r) => r.githubLogin === githubLogin && r.status === "REJECTED" && r.reapplyAfter && new Date(r.reapplyAfter) > new Date());
  if (locked) {
    const err = new Error("Reapplication locked");
    err.code = "REAPPLICATION_LOCKED";
    err.retryAfter = locked.reapplyAfter;
    throw err;
  }
  const dup = accessRequests.find((r) => r.githubLogin === githubLogin && r.status === "PENDING");
  if (dup) {
    const err = new Error("Duplicate pending request");
    err.code = "IDEMPOTENCY_CONFLICT";
    throw err;
  }
  const created = { id: `REQ-${Math.floor(9000 + Math.random() * 999)}`, githubLogin, githubUserId: "10xxxxxx", status: "PENDING", submittedAt: new Date().toISOString(), decidedAt: null, decidedBy: null, reapplyAfter: null, note: "" };
  accessRequests.unshift(created);
  return { data: clone(created) };
}

export async function saveProblem(payload, id) {
  await wait(500);
  if (id) {
    const p = problems.find((x) => x.id === id);
    Object.assign(p, payload);
    return { data: clone(p) };
  }
  const created = { id: `PS-${String(problems.length + 1).padStart(4, "0")}`, status: "DRAFT", createdBy: "prof. Rao (demo)", createdAt: new Date().toISOString(), ...payload };
  problems.unshift(created);
  return { data: clone(created) };
}

export async function recordReview(submissionId, decision, comment) {
  await wait(500);
  const s = submissions.find((x) => x.id === submissionId);
  if (!s) throw new Error("Submission not found (mock).");
  s.outcome = decision === "accept" ? "VERIFIED" : "INCOMPLETE";
  s.eventType = decision === "accept" ? "NEW_PROBLEM_VERIFIED" : "NO_QUALIFYING_CHANGE";
  auditLog.push({ id: `AUD-${auditLog.length + 1}`, actor: "prof. Rao (demo)", action: "REVIEW_DECISION", targetType: "submission", targetId: submissionId, createdAt: new Date().toISOString(), detail: `${decision}: ${comment || "no comment"}` });
  return { data: clone(s) };
}
