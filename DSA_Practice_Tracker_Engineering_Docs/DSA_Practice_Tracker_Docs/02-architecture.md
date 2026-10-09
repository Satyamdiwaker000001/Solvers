# 2. System Architecture

## 2.1 Architecture style
**Proposed:** Modular monolith for the web/API application plus asynchronous background workers for GitHub ingestion and verification. This keeps initial deployment manageable while separating slow or risky work from interactive requests. Do not start with microservices unless operational scale later requires it.

## 2.2 Logical components
1. Web UI: student dashboard and professor-admin dashboard.
2. Identity & Access module: GitHub OAuth, session handling, role checks, approval state, 24-hour rejection lock.
3. PS & Assignment module: PS catalog, common/individual assignment targets, deadlines and status.
4. GitHub Integration module: repository configuration, webhook intake/polling, commit/diff collection, API rate handling.
5. Verification module: path-to-student mapping, problem mapping, diff analysis, duplicate signals, optional sandboxed tests.
6. Progress/Reporting module: daily qualifying events, individual reports and history.
7. Leaderboard module: deterministic ranking from stored qualifying events.
8. Admin Audit module: records sensitive admin actions.
9. Database: durable source of truth for users, assignments, evidence, verification results and reports.
10. Background queue/worker: asynchronous event processing and bounded code-analysis jobs.
11. Optional isolated execution sandbox: only if automated execution is enabled.

## 2.3 High-level flow
- Student authenticates with GitHub.
- Backend resolves the GitHub identity.
- If not approved, the student sees the access-request state; protected program APIs remain denied.
- Admin approves/rejects the request.
- Admin publishes a PS and assigns it to class or selected students.
- Repository events are received via webhook or periodic sync.
- GitHub worker validates event, deduplicates it, fetches permitted evidence and stores raw metadata.
- Verification worker associates evidence with student/problem, evaluates code changes, and records outcome.
- Reporting module computes daily/weekly summaries and leaderboard inputs from stored results.
- Dashboard displays reports and any review flags.

## 2.4 Trust boundaries
- Browser is untrusted.
- GitHub OAuth callback and GitHub API are external trust boundaries.
- Webhook payloads must be signature-validated before processing.
- Student-submitted code and repository content are untrusted.
- Admin endpoints require server-side role checks.
- Code execution, if enabled, must occur in an isolated environment with no secrets, restricted network, CPU/memory/time limits and disposable workspace.

## 2.5 Data flow and reliability
- Prefer webhooks for timely updates and a periodic reconciliation job for missed events.
- Webhook handlers should validate and enqueue quickly, not run analysis inline.
- Process events idempotently using GitHub delivery/event identifiers and commit SHA/path keys.
- Apply bounded retries with backoff for transient GitHub/network failures.
- Respect GitHub API rate limits and surface integration health.
- Do not mark a submission verified while ingestion or required checks are incomplete.

## 2.6 Deployment-neutral logical architecture
## 2.6 MERN technology mapping
- **React:** student and professor-admin dashboards.
- **Node.js + Express.js:** REST API, GitHub OAuth callback handling, role/approval enforcement, PS/assignment workflows, report endpoints, webhook intake, and rate limiting.
- **MongoDB:** users, GitHub identity mapping, access requests, PS, assignments, submissions, repository evidence references, verification results, progress events, leaderboard inputs, and audit records.
- **Background processing:** repository analysis and optional code tests must not run inside a normal dashboard request. Select a queue/worker approach before implementation; it may use Node.js workers or a separate queue-backed worker process.
- **Validation:** use server-side schema validation and MongoDB indexes/constraints where applicable; do not rely on frontend validation.

MERN is the locked core stack. Hosting, queue technology, session library, GitHub App vs OAuth App, and sandbox technology remain open and must be recorded in Architecture Decision Records before implementation.

## 2.7 Suggested module boundaries
- `identity-access`
- `problem-assignments`
- `github-integration`
- `verification`
- `progress-reporting`
- `leaderboard`
- `admin-audit`
- `shared-infrastructure`

## 2.8 Architecture decision records (ADRs)
Create an ADR for:
- Frontend/backend/database/hosting stack.
- GitHub OAuth app configuration and token storage.
- Webhook vs polling and reconciliation frequency.
- Queue/worker mechanism.
- Repository folder convention and problem metadata format.
- Whether automated code execution is in MVP.
- Leaderboard formula and timezone.
