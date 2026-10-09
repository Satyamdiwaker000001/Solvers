# DSA Practice Tracker — Engineering Documentation

**Document pack status:** Draft baseline for review  
**Product scope:** Locked to the requirements agreed so far  
**Technology stack:** MERN (MongoDB, Express.js, React, Node.js) is selected. Hosting, queue/worker mechanism, and exact supporting libraries remain open.

## Product summary
The DSA Practice Tracker helps two professor-admins publish common and individual DSA problem statements (PS), track student activity through a configured central GitHub repository, generate student-wise progress reports, and display an activity leaderboard. Students authenticate using GitHub and require admin approval before accessing the program.

## Locked scope
- Two authorized professor-admin accounts.
- Student sign-in through GitHub OAuth.
- First-time/unauthorized student access requires admin approval.
- Rejected applicants cannot submit another access request for 24 hours; after the lock expires, they may reapply.
- Admins can publish common PS for the class and individual PS for selected students.
- A configured central GitHub repository contains a separate folder for each student, mapped using a stable internal student ID and linked GitHub identity.
- The system analyzes repository activity and code evidence to generate student-wise progress reports.
- A leaderboard represents verified activity and consistency, not raw commit count.
- Server-side request limits protect login, approval, and other sensitive endpoints.
- Suspicious or uncertain evidence is flagged; it is not automatically treated as proof of misconduct.

## Key implementation principle
The repository is evidence, not infallible proof. A commit does not automatically equal a solved problem. Progress must be tied to a known problem/assignment and meaningful code evidence.

## Documents
- `01-srs.md` — Software Requirements Specification
- `02-architecture.md` — System architecture and component responsibilities
- `03-dfd.md` — DFD context, Level 1 and Level 2
- `04-uml-use-cases.md` — Actors, use cases, activity and sequence diagrams
- `05-data-model.md` — ERD, entities and data rules
- `06-api-spec.md` — API contract outline
- `07-github-verification.md` — Repository convention and verification pipeline
- `08-security.md` — Authentication, authorization, rate limiting and safe execution
- `09-test-plan.md` — Test strategy and acceptance criteria
- `10-deployment-operations.md` — Deployment, observability, backup and recovery
- `11-project-plan-traceability.md` — Milestones, risk register and requirements traceability
- `12-open-decisions.md` — Decisions that must be made before implementation
- `diagrams/` — Standalone Mermaid diagrams

## Status terminology
- **LOCKED:** Directly agreed product requirement.
- **PROPOSED DESIGN:** Implementation detail suggested to make the requirement coherent; validate before coding.
- **OPEN:** Must be decided before the relevant implementation phase.
