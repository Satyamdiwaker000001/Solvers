# DSA Practice Tracker — Frontend (Phase 2)

Responsive React + Vite + JavaScript + Tailwind CSS UI for the student and
professor-admin workflows defined in the project SRS and UI/UX specification.
See `IMPLEMENTATION_PLAN.md` for locked scope, open decisions,
and the backend integration contract.

Two modes (`VITE_API_BASE_URL` in `.env`, see `.env.example`):

- **Live mode** (base URL set): real GitHub-OAuth sessions, server-driven
  approval state, and problem/assignment workflows persisted through the
  Express + MongoDB backend (`../backend`). No mock success messages.
- **Demo mode** (empty): mock personas + in-memory data, labelled
  "Demo mode" in the UI. `npm test` always runs in demo mode.

## Setup

Requirements: Node.js 20+ and npm.

```powershell
npm install
npm run dev      # start local dev server with HMR
npm run preview  # serve the production build locally
```

## Commands

| Command         | What it does                                              |
|----------------|-----------------------------------------------------------|
| `npm run dev`  | Local dev server                                          |
| `npm test`     | Automated checks: `node --test tests/` (no extra deps)    |
| `npm run lint` | `oxlint` static analysis (0 errors expected)              |
| `npm run build`| Production build to `dist/` (must pass before handover)  |

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to run
against the backend (leave empty for demo mode).

## Structure

```
src/
  main.jsx, App.jsx, styles/globals.css   # entry, routes, Tailwind v4 tokens
  config/ lib/                            # navigation, formatting helpers
  mocks/data.js                           # ALL demo data (clearly labelled MOCK)
  services/api.js                         # mock-backed service layer (stable signatures)
  services/http.js                        # real fetch client stub (unused until backend)
  context/                                # mock Auth personas + toasts
  components/ hooks/                      # reusable UI, focus + reduced-motion hooks
  layouts/                                # student/admin shells, route guards
  features/                               # auth, dashboards, problems, activity,
                                          # reports, leaderboard, approval,
                                          # students, review, admin ops
  pages/                                  # 403 / 404
tests/                                    # node:test suites (logic, integrity, a11y)
```

## Demo limitations (demo mode only)

- Persona buttons on `/sign-in` replace GitHub OAuth; the rejected-persona
  cooldown is computed at sign-in time and labelled demo-only.
- Mutations (approve/reject, create problem, record review) update in-memory
  mock data and reset on reload.
- In live mode these flows use the backend: OAuth + server sessions,
  server-enforced 24-hour reapply lock, persisted problems/assignments, and
  an individual-assignment student selector. Assignment confirmation without
  a backend reports an honest error, never a fake success.
- `ProtectedRoute` is client-side convenience; server-side authorization is
  still enforced on every request (NFR-SEC-01).
- Manual browser verification (keyboard walkthrough, screen reader, device
  matrix) has **not** been performed in this environment; automated static
  checks cover tokens, focus management wiring, contrast ratios, and
  responsive patterns. See test output for details.
