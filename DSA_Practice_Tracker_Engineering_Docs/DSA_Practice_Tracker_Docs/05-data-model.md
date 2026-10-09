# 5. Data Model and ERD

## 5.1 ER diagram
```mermaid
erDiagram
  USER ||--o{ ACCESS_REQUEST : submits
  USER ||--o| GITHUB_IDENTITY : links
  USER ||--o{ ASSIGNMENT_TARGET : receives
  PROBLEM ||--o{ ASSIGNMENT : references
  ASSIGNMENT ||--o{ ASSIGNMENT_TARGET : targets
  USER ||--o{ SUBMISSION : owns
  ASSIGNMENT ||--o{ SUBMISSION : receives
  SUBMISSION ||--o{ REPOSITORY_EVIDENCE : supported_by
  SUBMISSION ||--o{ VERIFICATION_RESULT : evaluated_by
  USER ||--o{ REVIEW : reviews_or_is_reviewed
  USER ||--o{ AUDIT_LOG : performs
  USER ||--o{ PROGRESS_EVENT : earns

  USER {
    uuid id PK
    string display_name
    string role
    string account_status
    datetime created_at
  }
  GITHUB_IDENTITY {
    uuid id PK
    uuid user_id FK
    string github_user_id
    string github_login
    datetime linked_at
  }
  ACCESS_REQUEST {
    uuid id PK
    uuid user_id FK
    string status
    datetime submitted_at
    datetime decided_at
    datetime reapply_after
    uuid decided_by FK
  }
  PROBLEM {
    uuid id PK
    string title
    text statement
    string topic
    string difficulty
    string source_url
    string status
  }
  ASSIGNMENT {
    uuid id PK
    uuid problem_id FK
    string assignment_type
    datetime assigned_at
    datetime due_at
    string instructions
    string status
  }
  ASSIGNMENT_TARGET {
    uuid id PK
    uuid assignment_id FK
    uuid student_id FK
    string completion_status
  }
  SUBMISSION {
    uuid id PK
    uuid student_id FK
    uuid assignment_id FK
    string repository
    string commit_sha
    string status
    datetime first_observed_at
  }
  REPOSITORY_EVIDENCE {
    uuid id PK
    uuid submission_id FK
    string event_id
    string file_path
    string evidence_type
    string content_hash
    datetime observed_at
  }
  VERIFICATION_RESULT {
    uuid id PK
    uuid submission_id FK
    string outcome
    decimal similarity_score
    text findings
    datetime evaluated_at
  }
  REVIEW {
    uuid id PK
    uuid submission_id FK
    uuid reviewer_id FK
    string decision
    text comment
    datetime reviewed_at
  }
  PROGRESS_EVENT {
    uuid id PK
    uuid student_id FK
    string event_type
    string source_key
    datetime occurred_at
  }
  AUDIT_LOG {
    uuid id PK
    uuid actor_id FK
    string action
    string target_type
    string target_id
    datetime created_at
  }
```

## 5.2 Design rules
- Use immutable GitHub numeric user ID as the external identity key where available; GitHub login can change.
- Use a stable internal student ID for the folder mapping, not a display name.
- Enforce uniqueness for GitHub identity and for the active pending access request.
- Use foreign keys for student, assignment, submission and review relationships.
- Store GitHub access tokens in a secure secret store or encrypted credential storage; never store plaintext tokens in ordinary user records.
- Preserve raw evidence references and timestamps so a result can be explained and audited.
- Store similarity scores as signals, not as a definitive cheating verdict.
- A common assignment has one assignment definition and separate target/completion records for each student.
- Keep raw repository evidence separate from derived progress events so analysis rules can evolve without losing source history.

## 5.3 Open data decisions
- Database engine and migration tool.
- Retention policy for code diffs and raw evidence.
- Whether report snapshots are persisted or computed on demand.
- Exact states and transitions for PS, assignment, submission and review.
