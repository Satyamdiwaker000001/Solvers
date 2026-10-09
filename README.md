# DSA Practice Tracker

GitHub-evidence-based DSA practice tracking for students and professor-admins.
Source of truth: `DSA_Practice_Tracker_Engineering_Docs/DSA_Practice_Tracker_Docs/`
(SRS, architecture, DFD, data model, API spec, security, test plan) plus
`DSA_Practice_Tracker_UI_UX_Specification.docx`.

**Phase 1 (current): frontend foundation only.** The app in `frontend/` is a
responsive React UI running on realistic **mock data**. There is no backend yet:
no real GitHub OAuth, no database, no persistence across reloads. Every demo
surface is labelled as such in the UI.

## Layout

- `frontend/` — React + Vite + JavaScript + Tailwind CSS app (Phase 1 deliverable).
  See `frontend/README.md` and `frontend/IMPLEMENTATION_PLAN.md`.
- `DSA_Practice_Tracker_Engineering_Docs/` — engineering documentation (do not edit
  without going through requirements change control; product scope is locked).
- `DSA_Practice_Tracker_SRS.docx`, `DSA_Practice_Tracker_UI_UX_Specification.docx`
  — original specification documents.

## Quick start (frontend demo)

```powershell
cd frontend
npm install
npm run dev      # local dev server
npm test         # automated checks (Node built-in test runner)
npm run lint     # oxlint
npm run build    # production build to frontend/dist/
```

Open the dev server, then use the demo sign-in buttons (approved student,
pending applicant, rejected applicant, professor admin). All data resets on reload.

## Demo limitations (must read)

- Sign-in buttons are **mock personas**, not GitHub OAuth.
- The 24-hour rejection cooldown is **simulated client-side** for display;
  real enforcement will be server-side (`decided_at` + 24h).
- Leaderboard scores, verification outcomes, and audit entries are **illustrative
  mock data**, reproducible from `frontend/src/mocks/data.js`.
- Client-side route guards are convenience only; the backend must re-enforce
  every authorization check (NFR-SEC-01).

## Status

- [x] Phase 1 — frontend foundation (verified: `npm run lint`, `npm run build`, `npm test`)
- [ ] Phase 2 — backend (Express + MongoDB) per `06-api-spec.md` — **not started**
