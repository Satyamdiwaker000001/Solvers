# DSA Practice Tracker — Frontend (Phase 1)

Responsive React + Vite + JavaScript + Tailwind CSS UI for the student and
professor-admin workflows defined in the project SRS and UI/UX specification.
**Demo only:** all data is mocked, nothing persists, there is no real
authentication. See `IMPLEMENTATION_PLAN.md` for locked scope, open decisions,
and the backend integration contract.

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

Copy `.env.example` to `.env` when the backend exists and set
`VITE_API_BASE_URL`. It is ignored until Phase 2.

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

## Demo limitations

- Persona buttons on `/sign-in` replace GitHub OAuth; the rejected-persona
  cooldown is computed at sign-in time and labelled demo-only.
- Mutations (approve/reject, create problem, record review) update in-memory
  mock data and reset on reload.
- `ProtectedRoute` is client-side convenience; server-side authorization is
  still required (NFR-SEC-01).
- Manual browser verification (keyboard walkthrough, screen reader, device
  matrix) has **not** been performed in this environment; automated static
  checks cover tokens, focus management wiring, contrast ratios, and
  responsive patterns. See test output for details.
