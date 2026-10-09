# 7. GitHub Repository and Verification Design

## 7.1 Repository convention
**Proposed convention:**
```text
dsa-practice/
  README.md
  students/
    STU001/
      manifest.json
      arrays/
        two-sum.cpp
      strings/
        reverse-string.cpp
    STU002/
      manifest.json
      arrays/
        binary-search.cpp
```

`STU001` is an internal stable identifier. Display names must not be used as the only folder key. `manifest.json` may map a solution path to a stable problem/assignment ID, but the backend should validate the mapping and not blindly trust student-supplied metadata.

Example manifest (illustrative only):
```json
{
  "studentId": "STU001",
  "solutions": [
    {
      "problemId": "PS-0001",
      "assignmentId": "ASG-0001",
      "path": "arrays/two-sum.cpp",
      "language": "cpp"
    }
  ]
}
```

## 7.2 Evidence pipeline
1. Receive GitHub webhook or scheduled reconciliation event.
2. Validate webhook signature and delivery ID.
3. Resolve repository and branch against the configured allowlist.
4. Identify affected student folder from stable student ID.
5. Collect commit SHA, author metadata, timestamps, changed paths and diff.
6. Map changed files to known PS/assignment using validated metadata and assignment catalog.
7. Compare with prior evidence for that student and known historical solutions.
8. Classify changes: new solution candidate, meaningful modification, likely superficial edit, deletion/move, or unknown.
9. Optionally run configured tests in an isolated sandbox.
10. Persist findings and status; update progress only according to policy.

## 7.3 Suggested outcomes
- `VERIFIED`: required checks passed under the configured policy.
- `NEEDS_REVIEW`: evidence is ambiguous or similarity/test signal requires human review.
- `INCOMPLETE`: insufficient evidence or expected files are missing.
- `CHECK_FAILED`: configured technical checks failed.
- `INGESTION_PENDING` / `ANALYSIS_FAILED`: pipeline has not completed or failed operationally.

Avoid using `VERIFIED` to imply authorship is conclusively proven. It means the configured evidence policy was satisfied.

## 7.4 Meaningful change heuristics
Potential signals:
- Added executable logic vs comments/formatting only.
- Changed algorithmic statements vs renamed identifiers.
- Test outcomes and compile results.
- File/problem mapping consistency.
- Comparison against earlier versions and the student's own previous submissions.
- Exact and structural similarity to known submissions where policy permits.

These signals must be calibrated to avoid false positives. Similar code can arise from standard algorithms and identical assignments.

## 7.5 Progress event model
- `NEW_PROBLEM_VERIFIED`: counts as a distinct verified problem.
- `MEANINGFUL_PROGRESS`: can count toward activity/consistency but not as a new solved problem.
- `NO_QUALIFYING_CHANGE`: does not count as qualifying activity.
- `NEEDS_REVIEW`: excluded from verified totals until resolved.
- `CHECK_FAILED`: excluded from verified solved totals.

Do not count multiple commits for the same problem as multiple solved problems. Daily active-day calculation should use a consistent timezone and a defined qualifying-event rule.

## 7.6 Important limitation
GitHub evidence can support activity and technical verification, but cannot conclusively prove independent authorship. The system's goal is to measure initiative and consistency, and flag suspicious patterns for review—not to make unsupported accusations.
