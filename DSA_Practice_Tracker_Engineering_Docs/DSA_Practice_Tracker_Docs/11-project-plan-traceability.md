# 11. Project Plan, Risk Register and Traceability

## 11.1 Suggested delivery sequence
1. Requirements baseline and open decisions.
2. Data model and access-state rules.
3. Authentication, admin authorization and approval workflow.
4. PS catalog and common/individual assignment workflow.
5. Central GitHub repository configuration and student folder mapping.
6. Evidence ingestion and idempotent processing.
7. Verification outcomes and individual progress report.
8. Leaderboard using approved scoring rules.
9. Security, rate-limit, performance and recovery testing.
10. Deployment, monitoring and operational handover.

## 11.2 Risk register
| Risk | Impact | Mitigation |
|---|---|---|
| Folder/identity mismatch | Incorrect student report | Stable internal ID + GitHub numeric ID mapping |
| Raw commit count gaming | Misleading leaderboard | Count qualifying problem/progress events, not commits |
| False duplicate detection | Unfair flags | Show evidence, tune thresholds, human review |
| False correctness confidence | Incorrect progress | Explicit verification policy and visible test coverage |
| GitHub outage/rate limits | Delayed reports | Queue, backoff, status visibility and reconciliation |
| Untrusted code execution | Service compromise | Isolated sandbox and strict resource limits |
| Admin privilege escalation | Unauthorized control | Pre-authorized roles, server checks, audit log |
| Duplicate webhook | Double-counted activity | Idempotency keys and unique constraints |
| Request burst overload | Service degradation | Shared rate limits, bounded queue and concurrency caps |
| Ambiguous leaderboard formula | Student disputes | Publish formula and scoring period before launch |

## 11.3 Requirements traceability
| Requirement group | Main implementation module | Primary tests |
|---|---|---|
| FR-AUTH | Identity & Access | T-01 to T-06 |
| FR-PS | PS & Assignment | T-07, T-08, T-17 |
| FR-GH | GitHub Integration | T-09, T-11, T-12, T-18 |
| FR-PROG | Verification/Reporting | T-09 to T-13, T-15 |
| FR-LB | Leaderboard | T-09, T-16 |
| FR-RATE | Edge/API protection and worker controls | T-14 |
| FR-AUD | Admin Audit | T-17 |
| NFR-SEC | All protected modules | T-02, T-13, T-14 and security suite |

## 11.4 Change control
The agreed product features are locked. A change to scope must be explicitly requested. Technical choices required to implement the locked scope may be decided through ADRs; they must not silently add product features.
