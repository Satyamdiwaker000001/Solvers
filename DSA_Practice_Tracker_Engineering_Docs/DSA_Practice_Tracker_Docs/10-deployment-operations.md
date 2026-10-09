# 10. Deployment and Operations

## 10.1 Environments
- Local development.
- Test/staging with a separate GitHub app/repository or test fixture.
- Production with production credentials and restricted access.

Never reuse production OAuth secrets in local development.

## 10.2 Configuration
Use environment variables or a managed secret store for:
- OAuth client ID/secret and callback URL.
- GitHub webhook secret and repository identifier.
- Database connection.
- Session/cookie signing secrets.
- Rate-limit configuration.
- Queue/worker settings.
- Analysis sandbox resource limits.
- Timezone and report policy.

Provide a `.env.example` with placeholders only; do not commit real secrets.

## 10.3 Observability
Monitor:
- OAuth success/failure and access-request volume.
- Approval/rejection counts and lock/rate-limit events.
- GitHub API errors, rate-limit responses and webhook delivery failures.
- Queue depth, job age, retries and dead-letter failures.
- Verification duration, outcome distribution and sandbox failures.
- Report generation latency and application errors.
- Database connection pool and storage growth.

Logs should use correlation IDs and redact secrets.

## 10.4 Reliability
- Webhook processing must be idempotent.
- Retry transient failures with bounded exponential backoff and jitter.
- Reconcile recent repository history periodically to recover missed webhook events.
- Bound queue size and analysis concurrency.
- Do not block interactive API requests while compiling/testing code.
- Define health/readiness checks for the API, database, queue and worker.

## 10.5 Backup and recovery
- Schedule database backups appropriate to data-loss tolerance.
- Test restore procedures, not just backup creation.
- Keep code/secret artifacts out of backups unless explicitly required and protected.
- Define recovery objectives before production.
- Document how to rotate/revoke GitHub credentials and webhook secrets.

## 10.6 Deployment-neutral guidance
Core stack is MERN. Exact hosting platform, MongoDB hosting option, queue/worker technology and sandbox deployment are not selected. Choose them after expected class size, budget, GitHub access model and code-execution requirements are known.
