import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { Assignment, ProgressEvent, Submission } from "../src/models.js";
import {
  processWebhookPayload,
  matchAssignmentForEvidence,
} from "../src/services/evidence.js";
import {
  detectAssignmentInconsistencies,
  reconcileAssignments,
} from "../src/services/assignmentMigration.js";
import { computeLeaderboard } from "../src/services/leaderboard.js";
import {
  bootApp,
  loginAdmin,
  loginStudent,
  post,
  patch,
} from "./helpers.js";

const pushPayload = (studentPath, over = {}) => {
  const commitId = over.commitId || "f00d1234567890abcdef1234567890abcdef12";
  return {
    ref: "refs/heads/main",
    repository: { full_name: "college-org/dsa-practice" },
    head_commit: { id: commitId },
    commits: [
      {
        id: commitId,
        added: [studentPath],
        modified: [],
        removed: [],
        author: { name: "Student Dev", email: "student@example.com" },
      },
    ],
    ...over,
  };
};

describe("assignments, submissions & verification integrity: regression suite", () => {
  let t;
  let admin;
  let studentAlice;
  let studentBob;
  let aliceUser;
  let bobUser;

  before(async () => {
    t = await bootApp({
      GITHUB_WEBHOOK_SECRET: "wh-secret-lifecycle",
      CENTRAL_REPO_FULL_NAME: "college-org/dsa-practice",
      CENTRAL_REPO_BRANCH: "main",
      CENTRAL_REPO_FOLDER_ROOT: "students/",
      ADMIN_GITHUB_IDS: "101,102",
    });
    admin = await loginAdmin(t, t.github, 101);

    // Onboard Alice
    studentAlice = await loginStudent(t, t.github, 601, "alice-asg");
    await post(studentAlice.agent, studentAlice.csrf, "/api/v1/access-requests", {}).expect(201);
    const reqsA = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=100").expect(200);
    const reqA = reqsA.body.data.find((r) => r.githubLogin === "alice-asg");
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${reqA.id}/approve`, {
      folder: "students/Alice_Folder",
    }).expect(200);
    const meA = await studentAlice.agent.get("/api/v1/auth/me").expect(200);
    aliceUser = meA.body.data.user;

    // Onboard Bob
    studentBob = await loginStudent(t, t.github, 602, "bob-asg");
    await post(studentBob.agent, studentBob.csrf, "/api/v1/access-requests", {}).expect(201);
    const reqsB = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=100").expect(200);
    const reqB = reqsB.body.data.find((r) => r.githubLogin === "bob-asg");
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${reqB.id}/approve`, {
      folder: "students/Bob_Folder",
    }).expect(200);
    const meB = await studentBob.agent.get("/api/v1/auth/me").expect(200);
    bobUser = meB.body.data.user;
  });

  after(async () => {
    await t.cleanup();
  });

  async function createPublishedProblem({ title, topic = "Arrays", statement = "Test problem statement long enough to pass validation." }) {
    const draft = await post(admin.agent, admin.csrf, "/api/v1/admin/problems", {
      title,
      topic,
      statement,
      difficulty: "Easy",
    }).expect(201);
    await post(admin.agent, admin.csrf, `/api/v1/admin/problems/${draft.body.data.id}/publish`).expect(200);
    return draft.body.data;
  }

  it("1. correct evidence matches the correct problem and assignment (canonical slug & topic match)", async () => {
    const prob = await createPublishedProblem({ title: "Two Sum", topic: "Arrays" });
    const asgRes = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
      title: "Week 1 · Two Sum",
    }).expect(201);
    const asgId = asgRes.body.data.id;

    const commitSha = "a111111111111111111111111111111111111111";
    const path = `${aliceUser.folder}/Arrays/Two_Sum.cpp`;
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-1",
      payload: pushPayload(path, { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    assert.equal(String(sub.assignment), String(asgId));
    assert.equal(String(sub.student), String(aliceUser.id));
    assert.ok(sub.note.includes(`assignment=${asgId}`));
  });

  it("2. an unrelated topic does not match an assignment", async () => {
    // Problem is in Arrays
    const commitSha = "a222222222222222222222222222222222222222";
    // Student pushes under Strings instead of Arrays
    const path = `${aliceUser.folder}/Strings/Two_Sum.cpp`;
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-2",
      payload: pushPayload(path, { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    // Topic mismatch preserves evidence as unassigned for human review
    assert.equal(sub.assignment, null);
    assert.equal(String(sub.student), String(aliceUser.id));
    assert.ok(sub.note.includes("assignment=unassigned"));
  });

  it("3. a filename collision does not silently identify the wrong problem (e.g. Two Sum vs Two Sum II)", async () => {
    // Two Sum exists. Student submits Two Sum II.
    const commitSha = "a333333333333333333333333333333333333333";
    const path = `${aliceUser.folder}/Arrays/Two_Sum_II.cpp`;
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-3",
      payload: pushPayload(path, { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    // Distinct problem slug: must NOT falsely attach to Two Sum
    assert.equal(sub.assignment, null);
    assert.ok(sub.note.includes("assignment=unassigned"));
  });

  it("4. filename with no matching problem title remains unassigned", async () => {
    const commitSha = "a444444444444444444444444444444444444444";
    const path = `${aliceUser.folder}/Arrays/Completely_Unknown_Solution.cpp`;
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-4",
      payload: pushPayload(path, { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    assert.equal(sub.assignment, null);
  });

  it("5. ambiguous active assignments remain unresolved (multiple active assignments tie)", async () => {
    const prob = await createPublishedProblem({ title: "Binary Search", topic: "Searching" });
    // Create two identical active COMMON assignments for the exact same problem
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
      title: "Batch A · Binary Search",
    }).expect(201);
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
      title: "Batch B · Binary Search",
    }).expect(201);

    const matchRes = await matchAssignmentForEvidence({
      user: { _id: aliceUser.id },
      sp: { topic: "Searching", file: "Binary_Search.cpp" },
    });

    assert.equal(matchRes.assignment, null);
    assert.ok(matchRes.matchReason.includes("ambiguous_match"));
  });

  it("6. common assignments work correctly for all approved students", async () => {
    const prob = await createPublishedProblem({ title: "Reverse String", topic: "Strings" });
    const asgRes = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
      title: "Common Strings",
    }).expect(201);
    const asgId = asgRes.body.data.id;

    // Both Alice and Bob can view the common assignment
    const listA = await studentAlice.agent.get("/api/v1/assignments").expect(200);
    assert.ok(listA.body.data.some((a) => a.id === asgId));
    const listB = await studentBob.agent.get("/api/v1/assignments").expect(200);
    assert.ok(listB.body.data.some((a) => a.id === asgId));

    // Both Alice and Bob push evidence and are mapped independently
    const shaA = "a666666666666666666666666666666666666661";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-6a",
      payload: pushPayload(`${aliceUser.folder}/Strings/Reverse_String.cpp`, { commitId: shaA }),
    });
    const subA = await Submission.findOne({ commitSha: shaA }).lean();
    assert.equal(String(subA.student), String(aliceUser.id));
    assert.equal(String(subA.assignment), String(asgId));

    const shaB = "a666666666666666666666666666666666666662";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-6b",
      payload: pushPayload(`${bobUser.folder}/Strings/Reverse_String.cpp`, { commitId: shaB }),
    });
    const subB = await Submission.findOne({ commitSha: shaB }).lean();
    assert.equal(String(subB.student), String(bobUser.id));
    assert.equal(String(subB.assignment), String(asgId));
  });

  it("7. individual assignments do not leak across students", async () => {
    const prob = await createPublishedProblem({ title: "Valid Palindrome", topic: "Strings" });
    // Target Alice exclusively
    const asgRes = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "INDIVIDUAL",
      title: "Stretch Work for Alice",
      studentIds: [aliceUser.id],
    }).expect(201);
    const asgId = asgRes.body.data.id;

    // Bob cannot see it in his listing
    const bobList = await studentBob.agent.get("/api/v1/assignments").expect(200);
    assert.ok(!bobList.body.data.some((a) => a.id === asgId));

    // Bob cannot fetch it directly
    await studentBob.agent.get(`/api/v1/assignments/${asgId}`).expect(403);

    // If Bob pushes code for Valid Palindrome, it does NOT attach to Alice's assignment
    const bobSha = "a777777777777777777777777777777777777777";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-7-bob",
      payload: pushPayload(`${bobUser.folder}/Strings/Valid_Palindrome.cpp`, { commitId: bobSha }),
    });
    const bobSub = await Submission.findOne({ commitSha: bobSha }).lean();
    assert.ok(bobSub);
    assert.equal(bobSub.assignment, null, "Must not attach to Alice's individual assignment");
  });

  it("8. inactive/archived assignments cannot be matched as active", async () => {
    const prob = await createPublishedProblem({ title: "Climbing Stairs", topic: "Dynamic_Programming" });
    const asgRes = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
      title: "Archived Work",
    }).expect(201);
    const asgId = asgRes.body.data.id;

    // Admin archives the assignment
    await post(admin.agent, admin.csrf, `/api/v1/admin/assignments/${asgId}/archive`, {}).expect(200);

    const sha = "a888888888888888888888888888888888888888";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-8",
      payload: pushPayload(`${aliceUser.folder}/Dynamic_Programming/Climbing_Stairs.cpp`, { commitId: sha }),
    });

    const sub = await Submission.findOne({ commitSha: sha }).lean();
    assert.ok(sub);
    assert.equal(sub.assignment, null, "Archived assignment must not match");
  });

  it("9. invalid assignment and problem references are rejected", async () => {
    // Non-existent problemId
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: "000000000000000000000000",
      type: "COMMON",
    }).expect(404);

    // Non-existent studentId in individual assignment
    const prob = await createPublishedProblem({ title: "Dummy", topic: "General" });
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "INDIVIDUAL",
      studentIds: ["000000000000000000000000"],
    }).expect(400);
  });

  it("10. unassigned evidence persists without fake references", async () => {
    const sha = "b101010101010101010101010101010101010101";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-10",
      payload: pushPayload(`${aliceUser.folder}/Custom_Topic/Custom_Problem.cpp`, { commitId: sha }),
    });

    const sub = await Submission.findOne({ commitSha: sha }).lean();
    assert.ok(sub);
    assert.equal(sub.assignment, null);
    assert.equal(String(sub.student), String(aliceUser.id));
    assert.equal(sub.outcome, "NEEDS_REVIEW");
  });

  it("11. duplicate webhook deliveries do not create duplicate submissions (assigned and unassigned)", async () => {
    const sha = "b111111111111111111111111111111111111111";
    const path = `${aliceUser.folder}/Arrays/Two_Sum.cpp`;

    const res1 = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-dupe-11",
      payload: pushPayload(path, { commitId: sha }),
    });
    assert.equal(res1.status, "PROCESSED");

    const res2 = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-dupe-11",
      payload: pushPayload(path, { commitId: sha }),
    });
    assert.equal(res2.status, "PROCESSED");

    const count = await Submission.countDocuments({ commitSha: sha });
    assert.equal(count, 1, "Must deduplicate to exactly one submission");
  });

  it("12. retry processing does not duplicate submissions", async () => {
    const sha = "b121212121212121212121212121212121212121";
    const path = `${aliceUser.folder}/Arrays/Two_Sum.cpp`;

    // Process pass 1
    await processWebhookPayload({ cfg: t.cfg, deliveryId: "del-retry-1", payload: pushPayload(path, { commitId: sha }) });
    // Process pass 2
    await processWebhookPayload({ cfg: t.cfg, deliveryId: "del-retry-2", payload: pushPayload(path, { commitId: sha }) });

    const count = await Submission.countDocuments({ commitSha: sha });
    assert.equal(count, 1);
  });

  it("13. nullable assignment references are handled safely in reports, progress, and review queue", async () => {
    // Review queue lists unassigned submissions without crashing
    const queue = await admin.agent.get("/api/v1/admin/submissions/review-queue").expect(200);
    assert.ok(Array.isArray(queue.body.data));

    // Student report includes unassigned submissions with assignment: null
    const rep = await studentAlice.agent.get("/api/v1/progress/me").expect(200);
    assert.ok(Array.isArray(rep.body.data.submissions));
    const unassignedInReport = rep.body.data.submissions.find((s) => s.assignment === null);
    assert.ok(unassignedInReport !== undefined);
  });

  it("14. unresolved evidence cannot be accepted before required references are resolved", async () => {
    // 14a: Unresolved student identity (quarantined submission with student: null)
    const quarantinedSub = await Submission.create({
      repository: t.cfg.repo.fullName,
      commitSha: "b140000000000000000000000000000000000001",
      path: "unknown_folder/Topic/Problem.cpp",
      status: "quarantined",
      outcome: "NEEDS_REVIEW",
      eventType: "NEEDS_REVIEW",
      note: "unresolved_identity=unknown_folder",
    });

    const resStudent = await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${quarantinedSub._id}/reviews`, {
      decision: "accept",
    });
    assert.equal(resStudent.status, 400);
    assert.ok(resStudent.body.error.message.includes("Cannot accept submission with unresolved student identity"));

    // 14b: Ambiguous assignment match cannot be accepted before assignment is resolved
    const sha = "b141414141414141414141414141414141414141";
    const subAmbiguous = await Submission.create({
      student: aliceUser.id,
      repository: t.cfg.repo.fullName,
      commitSha: sha,
      path: `${aliceUser.folder}/Orphan/Orphan.cpp`,
      status: "observed",
      outcome: "NEEDS_REVIEW",
      eventType: "NEEDS_REVIEW",
      note: "ambiguous assignment match: candidates [asg_1, asg_2]",
    });

    // Attempting to accept directly fails because assignment relationship is ambiguous
    const resAsg = await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${subAmbiguous._id}/reviews`, {
      decision: "accept",
    });
    assert.equal(resAsg.status, 400);
    assert.ok(resAsg.body.error.message.includes("Cannot accept submission with ambiguous assignment matches"));

    // Link a valid assignment
    const prob = await createPublishedProblem({ title: "Linked Work", topic: "Orphan" });
    const asg = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
    }).expect(201);

    await patch(admin.agent, admin.csrf, `/api/v1/admin/submissions/${subAmbiguous._id}/assign-assignment`, {
      assignmentId: asg.body.data.id,
    }).expect(200);

    // Now accept succeeds
    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${subAmbiguous._id}/reviews`, {
      decision: "accept",
      comment: "Approved after assignment linking",
    }).expect(200);

    const verifiedSub = await Submission.findById(subAmbiguous._id).lean();
    assert.equal(verifiedSub.outcome, "VERIFIED");
  });

  it("15. only authorized admins can accept or reject submissions", async () => {
    const sub = await Submission.findOne({ outcome: "NEEDS_REVIEW" }).lean();
    assert.ok(sub);

    // Alice (student) tries to review
    await post(studentAlice.agent, studentAlice.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "accept",
    }).expect(403);
  });

  it("16. accepting a valid submission records correct review decision, audit, and target update", async () => {
    const prob = await createPublishedProblem({ title: "Invert Tree", topic: "Trees" });
    const asgRes = await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
    }).expect(201);
    const asgId = asgRes.body.data.id;

    const sha = "b161616161616161616161616161616161616161";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-16",
      payload: pushPayload(`${bobUser.folder}/Trees/Invert_Tree.cpp`, { commitId: sha }),
    });

    const sub = await Submission.findOne({ commitSha: sha });
    assert.ok(sub);

    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "accept",
      comment: "Clean solution and verified",
    }).expect(200);

    const updatedSub = await Submission.findById(sub._id).lean();
    assert.equal(updatedSub.outcome, "VERIFIED");
    assert.equal(updatedSub.eventType, "NEW_PROBLEM_VERIFIED");
    assert.ok(updatedSub.reviewedBy);
    assert.ok(updatedSub.reviewedAt);
    assert.equal(updatedSub.reviewComment, "Clean solution and verified");

    // ProgressEvent created
    const pe = await ProgressEvent.findOne({ sourceKey: `submission:${sub._id}` }).lean();
    assert.ok(pe);
    assert.equal(String(pe.student), String(bobUser.id));

    // Assignment target status updated
    const updatedAsg = await Assignment.findById(asgId).lean();
    const bobTarget = updatedAsg.targets.find((t) => String(t.student) === String(bobUser.id));
    assert.equal(bobTarget.completionStatus, "verified");
  });

  it("17. rejecting a submission does not award progress", async () => {
    const prob = await createPublishedProblem({ title: "Max Depth", topic: "Trees" });
    await post(admin.agent, admin.csrf, "/api/v1/admin/assignments", {
      problemId: prob.id,
      type: "COMMON",
    }).expect(201);

    const sha = "b171717171717171717171717171717171717171";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-asg-17",
      payload: pushPayload(`${bobUser.folder}/Trees/Max_Depth.cpp`, { commitId: sha }),
    });

    const sub = await Submission.findOne({ commitSha: sha });
    assert.ok(sub);

    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "sendback",
      comment: "Code is incomplete",
    }).expect(200);

    const updatedSub = await Submission.findById(sub._id).lean();
    assert.equal(updatedSub.outcome, "INCOMPLETE");
    assert.equal(updatedSub.eventType, "NO_QUALIFYING_CHANGE");

    // No ProgressEvent exists
    const pe = await ProgressEvent.findOne({ sourceKey: `submission:${sub._id}` }).lean();
    assert.equal(pe, null);
  });

  it("18. repeated acceptance cannot create duplicate progress events", async () => {
    const sub = await Submission.findOne({ outcome: "VERIFIED" }).lean();
    assert.ok(sub);

    // Attempting to review an already-verified submission fails
    const res = await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "accept",
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.message.includes("already VERIFIED"));

    const peCount = await ProgressEvent.countDocuments({ sourceKey: `submission:${sub._id}` });
    assert.equal(peCount, 1);
  });

  it("19. invalid review-state transitions do not partially mutate records", async () => {
    const sub = await Submission.findOne({ outcome: "INCOMPLETE" }).lean();
    assert.ok(sub);

    const res = await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "accept",
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.message.includes("already INCOMPLETE"));

    const pe = await ProgressEvent.findOne({ sourceKey: `submission:${sub._id}` }).lean();
    assert.equal(pe, null);
  });

  it("20. student reports exclude other students' private evidence", async () => {
    const repAlice = await studentAlice.agent.get("/api/v1/progress/me").expect(200);
    for (const sub of repAlice.body.data.submissions) {
      assert.equal(String(sub.student), String(aliceUser.id));
    }
  });

  it("21. leaderboard aggregation does not count unresolved or rejected evidence as verified progress", async () => {
    const lb = await computeLeaderboard(t.cfg);
    const bobEntry = lb.entries.find((e) => e.studentId === bobUser.studentId);
    assert.ok(bobEntry);

    // Count bob's verified progress events
    const verifiedCount = await ProgressEvent.countDocuments({
      student: bobUser.id,
      eventType: "NEW_PROBLEM_VERIFIED",
    });
    assert.equal(bobEntry.verifiedProblems, verifiedCount);
  });

  it("22. legacy invalid references are detected by reconciliation without deleting data", async () => {
    // Insert an inconsistent submission directly with non-existent student and non-existent assignment
    await Submission.collection.insertOne({
      student: new (await import("mongoose")).default.Types.ObjectId(),
      assignment: new (await import("mongoose")).default.Types.ObjectId(),
      commitSha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      path: "students/ghost/topic/ghost.cpp",
      status: "observed",
      outcome: "VERIFIED",
      eventType: "NEW_PROBLEM_VERIFIED",
      firstObservedAt: new Date(),
    });

    const report = await detectAssignmentInconsistencies();
    assert.equal(report.hasInconsistencies, true);
    assert.ok(report.summary.invalidStudentReferencesCount >= 1);
    assert.ok(report.summary.invalidAssignmentReferencesCount >= 1);

    const recon = await reconcileAssignments({ dryRun: false });
    assert.ok(recon.actions.some((a) => a.type === "DIAGNOSIS_WARNING"));

    // Verify historical submission was NOT deleted
    const count = await Submission.collection.countDocuments({ commitSha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
    assert.equal(count, 1);

    // Clean up test document
    await Submission.collection.deleteOne({ commitSha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
  });
});
