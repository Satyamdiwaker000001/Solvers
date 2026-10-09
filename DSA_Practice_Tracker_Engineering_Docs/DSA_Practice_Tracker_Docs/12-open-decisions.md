# 12. Open Decisions Before Implementation

These are implementation decisions, not invitations to expand product scope. The core MERN stack is locked.

## Blocking decisions
1. Hosting platform and environment topology for the selected MERN stack.
2. GitHub integration model: OAuth App vs GitHub App and the minimum repository permissions required.
3. Repository access/write model: who can push to the central repository, how folders are protected, and how identity is mapped.
4. Repository convention: branch policy, folder layout, file naming, and stable PS/assignment metadata.
5. Supported languages and whether code is executed or only statically analyzed in the first release.
6. Verification policy: exact criteria for `VERIFIED`, `NEEDS_REVIEW`, `INCOMPLETE`, and `CHECK_FAILED`.
7. Leaderboard formula: metrics, time window, tie-breaks, and treatment of pending review.
8. Timezone and definition of a daily active event.
9. Numeric rate limits and concurrency caps, based on expected student count and hosting.
10. Admin provisioning: how the two professor accounts are securely created and recovered.
11. Queue/worker technology for asynchronous GitHub analysis.
12. Session/authentication library and secure session storage.

## Important clarifications
- A folder name alone does not prove that a commit was authored by the corresponding student.
- If students all have write access to one central repository, repository permissions may not isolate their folders. A trusted contribution process or enforced server-side mapping may be needed.
- GitHub OAuth authenticates the GitHub account; it does not automatically grant write access to the repository.
- A commit timestamp may be backdated. Store first-observed time and server-side ingestion time.
- Similarity detection is a signal, not conclusive proof of plagiarism.
- “Verified” means the configured evidence policy passed; it does not prove independent authorship beyond doubt.

## Decision record template
- Decision ID:
- Title:
- Status: Proposed / Accepted / Rejected / Superseded
- Context:
- Options considered:
- Decision:
- Consequences:
- Date / owner:
