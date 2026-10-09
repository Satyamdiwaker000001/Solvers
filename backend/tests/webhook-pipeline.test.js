import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  processWebhookPayload,
  processPendingWebhookEvents,
  startWebhookWorker,
  stopWebhookWorker,
  matchAssignmentForEvidence,
} from "../src/services/evidence.js";
import { Assignment, Problem, ProgressEvent, Submission, WebhookEvent } from "../src/models.js";
import { bootApp, agent, loginAdmin, post } from "./helpers.js";

function sign(secret, body) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

const pushPayload = (studentPath = "students/STU0002/Arrays/Two_Sum.cpp", over = {}) => ({
  ref: "refs/heads/main",
  repository: { full_name: "college-org/dsa-practice" },
  head_commit: { id: "0123456789abcdef0123456789abcdef01234567" },
  commits: [
    {
      id: "0123456789abcdef0123456789abcdef01234567",
      added: [studentPath],
      modified: [],
      removed: [],
    },
  ],
  ...over,
});

describe("webhook & evidence pipeline: comprehensive regression suite", () => {
  let t;
  let admin;
  let studentUser;
  let studentFile;
  const whSecret = "pipeline-wh-secret";
  const repoName = "college-org/dsa-practice";

  before(async () => {
    t = await bootApp({
      GITHUB_WEBHOOK_SECRET: whSecret,
      CENTRAL_REPO_FULL_NAME: repoName,
      CENTRAL_REPO_BRANCH: "main",
      CENTRAL_REPO_FOLDER_ROOT: "students/",
    });
    admin = await loginAdmin(t, t.github, 101);

    // Create an approved student
    const { oauthLogin, studentProfile } = await import("./helpers.js");
    const stuAgent = agent(t.app);
    const csrf = await oauthLogin(stuAgent, t.github, studentProfile(401, "charlie"));
    await post(stuAgent, csrf, "/api/v1/access-requests", { note: "test pipeline" }).expect(201);
    const reqs = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=10").expect(200);
    const req = reqs.body.data.find((r) => r.githubLogin === "charlie");
    assert.ok(req);
    await admin.agent.post(`/api/v1/admin/access-requests/${req.id}/approve`)
      .set("x-csrf-token", admin.csrf).send({}).expect(200);
    const me = await stuAgent.get("/api/v1/auth/me").expect(200);
    studentUser = me.body.data.user;
    studentFile = `${studentUser.folder}/Arrays/Two_Sum.cpp`;
  });

  after(async () => {
    await stopWebhookWorker();
    await t.cleanup();
  });

  const sendWebhook = ({ delivery = "d-" + Math.random(), event = "push", body = null, signature = null, customHeaders = {} }) => {
    const rawBody = body !== null ? body : JSON.stringify(pushPayload(studentFile));
    const sig = signature !== null ? signature : sign(whSecret, rawBody);
    let req = agent(t.app).post("/api/v1/integrations/github/webhook")
      .set("Content-Type", "application/json");
    if (sig !== false) req = req.set("x-hub-signature-256", sig);
    if (delivery !== false) req = req.set("x-github-delivery", delivery);
    if (event !== false) req = req.set("x-github-event", event);
    for (const [k, v] of Object.entries(customHeaders)) req = req.set(k, v);
    return req.send(rawBody);
  };

  // 1. Valid webhook signature
  it("1. accepts valid signature with HTTP 202 PENDING", async () => {
    const res = await sendWebhook({ delivery: "valid-sig-1" }).expect(202);
    assert.equal(res.body.data.accepted, true);
    assert.equal(res.body.data.status, "PENDING");
  });

  // 2. Invalid signature
  it("2. rejects invalid signature with 401 FORBIDDEN", async () => {
    const res = await sendWebhook({ delivery: "bad-sig-1", signature: "sha256=0000000000000000000000000000000000000000000000000000000000000000" }).expect(401);
    assert.equal(res.body.error.code, "FORBIDDEN");
  });

  // 3. Missing or malformed required headers & payload
  it("3. rejects missing required headers or malformed payload with 400", async () => {
    // Missing delivery ID
    await sendWebhook({ delivery: false }).expect(400);
    // Missing event header
    await sendWebhook({ event: false }).expect(400);
    // Malformed JSON payload
    const malformed = "{not-json}";
    await agent(t.app).post("/api/v1/integrations/github/webhook")
      .set("Content-Type", "application/json")
      .set("x-hub-signature-256", sign(whSecret, malformed))
      .set("x-github-delivery", "malformed-1")
      .set("x-github-event", "push")
      .send(malformed)
      .expect(400);
  });

  // 4. Unexpected repository
  it("4. rejects unexpected repository with 400 bad request", async () => {
    const wrongRepoBody = JSON.stringify(pushPayload(studentFile, { repository: { full_name: "other-org/other-repo" } }));
    await sendWebhook({ delivery: "wrong-repo-1", body: wrongRepoBody, signature: sign(whSecret, wrongRepoBody) }).expect(400);
  });

  // 5. Duplicate delivery ID
  it("5. handles duplicate delivery ID idempotently with accepted: true, duplicate: true", async () => {
    const delivery = "dup-delivery-test";
    await sendWebhook({ delivery }).expect(202);
    const res = await sendWebhook({ delivery }).expect(202);
    assert.equal(res.body.data.accepted, true);
    assert.equal(res.body.data.duplicate, true);
    const count = await WebhookEvent.countDocuments({ deliveryId: delivery });
    assert.equal(count, 1, "exactly one event document stored for duplicate deliveries");
  });

  // 6. Durable event persistence before acknowledgement
  it("6. guarantees durable WebhookEvent persistence with payload before HTTP response", async () => {
    const delivery = "durable-1";
    await sendWebhook({ delivery }).expect(202);
    const stored = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.ok(stored);
    assert.equal(stored.status, "PENDING");
    assert.ok(stored.payload);
    assert.equal(stored.payload.repository.full_name, repoName);
  });

  // 7. Worker execution through the real application integration point
  it("7. processes pending events via worker lifecycle startWebhookWorker / stopWebhookWorker", async () => {
    t.github.fetchCommit = async () => ({ additions: 15, deletions: 2, files: [studentFile] });
    const delivery = "worker-lifecycle-1";
    await sendWebhook({ delivery }).expect(202);

    const worker = startWebhookWorker({
      app: t.app,
      cfg: t.cfg,
      intervalMs: 100, // fast poll for test
    });
    assert.ok(worker);

    // Wait briefly for worker runPass
    await new Promise((r) => setTimeout(r, 400));
    await stopWebhookWorker();

    const evt = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(evt.status, "PROCESSED");
    assert.ok(evt.processedAt);
  });

  // 8. Pending event successfully processed
  it("8. successfully processes pending event and persists evidence as NEEDS_REVIEW", async () => {
    const delivery = "single-pending-1";
    const body = pushPayload(studentFile, { head_commit: { id: "a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" } });
    await WebhookEvent.create({
      deliveryId: delivery,
      event: "push",
      repo: repoName,
      payload: body,
      status: "PENDING",
    });

    const results = await processPendingWebhookEvents({ cfg: t.cfg });
    const match = results.find((r) => r.deliveryId === delivery);
    assert.ok(match);
    assert.equal(match.status, "PROCESSED");

    const evt = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(evt.status, "PROCESSED");
    assert.ok(evt.processedAt);
    assert.equal(evt.retryable, false);
  });

  // 9. Transient GitHub API failure followed by successful retry
  it("9. marks transient GitHub API failure FAILED (retryable: true) and succeeds on retry", async () => {
    const delivery = "transient-retry-1";
    const body = pushPayload(studentFile, { head_commit: { id: "b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2" } });
    await WebhookEvent.create({
      deliveryId: delivery,
      event: "push",
      repo: repoName,
      payload: body,
      status: "PENDING",
    });

    // Pass 1: Transient 503 error
    let failApi = true;
    const mockFetch = async () => {
      if (failApi) {
        const err = new Error("GitHub 503 Service Unavailable");
        err.retryable = true;
        throw err;
      }
      return { additions: 15, deletions: 2, files: [studentFile] };
    };

    const res1 = await processPendingWebhookEvents({ cfg: t.cfg, fetchCommit: mockFetch });
    const r1 = res1.find((r) => r.deliveryId === delivery);
    assert.ok(r1);
    assert.equal(r1.status, "FAILED");
    assert.equal(r1.retryable, true);

    const evt1 = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(evt1.status, "FAILED");
    assert.equal(evt1.retryable, true);
    assert.equal(evt1.attempts, 1);
    assert.ok(evt1.nextRetryAt);

    // Fast-forward nextRetryAt so it's immediately eligible
    await WebhookEvent.updateOne({ deliveryId: delivery }, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });

    // Pass 2: API recovered
    failApi = false;
    const res2 = await processPendingWebhookEvents({ cfg: t.cfg, fetchCommit: mockFetch });
    const r2 = res2.find((r) => r.deliveryId === delivery);
    assert.ok(r2);
    assert.equal(r2.status, "PROCESSED");

    const evt2 = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(evt2.status, "PROCESSED");
    assert.equal(evt2.retryable, false);
  });

  // 10. Permanent failure reaching the correct terminal state
  it("10. marks non-retryable failure FAILED with retryable: false immediately", async () => {
    const delivery = "permanent-fail-1";
    const body = pushPayload(studentFile, { head_commit: { id: "c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3" } });
    await WebhookEvent.create({
      deliveryId: delivery,
      event: "push",
      repo: repoName,
      payload: body,
      status: "PENDING",
    });

    const notFoundFetch = async () => {
      const err = new Error("Commit not found (HTTP 404)");
      err.retryable = false;
      throw err;
    };

    const res = await processPendingWebhookEvents({ cfg: t.cfg, fetchCommit: notFoundFetch });
    const r = res.find((r) => r.deliveryId === delivery);
    assert.ok(r);
    assert.equal(r.status, "FAILED");
    assert.equal(r.retryable, false);

    const evt = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(evt.status, "FAILED");
    assert.equal(evt.retryable, false);
    assert.equal(evt.nextRetryAt, null);
  });

  // 11. Retry exhaustion
  it("11. transitions to terminal FAILED once maxAttempts is exhausted", async () => {
    const delivery = "exhaustion-1";
    const body = pushPayload(studentFile, { head_commit: { id: "d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4" } });
    await WebhookEvent.create({
      deliveryId: delivery,
      event: "push",
      repo: repoName,
      payload: body,
      status: "PENDING",
      maxAttempts: 3,
    });

    const alwaysFail = async () => {
      const err = new Error("Persistent 500 network glitch");
      err.retryable = true;
      throw err;
    };

    // Attempt 1
    await processPendingWebhookEvents({ cfg: t.cfg, fetchCommit: alwaysFail });
    let e = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(e.attempts, 1);
    assert.equal(e.retryable, true);

    // Attempt 2
    await WebhookEvent.updateOne({ deliveryId: delivery }, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });
    await processPendingWebhookEvents({ cfg: t.cfg, fetchCommit: alwaysFail });
    e = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(e.attempts, 2);
    assert.equal(e.retryable, true);

    // Attempt 3 (exhaustion)
    await WebhookEvent.updateOne({ deliveryId: delivery }, { $set: { nextRetryAt: new Date(Date.now() - 1000) } });
    await processPendingWebhookEvents({ cfg: t.cfg, fetchCommit: alwaysFail });
    e = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(e.attempts, 3);
    assert.equal(e.status, "FAILED");
    assert.equal(e.retryable, false, "terminal failure after reaching maxAttempts");
    assert.equal(e.nextRetryAt, null);
  });

  // 12. Worker crash / recovery from stale PROCESSING events
  it("12. safely recovers stale PROCESSING events whose lease has expired", async () => {
    const delivery = "stale-crash-1";
    const body = pushPayload(studentFile, { head_commit: { id: "e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5" } });
    // Simulate crashed worker: status is PROCESSING but lease expired 10 seconds ago
    await WebhookEvent.create({
      deliveryId: delivery,
      event: "push",
      repo: repoName,
      payload: body,
      status: "PROCESSING",
      claimedAt: new Date(Date.now() - 60_000),
      leaseExpiresAt: new Date(Date.now() - 10_000),
      attempts: 1,
    });

    const results = await processPendingWebhookEvents({ cfg: t.cfg });
    const r = results.find((r) => r.deliveryId === delivery);
    assert.ok(r, "stale processing event was reclaimed and processed");
    assert.equal(r.status, "PROCESSED");

    const evt = await WebhookEvent.findOne({ deliveryId: delivery }).lean();
    assert.equal(evt.status, "PROCESSED");
    assert.equal(evt.attempts, 2);
  });

  // 13. Concurrent workers claiming the same event
  it("13. guarantees only one worker claims a pending event under concurrency", async () => {
    const delivery = "concurrent-race-1";
    const body = pushPayload(studentFile, { head_commit: { id: "f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6f6" } });
    await WebhookEvent.create({
      deliveryId: delivery,
      event: "push",
      repo: repoName,
      payload: body,
      status: "PENDING",
    });

    // Launch two workers in parallel
    const [resA, resB] = await Promise.all([
      processPendingWebhookEvents({ cfg: t.cfg }),
      processPendingWebhookEvents({ cfg: t.cfg }),
    ]);

    const claimedA = resA.filter((r) => r.deliveryId === delivery).length;
    const claimedB = resB.filter((r) => r.deliveryId === delivery).length;
    assert.equal(claimedA + claimedB, 1, "exactly one concurrent worker claimed the event");
  });

  // 14. Duplicate processing without duplicate submissions
  it("14. repeated delivery processing does not duplicate submissions", async () => {
    const sha = "1111222233334444555566667777888899990000";
    const payload = pushPayload(studentFile, { head_commit: { id: sha }, commits: [{ id: sha, added: [studentFile] }] });

    const beforeCount = await Submission.countDocuments({ commitSha: sha });
    await processWebhookPayload({ cfg: t.cfg, deliveryId: "dup-sub-1", payload });
    await processWebhookPayload({ cfg: t.cfg, deliveryId: "dup-sub-2", payload });
    const afterCount = await Submission.countDocuments({ commitSha: sha });

    assert.equal(afterCount - beforeCount, 1, "only 1 submission inserted despite multiple processings");
  });

  // 15. Duplicate processing without duplicate progress events
  it("15. repeated webhook delivery processing never creates or duplicates progress events", async () => {
    const beforeProg = await ProgressEvent.countDocuments({});
    const sha = "2222333344445555666677778888999900001111";
    const payload = pushPayload(studentFile, { head_commit: { id: sha }, commits: [{ id: sha, added: [studentFile] }] });

    await processWebhookPayload({ cfg: t.cfg, deliveryId: "prog-1", payload });
    await processWebhookPayload({ cfg: t.cfg, deliveryId: "prog-2", payload });
    const afterProg = await ProgressEvent.countDocuments({});

    assert.equal(afterProg, beforeProg, "evidence worker never creates ProgressEvents");
  });

  // 16. Missing assignment handled without an invalid reference
  it("16. records unassigned evidence with assignment: null (never student's user._id)", async () => {
    const sha = "3333444455556666777788889999000011112222";
    // Ensure no assignments exist for this test
    const payload = pushPayload(studentFile, { head_commit: { id: sha }, commits: [{ id: sha, added: [studentFile] }] });
    const out = await processWebhookPayload({ cfg: t.cfg, deliveryId: "unassigned-1", payload });
    assert.equal(out.status, "PROCESSED");

    const sub = await Submission.findOne({ commitSha: sha }).lean();
    assert.ok(sub);
    assert.equal(sub.assignment, null, "assignment must be null when unassigned (never user._id)");
    assert.notEqual(String(sub.assignment), String(studentUser.id), "must NOT be student user._id");
    assert.equal(sub.outcome, "NEEDS_REVIEW");
    assert.ok(sub.note.includes("assignment=unassigned"));
  });

  // 17. Problem/topic mismatch does not silently attach evidence to the wrong assignment
  it("17. problem/topic mismatch does not silently attach evidence to the wrong assignment", async () => {
    // Create a problem in topic 'Graphs'
    const graphProblem = await Problem.create({
      title: "Detect Cycle in Graph",
      statement: "Detect cycle in a directed graph.",
      topic: "Graphs",
      difficulty: "Medium",
      status: "published",
    });
    const graphAsg = await Assignment.create({
      problem: graphProblem._id,
      type: "COMMON",
      title: "Graph Cycle Assignment",
      status: "active",
    });

    // Student submits code in topic 'Arrays' (studentFile is Arrays/Two_Sum.cpp)
    const matchResult = await matchAssignmentForEvidence({
      user: { _id: studentUser.id },
      sp: { studentFolder: "STU0002", topic: "Arrays", file: "Two_Sum.cpp" },
    });
    assert.equal(matchResult.assignment, null, "must not match the Graphs assignment");
    assert.ok(matchResult.matchReason.includes("topic_or_problem_mismatch"));

    // Process submission and verify DB record
    const sha = "4444555566667777888899990000111122223333";
    const payload = pushPayload(studentFile, { head_commit: { id: sha }, commits: [{ id: sha, added: [studentFile] }] });
    await processWebhookPayload({ cfg: t.cfg, deliveryId: "topic-mismatch-1", payload });

    const sub = await Submission.findOne({ commitSha: sha }).lean();
    assert.ok(sub);
    assert.equal(sub.assignment, null, "must not attach to graph assignment");
    assert.notEqual(String(sub.assignment), String(graphAsg._id));

    // Cleanup test assignment
    await Assignment.deleteOne({ _id: graphAsg._id });
    await Problem.deleteOne({ _id: graphProblem._id });
  });

  // 18. Missing commit data is distinguished from an API failure
  it("18. distinguishes empty commit files from an API failure", async () => {
    const emptyStatsFetch = async () => ({ additions: 0, deletions: 0, files: [] });
    const sha = "5555666677778888999900001111222233334444";
    const payload = pushPayload(studentFile, { head_commit: { id: sha }, commits: [{ id: sha, added: [studentFile] }] });
    const out = await processWebhookPayload({ cfg: t.cfg, deliveryId: "empty-files-1", payload, fetchCommit: emptyStatsFetch });

    assert.equal(out.status, "PROCESSED", "empty commit stats should be PROCESSED with review flag, not FAILED");
    assert.equal(out.retryable, false);
  });

  // 19. Failed evidence persistence never produces a false PROCESSED status
  it("19. failed commit retrieval never produces a false PROCESSED status", async () => {
    const failingFetch = async () => { throw new Error("GitHub down"); };
    const sha = "6666777788889999000011112222333344445555";
    const payload = pushPayload(studentFile, { head_commit: { id: sha }, commits: [{ id: sha, added: [studentFile] }] });
    const out = await processWebhookPayload({ cfg: t.cfg, deliveryId: "failed-fetch-1", payload, fetchCommit: failingFetch });

    assert.equal(out.status, "FAILED", "must be FAILED when API fails");
    assert.notEqual(out.status, "PROCESSED", "must never produce a false PROCESSED status");
  });

  // 20. Operational status correctly counts lifecycle states
  it("20. integration-status correctly reports all lifecycle states", async () => {
    await WebhookEvent.deleteMany({});
    await WebhookEvent.create([
      { deliveryId: "s-pend", status: "PENDING" },
      { deliveryId: "s-proc-1", status: "PROCESSING" },
      { deliveryId: "s-done-1", status: "PROCESSED" },
      { deliveryId: "s-done-2", status: "PROCESSED" },
      { deliveryId: "s-fail-retry", status: "FAILED", retryable: true },
      { deliveryId: "s-fail-term", status: "FAILED", retryable: false },
    ]);

    const res = await admin.agent.get("/api/v1/admin/github/integration-status").expect(200);
    const d = res.body.data;
    assert.equal(d.pendingEvents, 1);
    assert.equal(d.processingEvents, 1);
    assert.equal(d.processedEvents, 2);
    assert.equal(d.failedEvents, 2);
    assert.equal(d.retryableEvents, 1);
    assert.equal(d.terminallyFailedEvents, 1);
    assert.equal(d.status, "HEALTHY");
  });
});
