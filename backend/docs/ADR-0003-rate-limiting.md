# ADR-0003 — MongoDB-backed rate limits + concurrency slots

Status: accepted.

## Context

FR-RATE-01…05 require server-side, configurable limits for auth, approvals,
admin writes, general traffic, and expensive/concurrent work — consistent
across instances (FR-RATE-05), with safe retry responses (FR-RATE-03).

## Decision

Fixed-window counters in a shared `RateBucket` collection (TTL-cleaned), one
policy per surface (general / auth / access-request / admin-write / webhook),
each env-tunable (`RL_*_WINDOW_MS`, `RL_*_MAX`). 429s return code
`RATE_LIMITED` with `Retry-After` (header + body). Concurrency uses short-lived
`Slot` leases with TTL self-healing (stale/crashed holders), released when the
response finishes; saturation → 429. Numeric defaults are operational
placeholders — the approved docs defer exact thresholds until load/hosting
are known, so no product quota was invented.

## Consequences

- Good: survives multi-instance deploys (unlike in-process counters); per-user
  vs per-IP keys where appropriate; tests cover each policy + retry headers.
- Cost: one indexed MongoDB op per request; clock skew across instances is
  bounded by window granularity (acceptable for throttling).
- Rejected: in-memory counters (break FR-RATE-05); external Redis (extra
  dependency the stack doesn't require yet — revisit if windows need
  sub-millisecond precision or the DB becomes the bottleneck).
