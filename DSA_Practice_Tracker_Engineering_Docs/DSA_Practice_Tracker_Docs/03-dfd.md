# 3. Data Flow Diagrams (DFD)

DFDs describe data movement, not code structure. Mermaid flowcharts below are readable approximations of DFDs.

## 3.1 Context diagram (Level 0)
```mermaid
flowchart LR
  S[Student] -->|GitHub sign-in, access request, repository activity| SYS((DSA Practice Tracker))
  SYS -->|Access status, assigned PS, progress report, leaderboard| S
  A[Professor Admin 1] -->|PS management, assignment, approval/review actions| SYS
  B[Professor Admin 2] -->|PS management, assignment, approval/review actions| SYS
  SYS -->|Student requests, progress reports, flags, leaderboard| A
  SYS -->|Student requests, progress reports, flags, leaderboard| B
  GH[GitHub OAuth / Repository API] <-->|Identity and repository evidence| SYS
```

## 3.2 DFD Level 1
```mermaid
flowchart TB
  S[Student]
  A[Professor Admins]
  GH[GitHub]
  P1((1.0 Identity and Access))
  P2((2.0 PS and Assignment Management))
  P3((3.0 GitHub Evidence Ingestion))
  P4((4.0 Verification and Progress Calculation))
  P5((5.0 Reports and Leaderboard))
  D1[(D1 Users and Access Requests)]
  D2[(D2 Problems and Assignments)]
  D3[(D3 Repository Evidence)]
  D4[(D4 Verification and Progress Events)]
  D5[(D5 Audit Log)]
  S -->|OAuth identity and access request| P1
  A -->|Approve/reject decision| P1
  P1 <--> D1
  A -->|Create/edit/publish PS| P2
  S -->|View assigned PS| P2
  P2 <--> D2
  P2 --> D5
  GH -->|Webhook/API repository evidence| P3
  P3 <--> D3
  P3 --> P4
  D2 --> P4
  D1 --> P4
  P4 <--> D4
  P4 --> D5
  D4 --> P5
  D2 --> P5
  P5 -->|Individual reports and leaderboard| S
  P5 -->|Class monitoring and flags| A
```

## 3.3 DFD Level 2 — GitHub verification
```mermaid
flowchart TB
  GH[GitHub repository/webhook]
  V1((4.1 Validate event and delivery))
  V2((4.2 Resolve repository path to student))
  V3((4.3 Fetch commit, diff and files))
  V4((4.4 Map evidence to PS/assignment))
  V5((4.5 Analyze meaningful changes and similarity))
  V6((4.6 Optional isolated tests))
  V7((4.7 Store outcome and qualifying progress))
  D1[(Repository configuration and student mapping)]
  D2[(Assignment/PS data)]
  D3[(Raw evidence)]
  D4[(Verification results and progress events)]
  GH --> V1 --> V2
  D1 --> V2
  V2 --> V3
  V3 --> D3
  V3 --> V4
  D2 --> V4
  V4 --> V5
  V5 --> V6
  V5 --> V7
  V6 --> V7
  V7 --> D4
```

## 3.4 DFD Level 2 — access approval
```mermaid
flowchart TB
  S[Student]
  GH[GitHub OAuth]
  P1((1.1 Authenticate GitHub identity))
  P2((1.2 Check account/approval state))
  P3((1.3 Enforce rate and reapplication limits))
  P4((1.4 Create pending request))
  A[Professor Admin]
  P5((1.5 Approve or reject))
  D1[(Users and access requests)]
  D2[(Audit log)]
  S --> GH --> P1 --> P2
  D1 --> P2
  P2 -->|Not approved| P3
  P3 -->|Allowed| P4 --> D1
  A --> P5
  P5 --> D1
  P5 --> D2
  P2 -->|Approved| S
```

## DFD rules
- Every process that changes access, assignments or verification state must persist the outcome.
- The repository is an external evidence source; the application database is the source of truth for approval state, assignments and computed results.
- Do not let browser-supplied values determine verified progress or leaderboard scores.
