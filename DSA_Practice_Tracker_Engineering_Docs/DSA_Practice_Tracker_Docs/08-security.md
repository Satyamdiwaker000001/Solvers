# 8. Security and Abuse-Prevention Design

## 8.1 Authentication and authorization
- Student identity comes from GitHub OAuth; store GitHub's stable numeric user ID as the external identifier.
- Program approval is a separate server-side state.
- All protected API requests check authentication, account status, and role.
- Admin accounts are pre-provisioned/allowlisted by a trusted operator. Do not grant admin because of a matching email or a client-supplied role.
- Use secure, HttpOnly, SameSite cookies or an appropriately secured session mechanism depending on the selected stack.
- Protect OAuth state and session-changing requests against CSRF.

## 8.2 24-hour reapplication lock
- On rejection, store `decided_at` and `reapply_after = decided_at + 24 hours` using server time.
- Check the lock atomically when creating a new request.
- Return a clear `REAPPLICATION_LOCKED` response and retry time.
- Do not trust the user's device clock.
- If a request is rejected multiple times, calculate the next lock from the latest rejection decision.

## 8.3 Rate limits
Apply separate configurable limits for:
- OAuth initiation/callback and repeated failed login flows.
- Access-request creation.
- Admin approval/rejection endpoints.
- General API traffic.
- Expensive report generation and verification jobs.
- Concurrent background analysis jobs.

Use shared storage for rate counters if multiple application instances run. Add per-user and global limits, bounded queues, backpressure and retry responses. Do not invent numeric thresholds until expected load and hosting are known.

## 8.4 GitHub integration
- Use least-privilege GitHub OAuth/App permissions based on the selected repository arrangement.
- Keep tokens and webhook secrets out of source control and logs.
- Validate webhook signatures and deduplicate delivery IDs.
- Limit repository access to the configured repository where supported.
- Handle token revocation, permission changes, API rate limits and GitHub outages safely.

## 8.5 Untrusted code
- Never execute student code inside the web/API process.
- If tests are run, use an isolated ephemeral sandbox/container with no application secrets, restricted/no network, non-root execution, read-only base image where practical, CPU/memory/process/time limits, and cleanup after each run.
- Restrict file paths and reject traversal/symlink attacks in any extraction or workspace preparation.
- Treat compiler output and repository content as untrusted text.

## 8.6 Data protection and audit
- Minimize retained source code/diffs to what verification requires.
- Restrict student access to own report and assigned PS.
- Record sensitive admin actions.
- Avoid logging OAuth tokens, cookies, secrets or unnecessary personal data.
- Define backup, retention and deletion rules before production.

## 8.7 Failure behavior
- If GitHub evidence cannot be fetched, show `ANALYSIS_PENDING` or `ANALYSIS_FAILED`, not verified success.
- If rate-limited, provide a retry time where available.
- If a database transaction fails, do not leave a partial approval/assignment state.
