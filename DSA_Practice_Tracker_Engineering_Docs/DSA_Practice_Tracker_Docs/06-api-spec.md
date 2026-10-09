# 6. API Specification Outline

This is a contract outline, not a final OpenAPI schema. Route names can be adjusted to the selected framework.

## 6.1 General rules
- Use versioned routes such as `/api/v1/...`.
- Require authenticated sessions/tokens.
- Enforce authorization and approval on the server.
- Use pagination for lists.
- Validate input and return stable error codes.
- Never accept a client-submitted leaderboard score or verification status as authoritative.
- Make webhook processing idempotent.
- Apply rate limits to authentication, approval, admin mutations, and expensive report/analysis operations.

## 6.2 Authentication and access
- `GET /api/v1/auth/github/start` — start OAuth flow.
- `GET /api/v1/auth/github/callback` — handle OAuth callback and resolve GitHub identity.
- `GET /api/v1/me` — return current account and access state.
- `POST /api/v1/access-requests` — create a request if eligible and not rate-limited.
- `GET /api/v1/access-requests/me` — view own request status.
- `GET /api/v1/admin/access-requests` — admin-only list, paginated.
- `POST /api/v1/admin/access-requests/{id}/approve` — admin approval.
- `POST /api/v1/admin/access-requests/{id}/reject` — admin rejection; server sets `reapply_after = decided_at + 24 hours`.

## 6.3 PS and assignments
- `POST /api/v1/admin/problems`
- `PATCH /api/v1/admin/problems/{id}`
- `POST /api/v1/admin/problems/{id}/publish`
- `POST /api/v1/admin/assignments` — common or individual assignment.
- `GET /api/v1/assignments` — student sees only applicable assignments.
- `GET /api/v1/assignments/{id}` — access-checked details.

## 6.4 GitHub and reports
- `POST /api/v1/integrations/github/webhook` — signature-validated endpoint.
- `GET /api/v1/admin/github/integration-status` — admin-only health status.
- `GET /api/v1/progress/me` — own report.
- `GET /api/v1/admin/students/{studentId}/progress` — admin-only student report.
- `GET /api/v1/leaderboard` — approved-student leaderboard.
- `GET /api/v1/admin/submissions/review-queue` — flagged or uncertain cases.
- `POST /api/v1/admin/submissions/{id}/reviews` — record review decision/comment.

## 6.5 Suggested error codes
- `AUTH_REQUIRED`
- `ACCESS_PENDING`
- `ACCESS_NOT_APPROVED`
- `REAPPLICATION_LOCKED` with `retry_after`
- `RATE_LIMITED` with `retry_after`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `GITHUB_INTEGRATION_UNAVAILABLE`
- `VERIFICATION_PENDING`
- `IDEMPOTENCY_CONFLICT`

## 6.6 OAuth and webhook cautions
- Use OAuth `state` to prevent CSRF.
- Validate redirect URI and never accept arbitrary redirects.
- Request only the GitHub permissions needed for the chosen repository model.
- Validate webhook signature against the configured secret.
- Do not trust repository paths, commit author fields, or webhook bodies until validated and mapped.
