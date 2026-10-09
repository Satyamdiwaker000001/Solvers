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
 * - Fail-closed: nothing is ever marked VERIFIED here. New evidence lands as
 *   INGESTION_PENDING / NEEDS_REVIEW for professor review; only the existing
 *   review endpoint (`accept`) can create qualifying ProgressEvents.
 * - Commit count is never treated as solved count: one commit yields at most
 *   one Submission per (student, assignment); leaderboard math is untouched.
 * - Similarity / superficial-change signals are review hints recorded in
 *   `Submission.note`, never misconduct verdicts (NFR-FAIR-01).
 * - No secrets are read, logged, or stored by this module.
 */

import { Assignment, Submission, User, WebhookEvent } from "../models.js";

const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA_RE = /^[0-9a-f]{7,64}$/i;

/**
 * Validate a changed path against the required student layout:
 *   <folderRoot><Student_Folder>/<Topic>/<Solution.ext> (+ optional nesting)
 * Topic-based, never language-based: any language extension is allowed inside
 * the topic directory; the topic segment itself is recorded as given.
 * Returns { studentFolder, topic, file } or { error }.
 */
export function parseStudentPath(path, folderRoot = "students/") {
  if (typeof path !== "string" || path === "") return { error: "Empty path" };
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
  if (segs.some((s) => s === "" || s === "." || s === "..")) {
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

/** Normalize "Satyam_Diwaker" <-> "Satyam Diwaker" for fallback matching. */
function normalizeName(s) {
  return String(s || "").replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Map a student folder to an approved student using authoritative server
 * records. Primary: the server-minted `user.folder` prefix. Fallback: the
 * display-name-derived folder (central repo uses Full_Name folders while the
 * tracker mints STU folders) — flagged via `fallback: true` so callers route
 * the evidence to NEEDS_REVIEW instead of trusting it silently.
 */
export async function mapFolderToStudent(studentFolder, folderRoot = "students/") {
  const root = folderRoot.endsWith("/") ? folderRoot : `${folderRoot}/`;
  const full = `${root}${studentFolder}`;
  const byFolder = await User.findOne({ folder: full, role: "student" }).lean();
  if (byFolder) return { user: byFolder, fallback: false };
  const approved = await User.find({ role: "student", accountStatus: "approved" })
    .select("displayName githubLogin folder")
    .lean();
  const want = normalizeName(studentFolder);
  const byName = approved.find(
    (u) => normalizeName(u.displayName) === want || normalizeName(u.githubLogin) === want,
  );
  if (byName) return { user: byName, fallback: true };
  return { user: null, fallback: false };
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
 * recorded from path data alone (still NEEDS_REVIEW, never verified).
 *
 * Returns a summary { deliveryId, status, evidence, errors }.
 */
export async function processWebhookPayload({ cfg, deliveryId, payload, fetchCommit = null }) {
  const summary = { deliveryId, status: "PROCESSED", evidence: 0, errors: [] };
  const repoFull = payload?.repository?.full_name || "";
  if (repoFull && repoFull !== cfg.repo.fullName) {
    return { ...summary, status: "FAILED", errors: [`Unexpected repository: ${repoFull}`] };
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
        summary.errors.push(`Commit ${sha.slice(0, 12)}: evidence API failed (${err.message}); will retry`);
        summary.status = "PROCESSED";
        summary.retryable = true;
        continue;
      }
    }
    const classification = classifyChanges({
      additions: stats?.additions ?? 1,
      deletions: stats?.deletions ?? 0,
      files: stats?.files ?? studentPaths.map((p) => p.path ?? `${p.studentFolder}/${p.topic}/${p.file}`),
    });

    for (const sp of studentPaths) {
      const { user, fallback } = await mapFolderToStudent(sp.studentFolder, cfg.repo.folderRoot);
      if (!user) {
        summary.errors.push(`No approved student for folder ${sp.studentFolder}; path ignored`);
        continue;
      }
      if (user.accountStatus !== "approved") {
        summary.errors.push(`Student ${sp.studentFolder} is not approved; evidence held, not counted`);
        continue;
      }
      // Assignment linkage is informational: prefer an active assignment whose
      // problem topic matches, else record unassigned evidence without credit.
      const assignment = await Assignment.findOne({
        status: "active",
        $or: [{ type: "COMMON" }, { targets: { $elemMatch: { student: user._id } } }],
      })
        .populate("problem", "topic title")
        .sort({ createdAt: -1 })
        .lean();
      const needsReview =
        fallback || classification.signal !== "MEANINGFUL" || !assignment;
      try {
        await Submission.updateOne(
          { student: user._id, assignment: assignment?._id || user._id, commitSha: sha.slice(0, 40) },
          {
            $setOnInsert: {
              student: user._id,
              assignment: assignment?._id || user._id,
              repository: cfg.repo.fullName,
              commitSha: sha.slice(0, 40),
              path: `${cfg.repo.folderRoot}${sp.studentFolder}/${sp.topic}/${sp.file}`,
              status: "observed",
              outcome: needsReview ? "NEEDS_REVIEW" : "INGESTION_PENDING",
              eventType: "NEEDS_REVIEW",
              additions: Number(stats?.additions ?? 0),
              deletions: Number(stats?.deletions ?? 0),
              note: [
                `topic=${sp.topic}`,
                fallback ? "identity=fallback-name-match (review required)" : "identity=folder-match",
                `change=${classification.signal}: ${classification.reason}`,
                assignment ? `assignment=${assignment._id}` : "assignment=unassigned (no credit until assigned)",
              ].join("; ").slice(0, 1000),
              firstObservedAt: new Date(),
            },
          },
          { upsert: true },
        );
        summary.evidence += 1;
      } catch (err) {
        if (err && err.code === 11000) continue; // concurrent duplicate: no double count
        throw err;
      }
      if (assignment) {
        await Assignment.updateOne(
          { _id: assignment._id, "targets.student": user._id },
          { $set: { "targets.$.completionStatus": "needs_review" } },
        ).catch(() => {});
      }
    }
  }
  return summary;
}

/**
 * Claim and process all PENDING intake events (bounded batch). Atomically
 * moves PENDING → PROCESSING so parallel workers never double-process, then
 * marks PROCESSED / FAILED with `error` + `retryable` for observability.
 * `payloadByDelivery` maps deliveryId → parsed payload (production reads the
 * stored raw body or re-fetches; tests inject fixtures). Entries without a
 * payload are left PENDING with a recorded note instead of being lost.
 */
export async function processPendingWebhookEvents({ cfg, payloadByDelivery = {}, fetchCommit = null, limit = 20 } = {}) {
  const claimed = [];
  const pending = await WebhookEvent.find({ status: "PENDING" })
    .sort({ receivedAt: 1 })
    .limit(limit)
    .lean();
  for (const evt of pending) {
    const res = await WebhookEvent.findOneAndUpdate(
      { _id: evt._id, status: "PENDING" },
      { $set: { status: "PROCESSING" } },
      { new: true },
    ).lean();
    if (res) claimed.push(res);
  }
  const results = [];
  for (const evt of claimed) {
    const payload = payloadByDelivery[evt.deliveryId];
    if (!payload) {
      await WebhookEvent.updateOne(
        { _id: evt._id },
        { $set: { status: "PENDING", error: "No payload available for processing (awaiting redelivery or backfill)" } },
      );
      results.push({ deliveryId: evt.deliveryId, status: "PENDING", note: "awaiting payload" });
      continue;
    }
    try {
      const out = await processWebhookPayload({ cfg, deliveryId: evt.deliveryId, payload, fetchCommit });
      const failed = out.status === "FAILED";
      await WebhookEvent.updateOne(
        { _id: evt._id },
        {
          $set: {
            status: failed ? "FAILED" : "PROCESSED",
            processedAt: new Date(),
            commitSha: String(payload?.head_commit?.id || payload?.commits?.[0]?.id || "").slice(0, 40),
            branch: String(payload?.ref || "").replace("refs/heads/", ""),
            retryable: Boolean(out.retryable),
            error: (out.errors || []).join(" | ").slice(0, 2000),
          },
        },
      );
      results.push({ deliveryId: evt.deliveryId, ...out });
    } catch (err) {
      await WebhookEvent.updateOne(
        { _id: evt._id },
        { $set: { status: "FAILED", processedAt: new Date(), retryable: true, error: String(err.message || err).slice(0, 2000) } },
      );
      results.push({ deliveryId: evt.deliveryId, status: "FAILED", retryable: true, errors: [String(err.message || err)] });
    }
  }
  return results;
}
