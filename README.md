# DSA Practice Tracker

GitHub-evidence-based DSA practice tracking for students and professor-admins.
Source of truth: `DSA_Practice_Tracker_Engineering_Docs/DSA_Practice_Tracker_Docs/`
(SRS, architecture, DFD, data model, API spec, security, test plan) plus
`DSA_Practice_Tracker_UI_UX_Specification.docx`.

**Phase 2 (current): full-stack.** `backend/` (Node.js + Express + MongoDB)
implements auth, approvals, problems, assignments, reports, rate limiting,
and webhook intake; `frontend/` runs against it in live mode or standalone
in labelled demo mode.

## Layout

- `frontend/` — React + Vite + JavaScript + Tailwind CSS app.
  See `frontend/README.md` and `frontend/IMPLEMENTATION_PLAN.md`.
- `backend/` — Express + MongoDB API (Phase 2 deliverable).
  See `backend/README.md` and `backend/docs/` (ADRs).
- `DSA_Practice_Tracker_Engineering_Docs/` — engineering documentation (do not edit
  without going through requirements change control; product scope is locked).
- `DSA_Practice_Tracker_SRS.docx`, `DSA_Practice_Tracker_UI_UX_Specification.docx`
  — original specification documents.

## Quick start (live mode)

```powershell
# 1. Backend
cd backend
Copy-Item .env.example .env   # fill in MongoDB URI, GitHub OAuth App, ADMIN_GITHUB_IDS
npm install
npm test                      # isolated in-memory MongoDB suite
npm run dev                   # :5000

# 2. Frontend (new terminal)
cd frontend
Copy-Item .env.example .env   # VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev
npm test; npm run lint; npm run build
```

Without `VITE_API_BASE_URL` the frontend runs in labelled demo mode
(mock personas, in-memory data, no persistence).

## Security notes (must read)

- Students sign in with GitHub OAuth; program access needs professor
  approval. Rejection locks reapplication for 24h by server time.
- Exactly two professor-admins, from `ADMIN_GITHUB_IDS` (numeric GitHub IDs).
  No public admin registration exists.
- Client-side route guards are convenience only; the backend re-enforces
  every authorization check (NFR-SEC-01).

## Status

- [x] Phase 1 — frontend foundation (verified: `npm run lint`, `npm run build`, `npm test`)
- [x] Phase 2 — backend (Express + MongoDB) per `06-api-spec.md` — implemented;
  backend 41/41 tests pass, frontend 44/44 pass, both lints clean, build passes.
  Remaining setup is external: MongoDB service, GitHub OAuth App credentials,
  and deployment secrets (see `backend/README.md` → limitations).
