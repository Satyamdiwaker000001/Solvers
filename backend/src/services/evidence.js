/**
 * Evidence-processing worker (Phase C).
 *
 * Choice + justification (see docs/ADR-0005-evidence-worker.md): no new queue
 * technology. The intake route stores accepted deliveries as PENDING; this
 * module processes them in-process (`processPendingWebhookEvents`, safe to call
 * from a cron/timer, a one-shot script, or tests). That preserves the approved
 * modular-monolith architecture (doc 02) while queue/worker selection
 * (doc 12 §11) remains an open professor/owner decision.
 *
 * Guarantees:
 * - Idempotent: re-processing the same delivery never double-counts
 *   (deliveryId unique intake + student/assignment/commitSha unique evidence).
 * - Safe automation: a meaningful commit from a verified student folder that
 *   matches one active assignment is verified automatically. Unmapped,
 *   ambiguous, superficial, or empty evidence remains NEEDS_REVIEW.
 * - Commit count is never treated as solved count: one commit yields at most
 *   one Submission per (student, assignment); leaderboard math is untouched.
 * - Similarity / superficial-change signals are review hints recorded in
 *   `Submission.note`, never misconduct verdicts (NFR-FAIR-01).
 * - No secrets are read, logged, or stored by this module.
 */

import { Assignment, ProgressEvent, Submission, User, WebhookEvent } from "../models.js";

const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._ +-]*[A-Za-z0-9._+-]$|^[A-Za-z0-9]$/;
const SHA_RE = /^[0-9a-f]{7,64}$/i;

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate a changed path against the required student layout:
 *   <folderRoot><Student_Folder>/<Topic>/<Solution.ext> (+ optional nesting)
 * Topic-based, never language-based: any language extension is allowed inside
 * the topic directory; the topic segment itself is recorded as given.
 * Returns { studentFolder, topic, file } or { error }.
 */
export function parseStudentPath(path, folderRoot = "students/") {
  if (typeof path !== "string" || path === "") return { error: "Empty path" };
  if (Array.from(path).some((c) => c.charCodeAt(0) < 32)) return { error: "Malformed path contains control characters" };
  if (path.includes("\\") || path.startsWith("/") || path.includes("//")) {
    return { error: `Malformed path: ${path.slice(0, 120)}` };
  }
  const root = folderRoot.endsWith("/") ? folderRoot : `${folderRoot}/`;
  if (!path.startsWith(root)) return { error: `Path is outside the student root (${root})` };
  const rest = path.slice(root.length);
  const segs = rest.split("/");
  if (segs.length < 3) {
    return { error: `Path must be <Student>/<Topic>/<Solution.ext>: ${path.slice(0, 120)}` };
  }
  if (segs.some((s) => s === "" || s === "." || s === ".." || s.trim() !== s)) {
    return { error: `Path contains empty or traversal segments: ${path.slice(0, 120)}` };
  }
  const [studentFolder, topic, ...fileParts] = segs;
  if (!SEGMENT_RE.test(studentFolder) || !SEGMENT_RE.test(topic)) {
    return { error: `Invalid student/topic segment: ${path.slice(0, 120)}` };
  }
  const file = fileParts.join("/");
  if (!fileParts.every((s) => SEGMENT_RE.test(s))) {
    return { error: `Invalid file segment: ${path.slice(0, 120)}` };
  }
  return { studentFolder, topic, file };
}

/** Normalize topic names, problem titles, and filename slugs for comparison. */
export function normalizeToken(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/^[0-9]+[._-]/, "") // strip leading digits like 01_
    .replace(/\.[^/.]+$/, "") // strip extension if present
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map a student folder to an approved student using authoritative server records.
 * Deterministic mapping: matches strictly against the server-verified `user.folder`
 * (case-insensitive exact match).
 *
 * Never uses display-name matching or commit-author guessing.
 * Detects conflicts when multiple students claim the same folder.
 * Returns { user, conflict, unapproved, reason }.
 */
export async function mapFolderToStudent(studentFolder, folderRoot = "students/") {
  const root = folderRoot.endsWith("/") ? folderRoot : `${folderRoot}/`;
  const full = `${root}${studentFolder}`;

  const regex = new RegExp(`^${escapeRegex(full)}$`, "i");
  const matching = await User.find({ folder: regex, role: "student" }).lean();

  if (matching.length === 0) {
    return { user: null, conflict: false, unapproved: false, reason: `Unmapped folder: ${studentFolder}` };
  }
  if (matching.length > 1) {
    return {
      user: null,
      conflict: true,
      unapproved: false,
      reason: `Conflicting students registered for folder '${studentFolder}' (${matching.length} matches)`,
    };
  }

  const user = matching[0];
  if (user.accountStatus !== "approved") {
    return {
      user,
      conflict: false,
      unapproved: true,
      reason: `Student account is ${user.accountStatus}`,
    };
  }

  return { user, conflict: false, unapproved: false, reason: null };
}

/**
 * Match submitted evidence to an active assignment targeting the student.
 * Compares problem topic against submitted folder topic, and problem title against
 * filename slug.
 *
 * Rules (Phase B):
 * - Canonical problem matching: requires exact normalized slug match between
 *   filename and problem title (no loose substring matching).
 * - Topic compatibility: if problem defines a topic, submitted topic must match
 *   or share canonical tokens (unrelated topics do not match).
 * - Targeting: INDIVIDUAL assignments match only explicitly targeted students.
 * - Specificity: INDIVIDUAL assignments take precedence over COMMON assignments.
 * - Ambiguity: multiple active candidates with equal score remain unresolved.
 * Returns { assignment, matchReason }.
 */
export async function matchAssignmentForEvidence({ user, sp }) {
  const assignments = await Assignment.find({
    status: "active",
    $or: [{ type: "COMMON" }, { targets: { $elemMatch: { student: user._id } } }],
  })
    .populate("problem", "problemCode topic title")
    .lean();

  if (!assignments || assignments.length === 0) {
    return { assignment: null, matchReason: "no_active_assignments" };
  }

  const normTopic = normalizeToken(sp.topic);
  // Optional nested solution folders are allowed; assignment matching uses
  // the actual filename, not the directory path before it.
  const normFile = normalizeToken(String(sp.file).split("/").pop());

  const matched = [];

  for (const a of assignments) {
    if (!a.problem || !a.problem.title) continue;

    // Verify targeting strictly: INDIVIDUAL assignments cannot match untargeted students
    const isTargeted =
      a.type === "COMMON" ||
      (Array.isArray(a.targets) && a.targets.some((t) => String(t.student) === String(user._id)));
    if (!isTargeted) continue;

    const probTopic = normalizeToken(a.problem.topic);
    const probTitle = normalizeToken(a.problem.title);
    const probCode = normalizeToken(a.problem.problemCode);

    // 1. Problem title match: exact normalized slug comparison (never loose substring)
    const titleMatches = probTitle === normFile
      || (probCode && normFile.startsWith(`${probCode} `)
        && normalizeToken(normFile.slice(probCode.length)) === probTitle);
    if (!titleMatches) continue;

    // 2. Topic match: if problem has topic, submitted topic must be compatible
    if (probTopic && normTopic) {
      const topicTokensProb = probTopic.split(" ").filter(Boolean);
      const topicTokensSub = normTopic.split(" ").filter(Boolean);
      const topicMatches =
        probTopic === normTopic ||
        topicTokensSub.some((tok) => topicTokensProb.includes(tok)) ||
        topicTokensProb.some((tok) => topicTokensSub.includes(tok));

      if (!topicMatches) {
        // Filename matches, but topic mismatches! Do not match.
        continue;
      }
    }

    // Specificity score: INDIVIDUAL (20) > COMMON (10)
    let score = a.type === "INDIVIDUAL" ? 20 : 10;

    // Schedule: active assignment within deadline scores higher than past dueAt
    const now = Date.now();
    if (a.dueAt) {
      const dueTime = new Date(a.dueAt).getTime();
      if (dueTime >= now) {
        score += 5; // active within deadline
      }
    }

    matched.push({ assignment: a, score });
  }

  if (matched.length === 0) {
    return {
      assignment: null,
      matchReason: `topic_or_problem_mismatch (submitted topic '${sp.topic}', file '${sp.file}')`,
    };
  }

  matched.sort((a, b) => b.score - a.score);

  if (matched.length === 1 || matched[0].score > matched[1].score) {
    return { assignment: matched[0].assignment, matchReason: "matched" };
  }

  // Ambiguous: multiple active assignments share the highest score
  return {
    assignment: null,
    matchReason: `ambiguous_match (multiple active assignments match problem '${matched[0].assignment.problem?.title}')`,
  };
}

/**
 * Heuristic change classifier. Returns a REVIEW SIGNAL only:
 * { signal: "MEANINGFUL" | "SUPERFICIAL" | "EMPTY", reason }.
 * Never a verdict about authorship or misconduct.
 */
export function classifyChanges({ additions = 0, deletions = 0, files = [] } = {}) {
  const total = Number(additions || 0) + Number(deletions || 0);
  if (!Array.isArray(files) || files.length === 0 || total <= 0) {
    return { signal: "EMPTY", reason: "No file changes with code additions/deletions" };
  }
  if (total <= 2) {
    return { signal: "SUPERFICIAL", reason: `Very small change (${total} line(s)); possible comment/format-only edit — needs review` };
  }
  return { signal: "MEANINGFUL", reason: `Code change across ${files.length} file(s), ${total} line(s)` };
}

/**
 * Process one stored webhook payload idempotently. `payload` is the parsed
 * push body ({ ref, repository.full_name, commits:[{id, added, modified,
 * removed}], head_commit }). `fetchCommit` is an injectable
 * `async (sha) => { additions, deletions, files }` (GitHub API in production,
 * stub in tests); when null, per-commit stats are skipped and evidence is
 * recorded from path data alone (still NEEDS_REVIEW because commit statistics
 * are unavailable).
 *
 * Returns a summary { deliveryId, status, evidence, errors, retryable }.
 */
export async function processWebhookPayload({ cfg, deliveryId, payload, fetchCommit = null }) {
  const summary = { deliveryId, status: "PROCESSED", evidence: 0, errors: [], retryable: false };
  const repoFull = payload?.repository?.full_name || "";
  if (repoFull && repoFull !== cfg.repo.fullName) {
    return { ...summary, status: "FAILED", retryable: false, errors: [`Unexpected repository: ${repoFull}`] };
  }
  const expectedRef = `refs/heads/${cfg.repo.branch}`;
  if (payload?.ref && payload.ref !== expectedRef) {
    return { ...summary, status: "PROCESSED", errors: [`Ignored ref ${payload.ref} (expected ${expectedRef})`] };
  }
  const commits = Array.isArray(payload?.commits) ? payload.commits : [];
  if (commits.length === 0) {
    return { ...summary, status: "PROCESSED", errors: ["No commits in payload"] };
  }

  for (const commit of commits) {
    const sha = String(commit?.id || commit?.sha || "");
    if (!SHA_RE.test(sha)) {
      summary.errors.push(`Skipped commit with malformed sha: ${sha.slice(0, 24)}`);
      continue;
    }
    const changed = [
      ...(Array.isArray(commit.added) ? commit.added.map((p) => ({ path: p, change: "added" })) : []),
      ...(Array.isArray(commit.modified) ? commit.modified.map((p) => ({ path: p, change: "modified" })) : []),
    ];
    // Removals carry no new evidence; renames surface as add+remove.
    const studentPaths = [];
    for (const c of changed) {
      const parsed = parseStudentPath(c.path, cfg.repo.folderRoot);
      if (parsed.error) {
        summary.errors.push(`Ignored path (${parsed.error})`);
        continue;
      }
      studentPaths.push({ ...parsed, change: c.change });
    }
    if (studentPaths.length === 0) continue;

    let stats = null;
    if (typeof fetchCommit === "function") {
      try {
        stats = await fetchCommit(sha);
      } catch (err) {
        const isRetryable = err?.retryable !== undefined ? Boolean(err.retryable) : true;
        summary.errors.push(`Commit ${sha.slice(0, 12)}: evidence API failed (${err.message})`);
        summary.status = "FAILED";
        summary.retryable = isRetryable;
        return summary;
      }
    }
    const classification = classifyChanges({
      additions: stats?.additions ?? 1,
      deletions: stats?.deletions ?? 0,
      files: stats?.files ?? studentPaths.map((p) => p.path ?? `${p.studentFolder}/${p.topic}/${p.file}`),
    });

    for (const sp of studentPaths) {
      const mapping = await mapFolderToStudent(sp.studentFolder, cfg.repo.folderRoot);
      const { user, conflict, unapproved, reason } = mapping;

      // If unresolved identity (no mapped student, conflicting claim, or unapproved student):
      // Safely quarantine the evidence with student: null and outcome: NEEDS_REVIEW.
      // Never guess, never silently attribute to an unapproved or wrong student.
      if (!user || conflict || unapproved) {
        const quarantineReason = !user
          ? (conflict ? `identity_conflict: ${reason}` : `unmapped_folder: ${reason}`)
          : `unapproved_student: student ${user._id} (${user.githubLogin}) is ${user.accountStatus}`;

        summary.errors.push(`Quarantined evidence for ${sp.studentFolder}: ${quarantineReason}`);

        try {
          await Submission.updateOne(
            { student: null, commitSha: sha.slice(0, 40), path: `${cfg.repo.folderRoot}${sp.studentFolder}/${sp.topic}/${sp.file}` },
            {
              $setOnInsert: {
                student: null,
                assignment: null,
                repository: cfg.repo.fullName,
                commitSha: sha.slice(0, 40),
                path: `${cfg.repo.folderRoot}${sp.studentFolder}/${sp.topic}/${sp.file}`,
                status: "observed",
                outcome: "NEEDS_REVIEW",
                eventType: "NEEDS_REVIEW",
                additions: Number(stats?.additions ?? 0),
                deletions: Number(stats?.deletions ?? 0),
                note: [
                  `topic=${sp.topic}`,
                  `unresolved_identity=${quarantineReason}`,
                  `change=${classification.signal}: ${classification.reason}`,
                  "assignment=unassigned (unresolved student identity)",
                ].join("; ").slice(0, 1000),
                firstObservedAt: new Date(),
              },
            },
            { upsert: true },
          );
          summary.evidence += 1;
        } catch (err) {
          if (err && err.code === 11000) continue; // idempotent duplicate
          summary.errors.push(`Failed to persist quarantined submission: ${err.message}`);
          summary.status = "FAILED";
          summary.retryable = true;
          return summary;
        }
        continue;
      }

      // Match assignment with topic and problem constraints. Unmatched or ambiguous
      // evidence is recorded with assignment: null (never user._id) for human review.
      const { assignment, matchReason } = await matchAssignmentForEvidence({ user, sp });
      const assignedId = assignment ? assignment._id : null;
      const autoVerify = classification.signal === "MEANINGFUL" && Boolean(assignment);

      const fullPath = `${cfg.repo.folderRoot}${sp.studentFolder}/${sp.topic}/${sp.file}`;
      const subQuery = assignedId
        ? { student: user._id, assignment: assignedId, commitSha: sha.slice(0, 40) }
        : { student: user._id, assignment: null, commitSha: sha.slice(0, 40), path: fullPath };

      try {
        const submission = await Submission.findOneAndUpdate(
          subQuery,
          {
            $setOnInsert: {
              student: user._id,
              assignment: assignedId,
              repository: cfg.repo.fullName,
              commitSha: sha.slice(0, 40),
              path: fullPath,
              status: "observed",
              outcome: autoVerify ? "VERIFIED" : "NEEDS_REVIEW",
              eventType: autoVerify ? "NEW_PROBLEM_VERIFIED" : "NEEDS_REVIEW",
              additions: Number(stats?.additions ?? 0),
              deletions: Number(stats?.deletions ?? 0),
              note: [
                `topic=${sp.topic}`,
                "identity=verified-folder-mapping",
                `change=${classification.signal}: ${classification.reason}`,
                assignment ? `assignment=${assignment._id}` : `assignment=unassigned (${matchReason})`,
              ].join("; ").slice(0, 1000),
              firstObservedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        ).lean();
        summary.evidence += 1;

        // Existing submissions may have been ingested before the assignment
        // matcher completed. Promote only unreviewed evidence; never override
        // an explicit admin decision. The source key makes this idempotent.
        if (autoVerify && submission && !submission.reviewedBy && submission.outcome !== "VERIFIED") {
          await Submission.updateOne(
            { _id: submission._id, reviewedBy: null },
            { $set: { outcome: "VERIFIED", eventType: "NEW_PROBLEM_VERIFIED" } },
          );
        }

        if (autoVerify && submission) {
          await ProgressEvent.updateOne(
            { sourceKey: `submission:${submission._id}` },
            {
              $setOnInsert: {
                student: user._id,
                eventType: "NEW_PROBLEM_VERIFIED",
                occurredAt: submission.firstObservedAt || new Date(),
                sourceKey: `submission:${submission._id}`,
                meta: {
                  assignmentId: String(assignment._id),
                  commitSha: sha.slice(0, 40),
                  path: fullPath,
                  automated: true,
                },
              },
            },
            { upsert: true },
          );
        }
      } catch (err) {
        if (err && err.code === 11000) continue; // concurrent duplicate: no double count
        summary.errors.push(`Failed to persist submission: ${err.message}`);
        summary.status = "FAILED";
        summary.retryable = true;
        return summary;
      }
      if (assignment && autoVerify) {
        await Assignment.updateOne(
          { _id: assignment._id, "targets.student": user._id },
          { $set: { "targets.$.completionStatus": "verified" } },
        ).catch(() => {});
      } else if (assignment) {
        await Assignment.updateOne(
          {
            _id: assignment._id,
            "targets.student": user._id,
            "targets.completionStatus": { $in: ["not_started", "in_progress"] },
          },
          { $set: { "targets.$.completionStatus": "needs_review" } },
        ).catch(() => {});
      }
    }
  }
  return summary;
}

/**
 * Claim and process all pending, lease-expired, or retryable intake events.
 * Atomically transitions state to PROCESSING with a distributed lease so concurrent
 * workers never claim the same event simultaneously. Crashed worker leases expire
 * and are safely reclaimed on subsequent passes.
 */
export async function processPendingWebhookEvents({
  cfg,
  payloadByDelivery = {},
  fetchCommit = null,
  limit = 20,
  leaseDurationMs = 30_000,
  baseBackoffMs = 1_000,
} = {}) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);

  const candidateQuery = {
    $or: [
      { status: "PENDING" },
      { status: "PROCESSING", leaseExpiresAt: { $lte: now } },
      {
        status: "FAILED",
        retryable: true,
        $expr: { $lt: ["$attempts", "$maxAttempts"] },
        $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
      },
    ],
  };

  const candidates = await WebhookEvent.find(candidateQuery)
    .sort({ receivedAt: 1 })
    .limit(limit)
    .select("_id deliveryId status attempts maxAttempts payload")
    .lean();

  const claimed = [];
  for (const c of candidates) {
    const claimRes = await WebhookEvent.findOneAndUpdate(
      {
        _id: c._id,
        $or: [
          { status: "PENDING" },
          { status: "PROCESSING", leaseExpiresAt: { $lte: now } },
          {
            status: "FAILED",
            retryable: true,
            $expr: { $lt: ["$attempts", "$maxAttempts"] },
            $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
          },
        ],
      },
      {
        $set: {
          status: "PROCESSING",
          claimedAt: now,
          leaseExpiresAt,
        },
        $inc: { attempts: 1 },
      },
      { new: true },
    ).lean();
    if (claimRes) claimed.push(claimRes);
  }

  const results = [];
  for (const evt of claimed) {
    const payload = payloadByDelivery[evt.deliveryId] || evt.payload;
    if (!payload) {
      await WebhookEvent.updateOne(
        { _id: evt._id },
        {
          $set: {
            status: "PENDING",
            claimedAt: null,
            leaseExpiresAt: null,
            error: "No payload available for processing (awaiting redelivery or backfill)",
          },
        },
      );
      results.push({ deliveryId: evt.deliveryId, status: "PENDING", note: "awaiting payload" });
      continue;
    }

    try {
      const out = await processWebhookPayload({ cfg, deliveryId: evt.deliveryId, payload, fetchCommit });
      const failed = out.status === "FAILED";
      const attemptsSoFar = evt.attempts || 1;
      const maxAttempts = evt.maxAttempts || 3;
      const isRetryable = Boolean(out.retryable) && attemptsSoFar < maxAttempts;

      const nextRetryAt = isRetryable
        ? new Date(Date.now() + Math.min(60_000, baseBackoffMs * Math.pow(2, attemptsSoFar - 1)))
        : null;

      await WebhookEvent.updateOne(
        { _id: evt._id },
        {
          $set: {
            status: failed ? "FAILED" : "PROCESSED",
            processedAt: new Date(),
            commitSha: String(payload?.head_commit?.id || payload?.commits?.[0]?.id || "").slice(0, 40),
            branch: String(payload?.ref || "").replace("refs/heads/", ""),
            retryable: isRetryable,
            nextRetryAt,
            leaseExpiresAt: null,
            error: (out.errors || []).join(" | ").slice(0, 2000),
          },
        },
      );
      results.push({ deliveryId: evt.deliveryId, ...out, retryable: isRetryable, attempts: attemptsSoFar });
    } catch (err) {
      const attemptsSoFar = evt.attempts || 1;
      const maxAttempts = evt.maxAttempts || 3;
      const isRetryable = attemptsSoFar < maxAttempts;
      const nextRetryAt = isRetryable
        ? new Date(Date.now() + Math.min(60_000, baseBackoffMs * Math.pow(2, attemptsSoFar - 1)))
        : null;

      await WebhookEvent.updateOne(
        { _id: evt._id },
        {
          $set: {
            status: "FAILED",
            processedAt: new Date(),
            retryable: isRetryable,
            nextRetryAt,
            leaseExpiresAt: null,
            error: String(err.message || err).slice(0, 2000),
          },
        },
      );
      results.push({
        deliveryId: evt.deliveryId,
        status: "FAILED",
        retryable: isRetryable,
        errors: [String(err.message || err)],
        attempts: attemptsSoFar,
      });
    }
  }
  return results;
}

let workerIntervalId = null;
let isWorkerRunning = false;
let isProcessingBatch = false;

/**
 * Start the in-process webhook evidence worker.
 * Runs an unblocked polling interval for lease-recovery, retries, and backlog draining,
 * while supporting event-driven immediate execution via triggerWebhookWorker.
 */
export function startWebhookWorker({
  app,
  cfg,
  fetchCommit = null,
  intervalMs = 5000,
  limit = 20,
  leaseDurationMs = 30_000,
} = {}) {
  if (workerIntervalId) return;
  isWorkerRunning = true;

  const runPass = async () => {
    if (!isWorkerRunning || isProcessingBatch) return;
    isProcessingBatch = true;
    try {
      const activeCfg = cfg || app?.get("config");
      const github = app?.get("github");
      const activeFetchCommit = fetchCommit || (github ? (sha) => github.fetchCommit({ repoFullName: activeCfg?.repo?.fullName, sha, token: activeCfg?.github?.repoToken }) : null);
      if (activeCfg) {
        await processPendingWebhookEvents({
          cfg: activeCfg,
          fetchCommit: activeFetchCommit,
          limit,
          leaseDurationMs,
        });
      }
    } catch (err) {
      console.error(`[webhook-worker] Error in periodic pass: ${err.message}`);
    } finally {
      isProcessingBatch = false;
    }
  };

  workerIntervalId = setInterval(runPass, intervalMs);
  if (workerIntervalId.unref) workerIntervalId.unref();

  return {
    runPass,
    stop: stopWebhookWorker,
  };
}

/**
 * Stop the in-process webhook worker gracefully, waiting for any in-flight batch.
 */
export async function stopWebhookWorker() {
  isWorkerRunning = false;
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
  }
  const start = Date.now();
  while (isProcessingBatch && Date.now() - start < 3000) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * Pulse the webhook worker asynchronously without blocking the intake HTTP response.
 */
export function triggerWebhookWorker(app) {
  if (!isWorkerRunning) return;
  setImmediate(async () => {
    if (!isWorkerRunning || isProcessingBatch) return;
    isProcessingBatch = true;
    try {
      const cfg = app?.get("config");
      const github = app?.get("github");
      const fetchCommit = github ? (sha) => github.fetchCommit({ repoFullName: cfg?.repo?.fullName, sha, token: cfg?.github?.repoToken }) : null;
      if (cfg) {
        await processPendingWebhookEvents({ cfg, fetchCommit });
      }
    } catch (err) {
      console.error(`[webhook-worker] Error in triggered pass: ${err.message}`);
    } finally {
      isProcessingBatch = false;
    }
  });
}

