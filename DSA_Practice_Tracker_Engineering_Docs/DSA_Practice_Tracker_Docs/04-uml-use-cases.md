# 4. UML / Use Cases

## 4.1 Use case diagram
```mermaid
flowchart LR
  S[Student]
  A[Professor Admin]
  GH[GitHub]
  UC1((Sign in with GitHub))
  UC2((Request program access))
  UC3((View assigned PS))
  UC4((View progress report))
  UC5((View leaderboard))
  UC6((Create and publish PS))
  UC7((Assign common/individual PS))
  UC8((Approve/reject student))
  UC9((Review flagged evidence))
  UC10((Analyze repository activity))
  S --> UC1
  S --> UC2
  S --> UC3
  S --> UC4
  S --> UC5
  A --> UC6
  A --> UC7
  A --> UC8
  A --> UC9
  GH --> UC1
  GH --> UC10
```

## 4.2 Student access activity
```mermaid
flowchart TD
  Start([Start]) --> Login[Sign in with GitHub]
  Login --> Auth{OAuth identity valid?}
  Auth -->|No| Error[Show sign-in error]
  Auth -->|Yes| State{Program access approved?}
  State -->|Yes| Dashboard[Open student dashboard]
  State -->|Pending| Pending[Show pending status]
  State -->|Rejected and under 24h| Locked[Show reapplication time]
  State -->|Rejected and 24h elapsed| Request[Allow new access request]
  Request --> Pending
```

## 4.3 Repository event sequence
```mermaid
sequenceDiagram
  participant GH as GitHub
  participant API as Web/API
  participant Q as Background Queue
  participant W as Verification Worker
  participant DB as Database
  participant UI as Dashboard

  GH->>API: Webhook event
  API->>API: Validate signature and delivery ID
  API->>Q: Enqueue accepted event
  API-->>GH: Acknowledge quickly
  Q->>W: Deliver event
  W->>GH: Fetch commit/diff as permitted
  GH-->>W: Repository evidence
  W->>DB: Store evidence and analysis result
  W->>DB: Update qualifying progress event
  UI->>DB: Request report
  DB-->>UI: Report and verification status
```

## 4.4 Use-case notes
- Student-facing endpoints must check approval on the server.
- Admin use cases require a server-side admin role.
- GitHub ingestion is asynchronous and idempotent.
- Review flags must show evidence and reason.
