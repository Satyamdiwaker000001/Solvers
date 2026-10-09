# ADR-0005 — Evidence-processing worker without new queue infrastructure

Status: Accepted (implementation) · Date: 2026-10-09 · Owner: Solvers maintainers

## Context

Phase 2 webhook intake stores accepted deliveries as `PENDING` (`src/routes/webhook.js`,
`WebhookEvent` ledger). The engineering docs (02-architecture, 03-dfd, 07-github-verification)
require async verification, but open decision 12 §11 (queue/worker technology) is still
unresolved — professors/owner have not selected a queue, hosting, or sandbox model.

## Decision

Implement `src/services/evidence.js` with pure, testable processing steps
(`parseStudentPath`, `mapFolderToStudent`, `classifyChanges`,
`processWebhookPayload`, `processPendingWebhookEvents`) that run **in-process**
(bounded batch, atomic PENDING → PROCESSING claim). No Redis/RabbitMQ/SQS or new
dependency is introduced.

## Consequences

- Intake route is unchanged (HMAC, dedupe, 202 PENDING preserved).
- `WebhookEvent.status` gains `PROCESSING / PROCESSED / FAILED` + `processedAt`,
  `commitSha`, `branch`, `retryable`, `error` (no secrets) for observability.
- Worker never marks evidence VERIFIED; new evidence is `NEEDS_REVIEW` /
  `INGESTION_PENDING`, and only professor review (`accept`) creates qualifying
  `ProgressEvent`s — commit count still never equals solved count.
- Similarity / superficial-change outputs are review signals in
  `Submission.note`, never misconduct verdicts.
- When a queue is later approved, `processPendingWebhookEvents` becomes the job
  handler with no contract change; `integration-status` already exposes
  pending/processed/failed counts.

## Alternatives considered

- External queue now: rejected — would pre-empt unresolved decision 12 §11 and
  add unapproved infrastructure/hosting scope.
- Auto-verify on push: rejected — violates "PENDING never means verified" and
  FR-GH/FR-PROG rules; professor verification thresholds (12 §6) are pending.
