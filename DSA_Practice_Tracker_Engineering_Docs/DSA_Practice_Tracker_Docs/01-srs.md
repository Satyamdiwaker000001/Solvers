# 1. Software Requirements Specification (SRS)

## 1.1 Purpose
Specify the functional and quality requirements for the DSA Practice Tracker. This SRS is the baseline for architecture, implementation, testing, and acceptance.

## 1.2 Scope
The system tracks students' DSA practice using evidence from one configured central GitHub repository. Two professor-admins manage problem statements and monitor student progress. Students authenticate through GitHub and must be approved before accessing the program.

### In scope
- Student GitHub authentication and access approval.
- Admin-only problem statement creation and assignment.
- Common class assignments and individual student assignments.
- Central repository integration with student-specific folders.
- Repository/commit/code-change analysis and student-wise reports.
- Activity leaderboard based on qualifying evidence.
- Server-side request throttling and protection.
- Audit records for administrative decisions.

### Out of scope unless separately approved
- Replacing GitHub as the code host.
- Proving beyond doubt that a student personally authored every line.
- Automatically determining academic dishonesty from similarity alone.
- A built-in online judge for every language/problem.
- Notebook or oral-assessment workflow as a separate feature.
- Weekend test management.

## 1.3 Technology baseline
- **LOCKED STACK:** MERN — MongoDB, Express.js, React, and Node.js.
- React is the browser UI; Express.js/Node.js provide the backend API and integration endpoints; MongoDB stores application records and derived progress data.
- This stack decision does not automatically decide hosting, queue technology, authentication/session library, GitHub App vs OAuth App, or sandbox technology. Those remain implementation decisions.
- Data validation, authorization, rate limiting, and approval checks must be enforced server-side, not only in React.

## 1.4 Users and roles
### Student
- Signs in using GitHub OAuth.
- Requests program access.
- Can access the student dashboard only after approval.
- Views common and individually assigned PS, status, and own progress.
- Uses the configured repository/folder workflow to submit code.

### Professor Admin 1 and Professor Admin 2
- Use separate authorized admin authentication.
- Create/edit/publish/archive problem statements.
- Assign a PS to the whole class or selected student(s).
- View student progress and reports.
- Review flagged/uncertain evidence.
- Approve or reject access requests.
- Administrative actions are recorded in an audit log.

## 1.5 Functional requirements
IDs are stable identifiers for traceability.

### Authentication and access
- FR-AUTH-01: Students shall authenticate through GitHub OAuth.
- FR-AUTH-02: GitHub authentication shall not automatically grant program access.
- FR-AUTH-03: A student without an approved account shall not access protected program data.
- FR-AUTH-04: Admin access shall be granted only to pre-authorized professor accounts; student self-registration shall never grant an admin role.
- FR-AUTH-05: The system shall distinguish Pending, Approved, Rejected, and Suspended/Disabled account states. Suspended/Disabled is an operational state proposed for account control and must be confirmed before implementation.
- FR-AUTH-06: On rejection, the student shall be unable to submit a new access request for 24 hours from the server-recorded rejection time.
- FR-AUTH-07: After the 24-hour lock expires, the student may submit a new request.
- FR-AUTH-08: At most one active pending access request shall exist per GitHub identity.

### Problem statement management
- FR-PS-01: Admins shall create a PS with a title and problem statement.
- FR-PS-02: A PS may include topic, difficulty, source URL, examples, constraints, and deadline where applicable.
- FR-PS-03: Admins shall publish common assignments for the class.
- FR-PS-04: Admins shall assign a PS to one or more selected students.
- FR-PS-05: The system shall retain assignment-to-student relationships so each student's completion can be tracked independently.
- FR-PS-06: Admins shall be able to edit or archive PS records. Exact rules for editing a published assignment with existing submissions are an open decision.

### GitHub repository integration
- FR-GH-01: The system shall connect to one configured central GitHub repository.
- FR-GH-02: Each approved student shall map to a stable internal student ID and linked GitHub identity.
- FR-GH-03: Each student shall have a separate repository folder; folder names alone shall not be used as identity proof.
- FR-GH-04: The system shall collect relevant commit metadata, changed paths, diffs, and code evidence using permitted GitHub access.
- FR-GH-05: The system shall associate evidence with a student and, where possible, a known PS/assignment.
- FR-GH-06: Repository analysis failure or missing evidence shall not be reported as successful verification.
- FR-GH-07: The system shall record evidence collection time so later repository changes can be distinguished from first-observed activity.

### Progress analysis and reports
- FR-PROG-01: The system shall generate an individual progress report from repository evidence.
- FR-PROG-02: Raw commit count shall not be treated as solved-problem count.
- FR-PROG-03: The system shall distinguish a new distinct problem from meaningful work on an existing problem.
- FR-PROG-04: The system shall flag likely duplicate or superficial changes such as comment-only edits, formatting-only edits, or renamed copies where detectable.
- FR-PROG-05: Similarity flags shall include supporting evidence and shall not by themselves be treated as proof of misconduct.
- FR-PROG-06: Where automated tests are configured and safe to run, the system may record compilation/test outcomes.
- FR-PROG-07: Reports shall distinguish verified, pending review, failed checks, and insufficient evidence.
- FR-PROG-08: Reports shall support daily and period-based summaries using a consistent server-side timezone policy. The timezone is an open configuration decision.

### Leaderboard
- FR-LB-01: The system shall display an activity leaderboard for approved students.
- FR-LB-02: Leaderboard ranking shall not be based only on commit count.
- FR-LB-03: Ranking shall use documented metrics derived from qualifying evidence, such as distinct verified problems and consistency.
- FR-LB-04: The scoring formula, time window, tie-breaks, and treatment of pending reviews must be configured before release.

### Request protection
- FR-RATE-01: Server-side rate limits shall apply to authentication and approval endpoints.
- FR-RATE-02: Concurrent request/processing limits shall protect the application and analysis workers.
- FR-RATE-03: Limits shall be configurable, and rejected requests shall return a safe retry response where appropriate.
- FR-RATE-04: Duplicate pending approval requests shall be prevented transactionally.
- FR-RATE-05: Rate limiting must work across all application instances, not only in local process memory, if the system is deployed with multiple instances.

### Admin audit
- FR-AUD-01: The system shall record access approval/rejection decisions, PS publishing/assignment changes, and review decisions.
- FR-AUD-02: Audit records shall include actor, action, target, timestamp, and relevant before/after state where appropriate.
- FR-AUD-03: Students shall not be able to modify admin audit records.

## 1.6 Non-functional requirements
- NFR-SEC-01: Enforce authorization on the server for every protected operation.
- NFR-SEC-02: Store OAuth secrets and tokens securely; never expose secrets in frontend code or logs.
- NFR-SEC-03: Use least-privilege GitHub permissions.
- NFR-SEC-04: Student code must not execute inside the trusted application process.
- NFR-REL-01: GitHub API failures shall be retried safely with bounded backoff; duplicate events shall be idempotently handled.
- NFR-DATA-01: Database constraints shall preserve one active access request per identity and valid student/assignment relationships.
- NFR-PERF-01: GitHub analysis and code testing shall run asynchronously so long tasks do not block normal dashboard requests.
- NFR-OBS-01: Operational errors, webhook processing, rate limiting, and analysis status shall be observable without logging secrets.
- NFR-MAINT-01: Modules shall separate identity/access, PS/assignment management, GitHub ingestion, verification, reports, and leaderboard logic.
- NFR-FAIR-01: The UI shall show why a submission was flagged and avoid presenting uncertain automated findings as definitive accusations.

## 1.7 Core business rules
- BR-01: GitHub login proves control of a GitHub account, not eligibility for program access.
- BR-02: Only approved students appear in official program tracking and leaderboard.
- BR-03: A rejection lock expires 24 hours after the server-recorded rejection time.
- BR-04: Common PS has a shared assignment definition and per-student completion records.
- BR-05: Individual PS is visible only to its assigned student(s) and authorized admins.
- BR-06: A commit is evidence of a repository change, not automatically evidence of a solved problem.
- BR-07: A problem counts as solved only when the system's defined verification policy has enough evidence; uncertain cases remain pending review.
- BR-08: A duplicate/similarity flag does not itself prove copying.
- BR-09: Leaderboard metrics must be calculated from recorded qualifying activity, not editable client values.

## 1.8 Acceptance criteria
- A student can sign in with GitHub but cannot access protected pages before approval.
- A rejected student cannot reapply before 24 hours have elapsed.
- Two authorized admins can create common and individual PS.
- A student's folder is mapped to their internal student ID and GitHub identity.
- A report shows evidence and does not count raw commits as solved problems.
- Duplicate/superficial changes can be flagged and inspected.
- Leaderboard values are reproducible from stored qualifying events.
- Rate limits and duplicate-request prevention are enforced server-side.
- Admin actions are auditable.
