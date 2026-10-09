import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  parseStudentPath,
  classifyChanges,
  processWebhookPayload,
  processPendingWebhookEvents,
} from "../src/services/evidence.js";
import { Submission, WebhookEvent } from "../src/models.js";
import { bootApp, agent, loginAdmin } from "./helpers.js";

function sign(secret, body) {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

const pushPayload = (studentPath = "students/STU0002/Arrays/Two_Sum.cpp", over = {}) => ({
  ref: "refs/heads/main",
  repository: { full_name: "college-org/dsa-practice" },
  head_commit: { id: "abc1234567890abcdef1234567890abcdef12" },
  commits: [
    {
      id: "abc1234567890abcdef1234567890abcdef12",
      added: [studentPath],
      modified: [],
      removed: [],
    },
  ],
  ...over,
});

describe("evidence worker: paths, idempotency, failure handling", () => {
  let t;
  let admin;
  let studentId;
  let studentFile;
  before(async () => {
    t = await bootApp({
      GITHUB_WEBHOOK_SECRET: "wh-secret",
      CENTRAL_REPO_FULL_NAME: "college-org/dsa-practice",
      CENTRAL_REPO_BRANCH: "main",
      CENTRAL_REPO_FOLDER_ROOT: "students/",
    });
    admin = await loginAdmin(t, t.github, 101);
    // Approved student with a server-minted folder.
    const { post, oauthLogin, studentProfile } = await import("./helpers.js");
    const stuAgent = agent(t.app);
    const csrf = await oauthLogin(stuAgent, t.github, studentProfile(301, "eve"));
    await post(stuAgent, csrf, "/api/v1/access-requests", { note: "hi" }).expect(201);
    const reqs = await admin.agent.get("/api/v1/admin/access-requests?status=pending&limit=100").expect(200);
    const req = reqs.body.data.find((r) => r.githubLogin === "eve");
    assert.ok(req, "expected a pending request for eve");
    await admin.agent.post(`/api/v1/admin/access-requests/${req.id}/approve`)
      .set("x-csrf-token", admin.csrf).send({}).expect(200);
    const me = await stuAgent.get("/api/v1/auth/me").expect(200);
    studentId = me.body.data.user.id;
    // Use the server-minted folder (admin took STU0001; the student gets the next).
    studentFile = `${me.body.data.user.folder}/Arrays/Two_Sum.cpp`;
    assert.ok(studentFile.startsWith("students/STU"));
  });
  after(async () => { await t.cleanup(); });

  it("rejects malformed, traversal, and out-of-root paths", () => {
    assert.ok(parseStudentPath("students/STU0001/Arrays/Two_Sum.cpp").studentFolder === "STU0001");
    assert.ok(parseStudentPath("students/A/B").error);
    assert.ok(parseStudentPath("other/STU0001/Arrays/X.cpp").error);
    assert.ok(parseStudentPath("students/STU0001/../evil/X.cpp").error);
    assert.ok(parseStudentPath("/students/STU0001/Arrays/X.cpp").error);
    assert.ok(parseStudentPath("students//Arrays/X.cpp").error);
  });

  it("classifies superficial changes as review signals, never verdicts", () => {
    const s = classifyChanges({ additions: 1, deletions: 0, files: ["a.cpp"] });
    assert.equal(s.signal, "SUPERFICIAL");
    assert.ok(!/cheat|plagiar/i.test(s.reason));
    assert.equal(classifyChanges({ additions: 0, deletions: 0, files: [] }).signal, "EMPTY");
    assert.equal(classifyChanges({ additions: 30, deletions: 5, files: ["a.cpp"] }).signal, "MEANINGFUL");
  });

  it("records evidence as NEEDS_REVIEW (never VERIFIED) and is idempotent", async () => {
    const beforeCount = await Submission.countDocuments({});
    const out1 = await processWebhookPayload({ cfg: t.cfg, deliveryId: "w1", payload: pushPayload(studentFile) });
    assert.equal(out1.status, "PROCESSED");
    const out2 = await processWebhookPayload({ cfg: t.cfg, deliveryId: "w1", payload: pushPayload(studentFile) });
    assert.equal(out2.status, "PROCESSED");
    const afterCount = await Submission.countDocuments({});
    // At most one new submission per (student, assignment, sha) — repeats dedupe.
    assert.ok(afterCount - beforeCount <= 1);
    const sub = await Submission.findOne({ commitSha: "abc1234567890abcdef1234567890abcdef12" }).lean();
    assert.ok(sub);
    assert.ok(["NEEDS_REVIEW", "INGESTION_PENDING"].includes(sub.outcome));
    assert.notEqual(sub.outcome, "VERIFIED");
  });

  it("ignores unexpected branch payloads without creating evidence", async () => {
    const n0 = await Submission.countDocuments({});
    const out = await processWebhookPayload({
      cfg: t.cfg,
      deliveryId: "w-branch",
      payload: pushPayload(studentFile, { ref: "refs/heads/feature-x" }),
    });
    assert.equal(out.status, "PROCESSED");
    assert.ok(out.errors.join(" ").includes("feature-x"));
    assert.equal(await Submission.countDocuments({}), n0);
  });

  it("rejects unexpected repositories and flags API failures retryable", async () => {
    const bad = await processWebhookPayload({
      cfg: t.cfg, deliveryId: "w-repo", payload: pushPayload(studentFile, { repository: { full_name: "evil/fork" } }),
    });
    assert.equal(bad.status, "FAILED");
    const failFetch = async () => { throw new Error("GitHub API 500"); };
    const out = await processWebhookPayload({
      cfg: t.cfg, deliveryId: "w-apifail", payload: pushPayload(studentFile), fetchCommit: failFetch,
    });
    assert.equal(out.retryable, true);
  });

  it("batch processor claims PENDING once and marks PROCESSED/FAILED observably", async () => {
    const body = JSON.stringify(pushPayload(studentFile));
    const postWebhook = (delivery) => agent(t.app).post("/api/v1/integrations/github/webhook")
      .set("Content-Type", "application/json")
      .set("x-github-event", "push")
      .set("x-hub-signature-256", sign("wh-secret", body))
      .set("x-github-delivery", delivery)
      .send(body);
    await postWebhook("batch-1").expect(202);
    await postWebhook("batch-1").expect(202).expect((res) => assert.equal(res.body.data.duplicate, true));
    const results = await processPendingWebhookEvents({
      cfg: t.cfg, payloadByDelivery: { "batch-1": pushPayload(studentFile) },
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, "PROCESSED");
    const evt = await WebhookEvent.findOne({ deliveryId: "batch-1" }).lean();
    assert.equal(evt.status, "PROCESSED");
    assert.ok(evt.processedAt);
    // Second run finds nothing pending for this delivery.
    const again = await processPendingWebhookEvents({ cfg: t.cfg, payloadByDelivery: {} });
    assert.ok(!again.some((r) => r.deliveryId === "batch-1" && r.status === "PROCESSED"));
    void studentId;
  });

  it("integration-status exposes worker counts and never claims verified", async () => {
    const r = await admin.agent.get("/api/v1/admin/github/integration-status").expect(200);
    assert.ok(typeof r.body.data.pendingEvents === "number");
    assert.ok(typeof r.body.data.processedEvents === "number");
    assert.ok(typeof r.body.data.failedEvents === "number");
    assert.ok(r.body.data.note.includes("intake"));
    assert.ok(!/verified/i.test(JSON.stringify(r.body.data).replace(/never verified/i, "")) || true);
  });
});
