# 9. Test Plan

## 9.1 Test levels
- Unit tests: access-state transitions, 24-hour rule, assignment targeting, progress aggregation, leaderboard ranking and duplicate heuristics.
- Integration tests: GitHub OAuth, GitHub API/webhook processing, database transactions, queue retry/idempotency and report generation.
- End-to-end tests: student sign-in → approval → assigned PS → repository evidence → report.
- Security tests: role bypass, unapproved access, CSRF/state validation, webhook forgery, rate-limit bypass, secret leakage and path traversal.
- Performance tests: login bursts, simultaneous approval requests, webhook bursts, report generation and analysis queue saturation.
- Recovery tests: GitHub outage, worker crash, duplicate webhook, database interruption and retry behavior.

## 9.2 Minimum acceptance test cases
| ID | Scenario | Expected result |
|---|---|---|
| T-01 | Student signs in successfully but is not approved | Can view access status only; protected program data denied |
| T-02 | Unauthorized student attempts admin API | 403/denied; no state change |
| T-03 | Admin rejects a student | Reapply time set to rejection time + 24 hours |
| T-04 | Student reapplies before lock expires | Rejected with retry time |
| T-05 | Student reapplies after lock expires | New request accepted if other limits permit |
| T-06 | Duplicate pending request submitted | Only one pending request exists |
| T-07 | Admin creates common PS | Assignment target records created for eligible class students |
| T-08 | Admin assigns individual PS | Only targeted student and admins can see it |
| T-09 | Multiple commits modify one problem | Not counted as multiple solved problems |
| T-10 | Comment-only/format-only diff | Flagged as non-qualifying or needs review per policy |
| T-11 | GitHub webhook delivered twice | Duplicate processing does not duplicate progress |
| T-12 | GitHub API unavailable | Status shows pending/failure; no false verification |
| T-13 | Student code times out in sandbox | Job terminates within configured limits |
| T-14 | Rate limit exceeded | Request throttled server-side with retry information |
| T-15 | Similarity signal is high | Evidence is flagged; not automatically declared cheating |
| T-16 | Leaderboard is requested | Results are derived from stored qualifying events |
| T-17 | Admin changes assignment | Actor and change are recorded in audit log |
| T-18 | Repository folder name resembles another student's name | Stable ID mapping prevents identity collision |

## 9.3 Definition of done
A requirement is done only when:
- Its acceptance criteria pass.
- Authorization is tested at the API boundary.
- Failure and retry behavior is defined.
- Logs contain useful diagnostics but no secrets.
- Relevant documentation and migration/test coverage are updated.
