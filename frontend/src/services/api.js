/**
 * Service layer — production API client communicating directly with backend.
 *
 * Backend contract: Express API at `VITE_API_BASE_URL` (see `services/http.js`).
 * All requests authenticate via HttpOnly session cookies + CSRF tokens.
 */

import { apiFetch, clearCsrfToken, isLive, routes, setSessionId } from "./http.js";

export const isLiveMode = () => true;

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/* ================= data normalizers ================= */

function normSessionUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.displayName || u.githubLogin,
    displayName: u.displayName || u.githubLogin,
    githubLogin: u.githubLogin,
    avatarUrl: u.avatarUrl || null,
    role: u.role,
    accessState: u.accessState,
    studentId: u.studentId || null,
    folder: u.folder || null,
  };
}

function normStudent(s) {
  if (!s) return null;
  return {
    id: s.studentId || s.id,
    dbId: s.id,
    displayName: s.displayName || s.githubLogin,
    name: s.displayName || s.githubLogin,
    githubLogin: s.githubLogin,
    avatarUrl: s.avatarUrl || (s.githubUserId ? `https://avatars.githubusercontent.com/u/${s.githubUserId}?v=4` : null),
    status: s.accessState,
    accessState: s.accessState,
    role: s.role,
    studentId: s.studentId || null,
    folder: s.folder || null,
    verified: s.verified ?? 0,
    evidence: s.evidence ?? 0,
    flags: s.flags ?? 0,
    streakDays: null,
  };
}

function normProblem(p) {
  if (!p) return null;
  return {
    id: String(p.id ?? p._id),
    problemCode: p.problemCode || null,
    title: p.title,
    statement: p.statement,
    topic: p.topic || "",
    difficulty: p.difficulty,
    examples: p.examples || [],
    constraints: p.constraints || [],
    sourceUrl: p.sourceUrl || "",
    status: String(p.status || "").toUpperCase(),
    createdBy: p.createdBy || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function normRequest(r) {
  if (!r) return null;
  return {
    id: String(r.id ?? r._id),
    userId: r.userId,
    githubLogin: r.githubLogin || r.displayName || "unknown",
    displayName: r.displayName || r.githubLogin || "unknown",
    avatarUrl: r.avatarUrl || null,
    studentId: r.studentId || null,
    status: String(r.status || "").toUpperCase(),
    submittedAt: r.submittedAt,
    decidedAt: r.decidedAt || null,
    decidedBy: r.decidedBy || null,
    reapplyAfter: r.reapplyAfter || null,
    note: r.note || "",
  };
}

function normSubmission(s, assignmentById) {
  const rawAssignment = s.assignment && typeof s.assignment === "object" ? s.assignment : null;
  const rawStudent = s.student && typeof s.student === "object" ? s.student : null;
  const assignmentId = String(rawAssignment?._id ?? s.assignment ?? s.assignmentId ?? "");
  const assignment = (assignmentById && assignmentId && assignmentById(assignmentId)) || null;
  const studentId = String(rawStudent?._id ?? (typeof s.student === "string" ? s.student : s.studentId ?? ""));
  const studentName = rawStudent?.displayName || rawStudent?.githubLogin || s.studentName || "";
  const studentLogin = rawStudent?.githubLogin || s.studentLogin || "";
  const problemTitle = rawAssignment?.problem?.title || rawAssignment?.title || assignment?.problem?.title || s.problemTitle || "";
  const assignmentTitle = rawAssignment?.title || assignment?.title || s.assignmentTitle || "";

  return {
    id: String(s._id ?? s.id),
    studentId,
    studentName,
    studentLogin,
    assignmentId,
    assignmentTitle,
    problemTitle,
    problemId: assignment?.problemId || (rawAssignment?.problem?._id ?? assignment?.problem?.id ?? s.problemId ?? ""),
    commitSha: s.commitSha || "",
    path: s.path || "",
    outcome: s.outcome,
    eventType: s.eventType,
    observedAt: s.firstObservedAt || s.observedAt,
    filesChanged: s.filesChanged ?? 1,
    additions: s.additions ?? 0,
    deletions: s.deletions ?? 0,
    note: s.note || "",
    reviewedBy: s.reviewedBy || null,
    reviewedAt: s.reviewedAt || null,
    reviewComment: s.reviewComment || "",
  };
}

function assignmentStatus(assignmentId, subs) {
  const mine = subs.filter((s) => s.assignmentId === assignmentId);
  if (mine.some((s) => s.eventType === "NEW_PROBLEM_VERIFIED")) return "VERIFIED";
  if (mine.some((s) => s.outcome === "NEEDS_REVIEW")) return "NEEDS_REVIEW";
  if (mine.length > 0) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function normStudentAssignment(a, subsByAssignment) {
  const problemId = String(a.problemId ?? a.problem?.id ?? "");
  const id = String(a.id ?? a._id);
  const subs = subsByAssignment.get(id) || [];
  return {
    id,
    problemId,
    problem: a.problem
      ? {
          id: String(a.problem.id ?? a.problem._id ?? problemId),
          title: a.problem.title || "",
          topic: a.problem.topic || "",
          difficulty: a.problem.difficulty || "",
          statement: a.problem.statement || "",
          examples: a.problem.examples || [],
          constraints: a.problem.constraints || [],
          sourceUrl: a.problem.sourceUrl || "",
        }
      : null,
    type: a.type,
    title: a.title || "",
    dueAt: a.dueAt || null,
    instructions: a.instructions || "",
    status: a.status === "ACTIVE" || a.status === "active" ? assignmentStatus(id, subs) : (a.status || "ACTIVE"),
    targets: (a.targets || []).map((t) => (typeof t === "string" ? t : String(t.studentId ?? t.student ?? ""))),
    submissions: subs,
  };
}

function bucketActivitySeries(subs, days = 14) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3_600_000);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      verified: 0, progress: 0, review: 0,
    });
  }
  for (const s of subs) {
    const key = new Date(s.observedAt).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (s.eventType === "NEW_PROBLEM_VERIFIED") b.verified += 1;
    else if (s.eventType === "MEANINGFUL_PROGRESS") b.progress += 1;
    if (["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"].includes(s.outcome)) b.review += 1;
  }
  return [...buckets.values()];
}

/** Student bundle (assignments + own submissions), cached briefly. */
let bundleCache = null;
async function fetchStudentBundle() {
  if (bundleCache && Date.now() - bundleCache.at < 20_000) return bundleCache.data;
  const [asgBody, repBody] = await Promise.all([
    apiFetch(routes.assignments),
    apiFetch(routes.progressMe),
  ]);
  const rawAssignments = asgBody.data || [];
  const byAssignment = new Map();
  const assignmentIndex = new Map(rawAssignments.map((a) => [String(a.id), a]));
  const subs = (repBody.data?.submissions || []).map((s) =>
    normSubmission(s, (id) => assignmentIndex.get(String(id))));
  for (const s of subs) {
    if (!byAssignment.has(s.assignmentId)) byAssignment.set(s.assignmentId, []);
    byAssignment.get(s.assignmentId).push(s);
  }
  const data = {
    assignments: rawAssignments.map((a) => normStudentAssignment(a, byAssignment)),
    submissions: subs,
    progress: repBody.data,
  };
  bundleCache = { at: Date.now(), data };
  return data;
}

export function clearStudentCache() {
  bundleCache = null;
}

/* ================= student reads ================= */

export async function getStudentOverview(studentId) {
  const bundle = await fetchStudentBundle();
  const { submissions: subs, assignments: asg, progress } = bundle;
  const verified = new Set(
    subs.filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED").map((s) => s.assignmentId),
  ).size;
  return {
    data: {
      student: normSessionUser(progress.student),
      verified,
      pending: asg.filter((a) => a.status !== "VERIFIED").length,
      needsReview: subs.filter((s) => s.outcome === "NEEDS_REVIEW").length,
      totalCommitsEvidence: subs.length,
      activitySeries: bucketActivitySeries(subs),
      report: progress.report || null,
    },
  };
}

export async function getStudentAssignments(studentId) {
  const bundle = await fetchStudentBundle();
  return { data: bundle.assignments };
}

export async function getStudentSubmissions(studentId) {
  const bundle = await fetchStudentBundle();
  return { data: [...bundle.submissions].sort((a, b) => (a.observedAt < b.observedAt ? 1 : -1)) };
}

export async function getLeaderboard() {
  const body = await apiFetch(routes.leaderboard);
  return { data: body.data };
}

export async function getTrackingPolicy() {
  const body = await apiFetch(routes.adminTrackingPolicy);
  return { data: body.data };
}

export async function updateTrackingPolicy(dailyMinimum) {
  const body = await apiFetch(routes.adminTrackingPolicy, {
    method: "PATCH",
    body: { dailyMinimum },
  });
  return { data: body.data };
}

/* ================= admin reads ================= */

export async function getAdminOverview() {
  const overview = await apiFetch(routes.adminOverview).catch(() => null);
  const [integration, legacy] = await Promise.all([
    apiFetch(routes.integrationStatus).catch(() => ({ data: null })),
    overview ? Promise.resolve(null) : Promise.all([
      apiFetch(`${routes.adminRequests}?status=pending&limit=1`),
      apiFetch(`${routes.reviewQueue}?limit=1`),
      apiFetch(`${routes.adminStudents}?limit=1`),
      apiFetch(`${routes.adminAssignments}?limit=1`),
      apiFetch(routes.leaderboard),
    ]),
  ]);
  const summary = overview?.data || (() => {
    const [pending, review, studentList, assignmentList, lb] = legacy;
    return {
      pendingRequests: pending.pagination?.total ?? (pending.data || []).length,
      needsReview: review.pagination?.total ?? (review.data || []).length,
      verifiedWeek: (lb.data?.entries || []).reduce((n, e) => n + (e.verifiedProblems || 0), 0),
      totalStudents: studentList.pagination?.total ?? (studentList.data || []).length,
      activeAssignments: assignmentList.pagination?.total ?? (assignmentList.data || []).length,
      activitySeries: [],
    };
  })();
  return {
    data: {
      ...summary,
      integration: integration.data ? {
        status: integration.data.status,
        message: integration.data.note || "GitHub integration status reported by the server.",
        lastSync: integration.data.lastReceivedAt,
      } : { status: "NOT_CONFIGURED", message: "Integration status unavailable.", lastSync: null },
    },
  };
}

export async function getAccessRequests() {
  const body = await apiFetch(`${routes.adminRequests}?limit=100`);
  return { data: (body.data || []).map(normRequest) };
}

export async function getMyRequest() {
  const body = await apiFetch(routes.ownRequest);
  return { data: normRequest(body.data) };
}

export async function getProblems() {
  try {
    const body = await apiFetch(`${routes.adminProblems}?limit=100`);
    return { data: (body.data || []).map(normProblem) };
  } catch (err) {
    if (err.status === 403) {
      // Students have no catalog endpoint: derive it from their assignments.
      const bundle = await fetchStudentBundle();
      const seen = new Map();
      for (const a of bundle.assignments) {
        if (a.problem && !seen.has(a.problem.id)) {
          seen.set(a.problem.id, {
            id: a.problem.id,
            title: a.problem.title,
            statement: a.problem.statement,
            topic: a.problem.topic,
            difficulty: a.problem.difficulty || "Easy",
            examples: a.problem.examples,
            constraints: a.problem.constraints,
            sourceUrl: a.problem.sourceUrl,
            status: "PUBLISHED",
          });
        }
      }
      return { data: [...seen.values()] };
    }
    throw err;
  }
}

export async function getStudents() {
  const body = await apiFetch(`${routes.adminStudents}?limit=100`);
  return { data: (body.data || []).map(normStudent) };
}

export async function getStudentReport(studentId) {
  let dbId = studentId;
  if (!OBJECT_ID.test(String(studentId))) {
    const list = await getStudents();
    const match = list.data.find((s) => s.id === studentId || s.studentId === studentId);
    if (!match) throw new Error("Student not found.");
    dbId = match.dbId;
  }
  const body = await apiFetch(`${routes.adminStudents}/${dbId}/progress`);
  const d = body.data || {};
  const subs = (d.submissions || []).map((s) => normSubmission(s, null));
  const activeDays = new Set(
    (d.progressEvents || []).map((e) => new Date(e.occurredAt).toISOString().slice(0, 10)),
  ).size;
  return {
    data: {
      student: { ...normStudent(d.student), streakDays: activeDays },
      submissions: subs,
      progressEvents: d.progressEvents || [],
    },
  };
}

export async function getReviewQueue() {
  const body = await apiFetch(`${routes.reviewQueue}?limit=100`);
  return {
    data: (body.data || []).map((s) => {
      const student = s.student && typeof s.student === "object" ? s.student : null;
      const assignment = s.assignment && typeof s.assignment === "object" ? s.assignment : null;
      return {
        ...normSubmission(s, null),
        studentId: student ? String(student._id) : String(s.student || ""),
        studentName: student?.displayName || student?.githubLogin || "",
        studentLogin: student?.githubLogin || "",
        assignmentTitle: assignment?.title || "",
      };
    }),
  };
}

export async function getAuditLog() {
  const body = await apiFetch(`${routes.auditLog}?limit=100`);
  return {
    data: (body.data || []).map((a) => ({
      id: String(a._id || a.id),
      actor: a.actor?.displayName || a.actor?.githubLogin || "system",
      action: a.action,
      targetType: a.targetType,
      targetId: String(a.targetId),
      createdAt: a.createdAt,
      detail: a.detail || "",
    })),
  };
}

export async function getIntegrationStatus() {
  const body = await apiFetch(routes.integrationStatus);
  const d = body.data || {};
  return {
    data: {
      repo: { fullName: d.repo?.fullName || "", branch: d.repo?.branch || "", folderRoot: d.repo?.folderRoot || "" },
      status: d.status || "NOT_CONFIGURED",
      message: d.note || "GitHub integration status reported by the server.",
      queue: { depth: d.pendingEvents ?? 0, oldestAgeSec: null, deadLetter: null },
      lastSync: d.lastReceivedAt || null,
    },
  };
}

export async function getAdminAssignments() {
  const body = await apiFetch(`${routes.adminAssignments}?limit=100`);
  return {
    data: (body.data || []).map((a) => ({
      id: String(a.id),
      problemId: String(a.problemId ?? a.problem?.id ?? ""),
      problemTitle: a.problem?.title || "",
      type: a.type,
      title: a.title || "",
      dueAt: a.dueAt || null,
      instructions: a.instructions || "",
      status: a.status,
      targets: a.targets || [],
      targetCount: a.targetCount ?? (a.targets || []).length,
      createdAt: a.createdAt,
    })),
  };
}

/* ================= mutations ================= */

export async function decideAccessRequest(id, decision) {
  const action = decision === "approve" ? "approve" : "reject";
  const body = await apiFetch(`${routes.adminRequests}/${id}/${action}`, { method: "POST", body: {} });
  clearStudentCache();
  return { data: normRequest(body.data) };
}

export async function submitAccessRequest(note = "") {
  const body = await apiFetch(routes.accessRequests, { method: "POST", body: { note: String(note || "").slice(0, 500) } });
  clearStudentCache();
  return { data: normRequest(body.data) };
}

function problemPayload(p) {
  return {
    title: p.title,
    statement: p.statement,
    topic: p.topic || "",
    difficulty: p.difficulty || "Easy",
    examples: Array.isArray(p.examples) ? p.examples : [],
    constraints: Array.isArray(p.constraints) ? p.constraints : [],
    sourceUrl: p.sourceUrl || "",
  };
}

export async function saveProblem(payload, id) {
  const desired = String(payload.status || "DRAFT").toLowerCase();
  if (!id) {
    const created = await apiFetch(routes.adminProblems, {
      method: "POST",
      body: { ...problemPayload(payload), status: desired === "archived" ? "archived" : "draft" },
    });
    const problemId = created.data.id;
    if (desired === "published") {
      const published = await apiFetch(`${routes.adminProblems}/${problemId}/publish`, { method: "POST", body: {} });
      return { data: normProblem(published.data) };
    }
    if (desired === "archived") {
      const archived = await apiFetch(`${routes.adminProblems}/${problemId}/archive`, { method: "POST", body: {} });
      return { data: normProblem(archived.data) };
    }
    return { data: normProblem(created.data) };
  }
  const current = await apiFetch(`${routes.adminProblems}?limit=100`);
  const existing = (current.data || []).find((p) => String(p.id) === String(id));
  const currentStatus = String(existing?.status || "draft").toLowerCase();
  const updated = await apiFetch(`${routes.adminProblems}/${id}`, { method: "PATCH", body: problemPayload(payload) });
  if (desired === "published" && currentStatus !== "published") {
    const published = await apiFetch(`${routes.adminProblems}/${id}/publish`, { method: "POST", body: {} });
    return { data: normProblem(published.data) };
  }
  if (desired === "archived" && currentStatus !== "archived") {
    const archived = await apiFetch(`${routes.adminProblems}/${id}/archive`, { method: "POST", body: {} });
    return { data: normProblem(archived.data) };
  }
  if (desired === "draft" && currentStatus !== "draft") {
    const demoted = await apiFetch(`${routes.adminProblems}/${id}`, { method: "PATCH", body: { status: "draft" } });
    return { data: normProblem(demoted.data) };
  }
  return { data: normProblem(updated.data) };
}

export async function saveProblemsBulk(problemsList) {
  const body = await apiFetch(routes.adminProblemsBulk, {
    method: "POST",
    body: { problems: problemsList },
  });
  return { data: body.data };
}

export async function updateAdminProfile(updates) {
  const body = await apiFetch(routes.me, {
    method: "PATCH",
    body: updates,
  });
  return { data: { user: normSessionUser(body.data?.user) } };
}

export async function createAssignment({ problemId, type, title = "", dueAt = null, instructions = "", studentIds = [] }) {
  const body = await apiFetch(routes.adminAssignments, {
    method: "POST",
    body: {
      problemId, type,
      title: String(title || "").slice(0, 200),
      dueAt,
      instructions: String(instructions || "").slice(0, 5000),
      studentIds: type === "INDIVIDUAL" ? studentIds : [],
    },
  });
  clearStudentCache();
  return { data: body.data };
}

export async function recordReview(submissionId, decision, comment) {
  const body = await apiFetch(`${routes.reviewQueue.replace("/review-queue", "")}/${submissionId}/reviews`, {
    method: "POST",
    body: { decision, comment: comment || "" },
  });
  return { data: body.data };
}

export async function assignStudentToSubmission(submissionId, studentId) {
  const body = await apiFetch(`${routes.adminSubmissions}/${submissionId}/assign-student`, {
    method: "PATCH",
    body: { studentId },
  });
  return { data: body.data };
}

export async function assignAssignmentToSubmission(submissionId, assignmentId) {
  const body = await apiFetch(`${routes.adminSubmissions}/${submissionId}/assign-assignment`, {
    method: "PATCH",
    body: { assignmentId },
  });
  return { data: body.data };
}

export async function archiveAssignment(assignmentId) {
  const body = await apiFetch(`${routes.adminAssignments}/${assignmentId}/archive`, {
    method: "POST",
    body: {},
  });
  return { data: body.data };
}

export async function updateStudentFolder(studentId, folder) {
  const body = await apiFetch(`${routes.adminStudents}/${studentId}/folder`, {
    method: "PATCH",
    body: { folder },
  });
  return { data: body.data };
}

/* ================= session ================= */

export async function getMe() {
  const body = await apiFetch(routes.me);
  return { data: { user: normSessionUser(body.data?.user) } };
}

export async function startOAuth() {
  const body = await apiFetch(routes.oauthStart);
  return body.data?.authorizeUrl;
}

export async function adminLogin(username, password) {
  const body = await apiFetch(routes.adminLogin, {
    method: "POST",
    body: { username, password },
  });
  if (body?.data?.sessionId) {
    setSessionId(body.data.sessionId);
  }
  return { data: { user: normSessionUser(body.data?.user) } };
}

export async function logout() {
  try {
    await apiFetch(routes.logout, { method: "POST", body: {} });
  } finally {
    clearCsrfToken();
    setSessionId(null);
    clearStudentCache();
  }
  return { data: { ok: true } };
}
