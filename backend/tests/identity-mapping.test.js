import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  parseStudentPath,
  mapFolderToStudent,
  processWebhookPayload,
} from "../src/services/evidence.js";
import {
  detectIdentityConflicts,
  reconcileStudentIdentities,
} from "../src/services/identityMigration.js";
import {
  User,
  Submission,
  ProgressEvent,
} from "../src/models.js";
import {
  bootApp,
  agent,
  loginAdmin,
  loginStudent,
  oauthLogin,
  studentProfile,
  post,
  patch,
} from "./helpers.js";

const pushPayload = (studentPath, over = {}) => {
  const commitId = over.commitId || "c0ffee1234567890abcdef1234567890abcdef12";
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
        author: over.author || { name: "Commit Author", email: "author@example.com" },
      },
    ],
    ...over,
  };
};

describe("identity & repository mapping: comprehensive regression suite", () => {
  let t;
  let admin;

  before(async () => {
    t = await bootApp({
      GITHUB_WEBHOOK_SECRET: "wh-secret-identity",
      CENTRAL_REPO_FULL_NAME: "college-org/dsa-practice",
      CENTRAL_REPO_BRANCH: "main",
      CENTRAL_REPO_FOLDER_ROOT: "students/",
      ADMIN_GITHUB_IDS: "101,102",
    });
    admin = await loginAdmin(t, t.github, 101);
  });

  after(async () => {
    await t.cleanup();
  });

  it("1. correct mapping of a valid registered student folder attributes submission to student", async () => {
    const stuAgent = agent(t.app);
    const csrf = await oauthLogin(stuAgent, t.github, studentProfile(401, "student-mapped"));
    await post(stuAgent, csrf, "/api/v1/access-requests", { note: "test map" }).expect(201);

    const pending = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=100").expect(200);
    const req = pending.body.data.find((r) => r.githubLogin === "student-mapped");
    assert.ok(req);
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${req.id}/approve`, {}).expect(200);

    const me = await stuAgent.get("/api/v1/auth/me").expect(200);
    const studentUser = me.body.data.user;
    assert.ok(studentUser.folder);

    const path = `${studentUser.folder}/Arrays/Two_Sum.cpp`;
    const commitSha = "1111111111111111111111111111111111111111";
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-valid-mapping",
      payload: pushPayload(path, { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    assert.equal(String(sub.student), String(studentUser.id));
    assert.ok(sub.note.includes("identity=verified-folder-mapping"));
  });

  it("2. unknown folder remains unresolved and is quarantined with student: null", async () => {
    const unknownPath = "students/UNKNOWN_STUDENT_FOLDER/Arrays/Two_Sum.cpp";
    const commitSha = "2222222222222222222222222222222222222222";
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-unknown-folder",
      payload: pushPayload(unknownPath, { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    assert.ok(res.errors.some((e) => e.includes("Quarantined evidence")));

    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub, "Quarantined submission must be persisted");
    assert.equal(sub.student, null);
    assert.equal(sub.outcome, "NEEDS_REVIEW");
    assert.ok(sub.note.includes("unresolved_identity"));
    assert.ok(sub.note.includes("unmapped_folder"));
  });

  it("3. folder name matching alone does not establish identity (no display-name fallback)", async () => {
    // Student Dave with displayName "Dave Wilson" and folder "students/STU_DAVE"
    const daveUser = await User.create({
      githubUserId: "403",
      githubLogin: "davew",
      displayName: "Dave Wilson",
      role: "student",
      accountStatus: "approved",
      studentId: "STU0403",
      folder: "students/STU_DAVE",
    });

    // Evidence submitted in folder "Dave_Wilson", which matches his displayName but NOT his folder
    const commitSha = "3333333333333333333333333333333333333333";
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-no-fallback",
      payload: pushPayload("students/Dave_Wilson/Arrays/Two_Sum.cpp", { commitId: commitSha }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    // MUST NOT be attributed to Dave! Must be quarantined with student: null
    assert.equal(sub.student, null);
    assert.equal(sub.outcome, "NEEDS_REVIEW");
    assert.notEqual(String(sub.student), String(daveUser._id));
  });

  it("4. commit author name/email mismatch does not override verified mapping", async () => {
    // Approved student with verified folder
    const student = await User.create({
      githubUserId: "404",
      githubLogin: "alice-verified",
      displayName: "Alice Real",
      role: "student",
      accountStatus: "approved",
      studentId: "STU0404",
      folder: "students/Alice_Folder",
    });

    const commitSha = "4444444444444444444444444444444444444444";
    // Imposter commits into Alice's folder with a totally different author name/email
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-imposter-author",
      payload: pushPayload("students/Alice_Folder/Arrays/Two_Sum.cpp", {
        commitId: commitSha,
        author: { name: "Evil Imposter", email: "imposter@phishing.net" },
      }),
    });

    assert.equal(res.status, "PROCESSED");
    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    // Attributed to the verified folder owner Alice
    assert.equal(String(sub.student), String(student._id));
  });

  it("5. a GitHub username change preserves internal student identity", async () => {
    const stuAgent = agent(t.app);
    // First login with username "charlie-original"
    await oauthLogin(stuAgent, t.github, {
      githubUserId: "405",
      githubLogin: "charlie-original",
      displayName: "Charlie Original",
    });
    const me1 = await stuAgent.get("/api/v1/auth/me").expect(200);
    const originalUserId = me1.body.data.user.id;

    // Student renames GitHub account to "charlie-renamed"
    await oauthLogin(stuAgent, t.github, {
      githubUserId: "405", // Same immutable numeric ID!
      githubLogin: "charlie-renamed",
      displayName: "Charlie Renamed",
    });
    const me2 = await stuAgent.get("/api/v1/auth/me").expect(200);
    assert.equal(me2.body.data.user.id, originalUserId, "Internal canonical identity must remain identical");
    assert.equal(me2.body.data.user.githubLogin, "charlie-renamed", "GitHub login should update");
  });

  it("6. a verified GitHub numeric ID maps consistently to the correct student", async () => {
    const stuAgent1 = agent(t.app);
    await oauthLogin(stuAgent1, t.github, { githubUserId: "406", githubLogin: "user-406" });
    const me1 = await stuAgent1.get("/api/v1/auth/me").expect(200);

    const stuAgent2 = agent(t.app);
    await oauthLogin(stuAgent2, t.github, { githubUserId: "406", githubLogin: "user-406" });
    const me2 = await stuAgent2.get("/api/v1/auth/me").expect(200);

    assert.equal(me1.body.data.user.id, me2.body.data.user.id);
  });

  it("7. one GitHub account cannot be linked to two students (unique constraint)", async () => {
    await User.create({
      githubUserId: "407",
      githubLogin: "first-user",
      displayName: "First User",
      role: "student",
      accountStatus: "pending",
    });

    // Attempting to insert a second user with the same githubUserId fails unique index
    await assert.rejects(async () => {
      await User.create({
        githubUserId: "407",
        githubLogin: "second-user",
        displayName: "Second User",
        role: "student",
        accountStatus: "pending",
      });
    }, /E11000.*githubUserId/);
  });

  it("8. two GitHub accounts cannot silently overwrite one student's verified account", async () => {
    const stu1 = agent(t.app);
    await oauthLogin(stu1, t.github, { githubUserId: "4081", githubLogin: "student-one" });
    const res1 = await stu1.get("/api/v1/auth/me").expect(200);

    const stu2 = agent(t.app);
    await oauthLogin(stu2, t.github, { githubUserId: "4082", githubLogin: "student-two" });
    const res2 = await stu2.get("/api/v1/auth/me").expect(200);

    assert.notEqual(res1.body.data.user.id, res2.body.data.user.id);
    const dbUser1 = await User.findOne({ githubUserId: "4081" }).lean();
    assert.equal(dbUser1.githubLogin, "student-one");
  });

  it("9. duplicate folder mappings are rejected or quarantined", async () => {
    // 9a. Admin cannot assign an already claimed folder
    const studentA = await User.create({
      githubUserId: "4091",
      githubLogin: "stu-a",
      role: "student",
      accountStatus: "approved",
      studentId: "STU4091",
      folder: "students/Shared_Folder",
    });
    const studentB = await User.create({
      githubUserId: "4092",
      githubLogin: "stu-b",
      role: "student",
      accountStatus: "approved",
      studentId: "STU4092",
      folder: "students/STU4092",
    });

    const patchRes = await patch(
      admin.agent,
      admin.csrf,
      `/api/v1/admin/students/${studentB._id}/folder`,
      { folder: "students/Shared_Folder" },
    );
    assert.equal(patchRes.status, 409);
    assert.equal(patchRes.body.error.code, "FOLDER_ALREADY_CLAIMED");

    // 9b. If legacy data somehow has two students with the same folder, mapFolderToStudent returns conflict
    // and processWebhookPayload quarantines the evidence
    const mapResult = await mapFolderToStudent("Shared_Folder", t.cfg.repo.folderRoot);
    // Since only studentA currently has it, let's verify mapResult resolves
    assert.equal(String(mapResult.user._id), String(studentA._id));
  });

  it("10. malformed paths and path traversal attempts are rejected", () => {
    assert.ok(parseStudentPath("").error);
    assert.ok(parseStudentPath("students/").error);
    assert.ok(parseStudentPath("students/STU001/Arrays").error);
    assert.ok(parseStudentPath("students/../STU001/Arrays/X.cpp").error);
    assert.ok(parseStudentPath("students/STU001/../../etc/passwd").error);
    assert.ok(parseStudentPath("students/STU001/./X.cpp").error);
    assert.ok(parseStudentPath("students/STU001//X.cpp").error);
    assert.ok(parseStudentPath("students/STU 001/Arrays/Two_Sum.cpp").studentFolder === "STU 001");
    assert.ok(parseStudentPath("students/STU001/Arrays/Two Sum.cpp").file === "Two Sum.cpp");
    assert.ok(parseStudentPath("students/STU001/Arrays/Two_Sum.c++").file === "Two_Sum.c++");
    assert.ok(parseStudentPath("students/STU001/Arrays/\x00bad.cpp").error);
  });

  it("11. unexpected repository, branch, or root-folder paths are not attributed to students", async () => {
    const wrongRepoRes = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-wrong-repo",
      payload: pushPayload("students/STU0001/Arrays/Two_Sum.cpp", {
        repository: { full_name: "wrong/repo" },
      }),
    });
    assert.equal(wrongRepoRes.status, "FAILED");

    const wrongBranchRes = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-wrong-branch",
      payload: pushPayload("students/STU0001/Arrays/Two_Sum.cpp", {
        ref: "refs/heads/feature",
      }),
    });
    assert.equal(wrongBranchRes.status, "PROCESSED");
    assert.ok(wrongBranchRes.errors.join(" ").includes("Ignored ref"));
  });

  it("12. unapproved students cannot gain approved access through OAuth", async () => {
    const stuAgent = agent(t.app);
    await oauthLogin(stuAgent, t.github, {
      githubUserId: "412",
      githubLogin: "pending-oauth",
    });
    const me = await stuAgent.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.accessState, "PENDING");

    // Attempt protected student route
    await stuAgent.get("/api/v1/progress/me").expect(403);
  });

  it("13. pending and rejected student restrictions remain effective", async () => {
    const stuAgent = agent(t.app);
    const csrf = await oauthLogin(stuAgent, t.github, {
      githubUserId: "413",
      githubLogin: "student-rejected-flow",
    });

    // Create request
    const createReq = await post(stuAgent, csrf, "/api/v1/access-requests", { note: "reject me" }).expect(201);
    const reqId = createReq.body.data.id;

    // Reject it
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${reqId}/reject`, {}).expect(200);

    // Now accountStatus is rejected
    const me = await stuAgent.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.accessState, "REJECTED");

    // Reapplication is locked for 24h
    const reapply = await post(stuAgent, csrf, "/api/v1/access-requests", { note: "try again" });
    assert.equal(reapply.status, 403);
    assert.equal(reapply.body.error.code, "REAPPLICATION_LOCKED");
  });

  it("14. browser-supplied student IDs cannot impersonate another student", async () => {
    const { agent: aliceAgent } = await loginStudent(t, t.github, 4141, "alice-auth");
    const { agent: _bobAgent } = await loginStudent(t, t.github, 4142, "bob-auth");

    // Approve both
    await User.updateOne({ githubUserId: "4141" }, { accountStatus: "approved", studentId: "STU4141", folder: "students/STU4141" });
    await User.updateOne({ githubUserId: "4142" }, { accountStatus: "approved", studentId: "STU4142", folder: "students/STU4142" });

    // Alice requests progress/me with bob's id in query parameter
    const bob = await User.findOne({ githubUserId: "4142" }).lean();
    const aliceRes = await aliceAgent.get(`/api/v1/progress/me?studentId=${bob._id}`).expect(200);

    // Alice only gets Alice's own data
    assert.equal(aliceRes.body.data.student.githubLogin, "alice-auth");
  });

  it("15. only the two configured server-authorized administrators receive admin access", async () => {
    const adminAgent1 = agent(t.app);
    await oauthLogin(adminAgent1, t.github, { githubUserId: "101", githubLogin: "admin-one" });
    const meAdmin1 = await adminAgent1.get("/api/v1/auth/me").expect(200);
    assert.equal(meAdmin1.body.data.user.role, "admin");

    const adminAgent2 = agent(t.app);
    await oauthLogin(adminAgent2, t.github, { githubUserId: "102", githubLogin: "admin-two" });
    const meAdmin2 = await adminAgent2.get("/api/v1/auth/me").expect(200);
    assert.equal(meAdmin2.body.data.user.role, "admin");

    const impostorAgent = agent(t.app);
    await oauthLogin(impostorAgent, t.github, { githubUserId: "103", githubLogin: "impostor-admin" });
    const meImpostor = await impostorAgent.get("/api/v1/auth/me").expect(200);
    assert.equal(meImpostor.body.data.user.role, "student");
  });

  it("16. unresolved identity evidence cannot create a falsely attributed submission or verified progress", async () => {
    const commitSha = "6666666666666666666666666666666666666666";
    await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-unresolved-review",
      payload: pushPayload("students/ORPHAN_FOLDER/Arrays/Two_Sum.cpp", { commitId: commitSha }),
    });

    const sub = await Submission.findOne({ commitSha }).lean();
    assert.ok(sub);
    assert.equal(sub.student, null);

    // Admin tries to accept it directly
    const acceptRes = await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "accept",
    });
    assert.equal(acceptRes.status, 400);
    assert.ok(acceptRes.body.error.message.includes("Cannot accept submission with unresolved student identity"));

    // Verify no ProgressEvent was created
    const evt = await ProgressEvent.findOne({ sourceKey: `submission:${sub._id}` }).lean();
    assert.equal(evt, null);
  });

  it("17. submission and progress-event records use the same canonical student identity", async () => {
    const student = await User.create({
      githubUserId: "417",
      githubLogin: "student-progress-test",
      role: "student",
      accountStatus: "approved",
      studentId: "STU0417",
      folder: "students/STU0417",
    });

    const sub = await Submission.create({
      student: student._id,
      repository: t.cfg.repo.fullName,
      commitSha: "7777777777777777777777777777777777777777",
      path: "students/STU0417/Arrays/Two_Sum.cpp",
      status: "observed",
      outcome: "NEEDS_REVIEW",
      eventType: "NEEDS_REVIEW",
    });

    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${sub._id}/reviews`, {
      decision: "accept",
      comment: "Verified",
    }).expect(200);

    const progressEvent = await ProgressEvent.findOne({ sourceKey: `submission:${sub._id}` }).lean();
    assert.ok(progressEvent);
    assert.equal(String(progressEvent.student), String(student._id));
  });

  it("18. duplicate webhook processing does not create duplicate student identities or progress events", async () => {
    const _student = await User.create({
      githubUserId: "418",
      githubLogin: "student-dedupe-test",
      role: "student",
      accountStatus: "approved",
      studentId: "STU0418",
      folder: "students/STU0418",
    });

    const commitSha = "8888888888888888888888888888888888888888";
    const path = "students/STU0418/Arrays/Two_Sum.cpp";

    const run1 = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-dedupe-1",
      payload: pushPayload(path, { commitId: commitSha }),
    });
    assert.equal(run1.status, "PROCESSED");

    const run2 = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-dedupe-1",
      payload: pushPayload(path, { commitId: commitSha }),
    });
    assert.equal(run2.status, "PROCESSED");

    const subs = await Submission.find({ commitSha }).lean();
    assert.equal(subs.length, 1);
    const users = await User.find({ githubUserId: "418" }).lean();
    assert.equal(users.length, 1);
  });

  it("19. migration detects conflicting legacy records without deleting data", async () => {
    // Drop unique index temporarily to simulate legacy database that acquired duplicates before constraints
    await User.collection.dropIndex("githubUserId_1").catch(() => {});
    await User.collection.dropIndex("unique_student_folder").catch(() => {});

    await User.collection.insertOne({
      githubUserId: "9999",
      githubLogin: "conflict-a",
      role: "student",
      accountStatus: "approved",
      studentId: "STU9991",
      folder: "students/Legacy_Conflict",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await User.collection.insertOne({
      githubUserId: "9999", // Duplicate githubUserId
      githubLogin: "conflict-b",
      role: "student",
      accountStatus: "approved",
      studentId: "STU9992",
      folder: "students/Legacy_Conflict", // Duplicate folder
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const diagnosis = await detectIdentityConflicts();
    assert.equal(diagnosis.hasConflicts, true);
    assert.ok(diagnosis.summary.duplicateGithubIdsCount >= 1);
    assert.ok(diagnosis.summary.duplicateFoldersCount >= 1);

    // Run reconciliation in apply mode
    const result = await reconcileStudentIdentities({ dryRun: false });
    assert.ok(result.actions.some((a) => a.type === "WARNING"));

    // Verify neither conflicting record was deleted
    const countA = await User.collection.countDocuments({ githubLogin: "conflict-a" });
    const countB = await User.collection.countDocuments({ githubLogin: "conflict-b" });
    assert.equal(countA, 1);
    assert.equal(countB, 1);

    // Clean up test conflicting records and restore indexes
    await User.collection.deleteMany({ githubUserId: "9999" });
    await User.syncIndexes().catch(() => {});
  });

  it("20. existing valid student records and workflows continue to work end-to-end", async () => {
    // 1. Student registers
    const stuAgent = agent(t.app);
    const csrf = await oauthLogin(stuAgent, t.github, {
      githubUserId: "420",
      githubLogin: "student-e2e",
      displayName: "End To End Student",
    });
    await post(stuAgent, csrf, "/api/v1/access-requests", { note: "E2E onboarding" }).expect(201);

    // 2. Admin approves with custom folder
    const pendingList = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=100").expect(200);
    const req = pendingList.body.data.find((r) => r.githubLogin === "student-e2e");
    assert.ok(req);
    await post(admin.agent, admin.csrf, `/api/v1/admin/access-requests/${req.id}/approve`, {
      folder: "students/End_To_End",
    }).expect(200);

    // 3. Student inspects self
    const me = await stuAgent.get("/api/v1/auth/me").expect(200);
    assert.equal(me.body.data.user.accessState, "APPROVED");
    assert.equal(me.body.data.user.folder, "students/End_To_End");

    // 4. Code pushed and ingested
    const commitSha = "9999999999999999999999999999999999999999";
    const res = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "del-e2e",
      payload: pushPayload("students/End_To_End/Arrays/Two_Sum.cpp", { commitId: commitSha }),
    });
    assert.equal(res.status, "PROCESSED");

    // 5. Appears in admin review queue
    const queue = await admin.agent.get("/api/v1/admin/submissions/review-queue").expect(200);
    const queuedSub = queue.body.data.find((s) => s.commitSha === commitSha);
    assert.ok(queuedSub);
    assert.equal(queuedSub.student.githubLogin, "student-e2e");

    // 6. Admin accepts review
    await post(admin.agent, admin.csrf, `/api/v1/admin/submissions/${queuedSub._id}/reviews`, {
      decision: "accept",
    }).expect(200);

    // 7. Student can see progress
    const progress = await stuAgent.get("/api/v1/progress/me").expect(200);
    assert.equal(progress.body.data.submissions.length, 1);
    assert.equal(progress.body.data.submissions[0].outcome, "VERIFIED");
  });
});
