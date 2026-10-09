# ADR-0004 — Frontend dual-mode integration (live API + demo fallback)

Status: accepted.

## Context

Phase 1 shipped a mock-only UI; Phase 2 must persist auth, approvals,
problems, and assignments without redesigning approved screens. The UI shapes
(mock IDs like `STU001`, string target lists) differ from server shapes
(Mongo IDs, target objects, populated relations).

## Decision

- `VITE_API_BASE_URL` set → live mode: `services/http.js` (cookie session +
  CSRF, normalized errors) + `services/api.js` adapters normalize server
  payloads to the shapes existing screens consume (embedded problems,
  derived assignment status from stored submissions, STU-ID resolution).
  Call sites are unchanged; auth context reads role/approval from `/auth/me`.
- Empty → demo mode: original mock behavior (labelled in UI). `node --test`
  therefore still exercises the documented business-rule fixtures.
- New live-only capabilities: OAuth start/finish pages, real approval queue,
  problem CRUD via publish/archive transitions, assignment creation with a
  validated student selector, and 14 live-adapter tests with stubbed fetch.

## Consequences

- Good: no screen redesign, no fake success states, demo stays usable
  offline; backend stays the authority (adapters never invent verification).
- Cost: adapters must track API shape changes; student problem catalog is
  derived from entitled assignments (no separate student catalog endpoint).
- Known gap fixed here: the admin access-request serializer dropped populated
  GitHub logins (`"[object Object]"` userId) — now serializes them; assignment
  payloads include full problem text for the detail screen.
