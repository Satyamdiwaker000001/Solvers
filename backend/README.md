# DSA Practice Tracker — Backend (Phase 2)

Node.js + Express.js + MongoDB API for the DSA Practice Tracker. Source of truth
for product scope: `DSA_Practice_Tracker_Engineering_Docs/DSA_Practice_Tracker_Docs/`
(SRS, architecture, data model, API spec, security, test plan). Decisions that
needed judgment are recorded in `docs/` as ADRs.

## Quick start

Requirements: Node.js 20+ and npm. MongoDB for persistence (local instance,
Atlas, or the in-memory server used by tests).

```powershell
Copy-Item .env.example .env   # then fill in real values (never commit .env)
npm install
npm run dev                   # watch mode, :5000 by default
npm start                     # production
npm test                      # backend suite (isolated in-memory MongoDB)
npm run lint                  # oxlint (must report 0 errors, 0 warnings)
```

Health: `GET /api/v1/health` (process) and `GET /api/v1/ready` (503 until
MongoDB is connected).

## Layout

```
src/
  index.js            # boot: config → MongoDB → listen; graceful shutdown
  config.js           # env-only config with fail-fast validation
  db.js               # connect/disconnect/readiness
  app.js              # middleware + route mounting order (order matters)
  models.js           # Mongoose schemas, indexes, constraints
  lib/github.js       # minimal GitHub OAuth/profile client (injectable fetch)
  lib/http.js         # pagination envelope, ObjectId guard
  lib/studentIds.js   # atomic STU0001… allocator
  middleware/auth.js  # session → DB user; requireAuth/ApprovedStudent/Admin
  middleware/csrf.js  # double-submit CSRF for cookie-session mutations
  middleware/errors.js# AppError model + production-safe final handler
  middleware/rateLimit.js # MongoDB-backed fixed windows + concurrency slots
  middleware/validate.js  # Zod body/query validation → 400 VALIDATION_ERROR
  middleware/audit.js # append-only audit writer (never breaks primary op)
  routes/             # thin routers: auth, accessRequests, problems,
                      # assignments, ops (students/review/audit/reports),
                      # webhook, schemas (Zod)
  services/           # business rules: approvals, assignments, leaderboard
tests/                # node:test suites, isolated per-file MongoDB
docs/                 # ADRs (sessions, admins, rate limits, integration)
```

## Environment

See `.env.example` (placeholders only). Required: `MONGODB_URI`,
`GITHUB_CLIENT_ID/SECRET/CALLBACK_URL`, `ADMIN_GITHUB_IDS` (exactly two
numeric GitHub user IDs), `SESSION_SECRET` (production). `GITHUB_REPO_TOKEN`
is optional for public repositories, but recommended as a fine-grained token
with read-only Contents permission for the central repository. Optional tuning:
`PORT`, `CLIENT_ORIGIN` (CORS allowlist, comma-separated), `TRUST_PROXY`,
`JSON_LIMIT`, rate-limit windows/maxima (`RL_*`), concurrency
(`CONC_WEBHOOK_*`), leaderboard weights (`LB_*`, `REPORT_TIMEZONE`),
central-repo relay (`CENTRAL_REPO_*`, `GITHUB_WEBHOOK_SECRET`).

## Auth model

- Students sign in via GitHub OAuth (`/auth/github/start` → authorize URL
  with random `state` → `/auth/github/callback` validates state/TTL,
  exchanges the code server-side, resolves the profile, then 302-redirects to
  the SPA `/auth/finish` page). Sessions are HttpOnly `SameSite=Lax` cookies
  (`dsa.sid`) backed by MongoDB (`connect-mongo`); only `{ userId }` is
  stored — role/status are re-read from MongoDB on every request.
- Admins are exactly the two GitHub numeric IDs in `ADMIN_GITHUB_IDS`
  (ADR-0002). There is no admin-registration endpoint; roles come only from
  the allowlist at OAuth-resolve time (removal demotes on next login).
- Mutations require the double-submit CSRF token (`GET /auth/csrf` →
  `X-CSRF-Token` header), including `/auth/logout` and `/access-requests`.
  OAuth callback and webhook use their own proofs (`state`, HMAC).

## Approval workflow

`pending → approved | rejected`, decided atomically (`findOneAndUpdate` on
`status: "pending"`; stale/repeat decisions → 409, unknown → 404).
Rejection sets `reapplyAfter = decidedAt + 24h` (server clock); early
reapplication → 403 `REAPPLICATION_LOCKED` + `Retry-After`. One pending
request per user is enforced by check-then-create plus a partial unique
index (concurrent duplicates → exactly one 201, rest 409). Approvals mint
the stable `STU0001…` ID + folder. Decisions are audit-logged.

## Assignments

Problems are created/edited/published/archived by admins
(publish-then-assign: only `published` problems can be assigned).
`COMMON` fans out to every approved student (one definition + per-student
targets, BR-04); `INDIVIDUAL` targets exactly the validated selection of
approved students (BR-05). Students read only entitled assignments
(other targets hidden). Reviews (`accept`/`sendback`) and all admin
mutations are audit-logged.

## Rate limiting & concurrency

MongoDB-backed fixed windows (shared across instances, TTL-cleaned), with
separate policies for general traffic, auth, access-request creation, admin
writes, and webhook intake; concurrency slots guard webhook intake. All
thresholds are env-configurable; defaults are operational placeholders
pending load/hosting data (docs defer exact numbers — see ADR-0003).
429 responses carry code `RATE_LIMITED` and a `Retry-After` header.

## API map (all JSON; errors `{ error: { code, message, details?, retryAfter? } }`)

| Method + path | Auth | Notes |
|---|---|---|
| `GET /api/v1/health`, `GET /api/v1/ready` | — | liveness / DB readiness |
| `GET /api/v1/auth/github/start` | auth-rate-limit | authorize URL + state |
| `GET /api/v1/auth/github/callback` | auth-rate-limit | state check → session → 302 to SPA |
| `GET /api/v1/auth/csrf` | — | CSRF token + cookie |
| `GET /api/v1/auth/me` | session | `{ user }` (role + accessState) |
| `POST /api/v1/auth/logout` | session + CSRF | destroys session |
| `POST /api/v1/access-requests` | student + CSRF + access-limit | 201 / 409 dup / 403 lock |
| `GET /api/v1/access-requests/me` | student | own latest request |
| `GET /api/v1/assignments`, `GET /api/v1/assignments/:id` | approved student | entitled only |
| `GET /api/v1/progress/me`, `GET /api/v1/leaderboard` | approved student | own report / rankings |
| `GET /api/v1/admin/access-requests` | admin | paginated queue |
| `POST /api/v1/admin/access-requests/:id/approve\|reject` | admin + write-limit + CSRF | atomic transition |
| `GET/POST /api/v1/admin/problems`, `PATCH /api/v1/admin/problems/:id` | admin + write-limit + CSRF | Zod-validated |
| `POST /api/v1/admin/problems/:id/publish\|archive` | admin + write-limit + CSRF | publish requires title+statement |
| `GET/POST /api/v1/admin/assignments` | admin (+write-limit for POST) + CSRF | common fan-out / individual selection |
| `GET /api/v1/admin/students`, `GET /api/v1/admin/students/:id/progress` | admin | reports |
| `GET /api/v1/admin/submissions/review-queue` | admin | flagged/pending evidence |
| `POST /api/v1/admin/submissions/:id/reviews` | admin + CSRF | `accept`/`sendback` |
| `GET /api/v1/admin/audit-log` | admin | append-only log |
| `GET /api/v1/admin/github/integration-status` | admin | HEALTHY/DEGRADED/NOT_CONFIGURED |
| `POST /api/v1/integrations/github/webhook` | HMAC + delivery-ID dedupe | raw body, 202 PENDING (intake only) |

Note: the API outline (`06-api-spec.md`) sketches `GET /api/v1/me`; the
implementation namespaces session endpoints as `/api/v1/auth/me` (the spec
permits route-name adjustment). Frontend `services/http.js` centralizes this map.

## Data model & indexes

`User` (githubUserId unique; studentId sparse-unique; role/accountStatus),
`AccessRequest` (partial unique `{user}` where pending; `reapplyAfter`
index), `Problem` (`status,createdAt`), `Assignment` (`targets.student`
index), `Submission` (unique student+assignment+commitSha), `ProgressEvent`
(sourceKey unique → idempotent leaderboard), `AuditLog` (createdAt),
`WebhookEvent` (deliveryId unique → idempotent intake), `RateBucket` (TTL),
`Slot` (concurrency leases), `Counter` (atomic student IDs).

## Tests

`npm test` runs 6 suites / 41 tests against per-file in-memory MongoDB
(`--test-concurrency=1` for stability under load): OAuth + RBAC, approval +
24h cooldown + concurrency, problems + common/individual assignments +
restart persistence, review/leaderboard/audit/integration, rate limits +
webhook HMAC/dedupe/slots, security headers/CORS/validation/error shape.
Verified: **41/41 pass**, `npm run lint` clean.

## Deployment notes & limitations

- Production needs HTTPS (secure cookies), `SESSION_SECRET` from a secret
  store, `CLIENT_ORIGIN` allowlist of the real frontend, `TRUST_PROXY=1`
  behind a proxy, and a MongoDB with transactions if future multi-document
  invariants need them (current writes use atomic single-document ops).
- Verification workers are deferred by design: webhook intake stores
  `PENDING` events; nothing is ever reported as verified without stored
  qualifying evidence (`ANALYSIS_PENDING`, never success).
- Leaderboard weights/window are configurable but the formula awaits
  professor sign-off (FR-LB-04); the live formula string is returned with
  every leaderboard response.
- No local MongoDB was available in this environment, so persistence was
  verified against isolated in-memory MongoDB (including a restart-persistence
  test), not a standalone server. Real GitHub OAuth credentials were not
  configured here — OAuth was verified with a stubbed GitHub client; the
  browser flow needs a registered OAuth App whose callback URL equals
  `GITHUB_CALLBACK_URL`.
