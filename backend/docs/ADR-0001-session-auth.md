# ADR-0001 — Cookie sessions + double-submit CSRF

Status: accepted.

## Context

The API needs browser sessions for students and the two professor-admins
(FR-AUTH-01…04, NFR-SEC-01/02). Alternatives: stateless JWTs (localStorage or
cookies), or server-side sessions.

## Decision

Server-side sessions (`express-session` + `connect-mongo`), HttpOnly
`SameSite=Lax` cookie (`dsa.sid`, `secure` in production, 12h rolling). The
session stores only `{ userId }`; role and approval state are re-read from
MongoDB per request, so approvals, rejections, and admin revocation take
effect immediately and client-supplied roles can never escalate. State-changing
requests additionally require a double-submit CSRF token (`X-CSRF-Token`,
rotated at login); the OAuth callback uses its own `state` proof and the
webhook uses HMAC, so both stay exempt.

## Consequences

- Good: instant revocation, no token payload to keep consistent, XSS cannot
  read the session, CSRF covered for cookie flows.
- Cost: session store is a runtime dependency (MongoDB); horizontal scale
  works because the store is shared, not in-process.
- Rejected: JWT-in-localStorage (XSS exfiltration, revocation needs a
  denylist anyway); JWT-in-cookie without rotation/rotation story adds
  complexity for no gain here.
