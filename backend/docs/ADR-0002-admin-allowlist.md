# ADR-0002 — Exactly two admins from a server-side allowlist

Status: accepted.

## Context

FR-AUTH-04 requires admin access for exactly two pre-authorized professor
accounts; students must never self-promote (NFR-SEC-01). GitHub logins can
change, so identity must key on the stable numeric GitHub user ID (data model
§5.2).

## Decision

`ADMIN_GITHUB_IDS` must contain exactly two distinct numeric GitHub user IDs
(fail-fast at boot otherwise). At OAuth-resolve time the server — and only
the server — sets `role: "admin"` / `approved` for allowlisted IDs; everyone
else becomes a `pending` student. An existing admin missing from a new
configuration is demoted to the student flow on next login (revocation).
No registration/promotion endpoint exists; `requireAdmin` re-checks the DB
role on every privileged route.

## Consequences

- Good: no privilege-escalation path from client input; rotation = config
  change + redeploy; revocation tested.
- Cost: adding/removing a professor is an operator action, not UI (matches
  the locked two-admin scope).
- Rejected: email matching or client-supplied roles (spoofable); DB-seeded
  admin flag without config binding (drifts silently).
