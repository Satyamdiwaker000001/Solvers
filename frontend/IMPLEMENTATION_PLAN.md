# DSA Practice Tracker — Frontend Implementation Plan & Status

> Source of truth: `DSA_Practice_Tracker_Engineering_Docs/DSA_Practice_Tracker_Docs/`
> (`01-srs.md` … `12-open-decisions.md`) + `DSA_Practice_Tracker_UI_UX_Specification.docx`.
> No product feature was added, removed, or changed. Open product decisions are listed below, not resolved unilaterally.

## 1. Locked requirements (what the frontend implements, presentation only)

- **Auth & access (FR-AUTH-01…08, BR-01…03):** GitHub sign-in screen, pending state, rejected state with
  server-time 24-hour retry messaging, one-pending-request rule messaging. Two visually distinct admin logins.
- **Problem statements (FR-PS-01…06, BR-04/05):** admin create/edit form (title, statement, topic, difficulty,
  examples, constraints, source URL, status), common vs individual assignment dialog, per-student visibility.
- **GitHub evidence (FR-GH-01…07, BR-06/07):** activity timeline, evidence panels (path, commit, diff stats,
  observed time), verification outcomes `VERIFIED / NEEDS_REVIEW / INCOMPLETE / CHECK_FAILED / INGESTION_PENDING`.
- **Reports (FR-PROG-01…08, NFR-FAIR-01):** student report grouped by outcome; similarity shown as a *review
  signal with evidence, never as a misconduct verdict; commit count never presented as solved count.
- **Leaderboard (FR-LB-01…04, BR-09):** formula + time window displayed next to rankings; reproducible from
  stored qualifying events (mocked for now).
- **Audit (FR-AUD-01…03):** admin audit-log screen; mutations toast “demo” and append locally.
- **UI/UX spec:** approved tokens (canvas `#E8EBF7`, surface `#FFFFFF`, secondary `#ACBED8`, primary `#D78521`,
  hover `#A96112`, highlight `#F2D398`, danger `#DE1A1A`, ink `#202538`, muted `#596477`, border `#D1D9E8`,
  success `#246B49`), Inter type,
  sidebar → drawer responsive shell, tables → cards on narrow screens, loading/empty/error/success states,
  keyboard focus, `prefers-reduced-motion`, non-color status cues (icon + label).

## 2. Unresolved decisions / contradictions (need explicit answers, NOT decided in code)

1. `Suspended/Disabled` account state (FR-AUTH-05) is only proposed — UI renders PENDING/APPROVED/REJECTED only.
2. Edit rules for published assignments with submissions (FR-PS-06) — form warns it never rewrites history.
3. Verification thresholds for `VERIFIED` vs `NEEDS_REVIEW` (doc 12 §6) — mock outcomes are illustrative.
4. Leaderboard formula/time window/tie-breaks (FR-LB-04) — UI shows a *placeholder* formula string; backend must own it.
5. Server timezone for daily summaries (FR-PROG-08) — mocked as “UTC (proposed)”.
6. Rate-limit numbers, queue/worker tech, session library, GitHub App vs OAuth App, hosting, sandbox,
   admin provisioning (doc 12 blockers 1,2,9–12) — all backend; frontend only surfaces retry messaging.
7. Spec §9 recommends shadcn/ui + TanStack Query + RHF/Zod; this build uses hand-rolled accessible primitives
   + fetch-style service layer instead (fewer deps, same contracts). Adopting them later is a refactor, not a feature change.

## 3. Project structure (`frontend/`)

```
src/
  app entry:        main.jsx, App.jsx (routes), styles/globals.css (Tailwind v4 @theme tokens)
  config/           navigation.js (role-aware nav)
  lib/              format.js (dates, sha, outcome metadata)
  mocks/            data.js  ← ALL demo data lives here, clearly labelled MOCK
  services/         api.js   ← mock-backed, same signatures the backend will keep
                    http.js  ← real fetch client stub (unused until backend exists)
  context/          AuthContext.jsx (MOCK personas), ToastContext.jsx
  components/       ui/ (Button, Badge, Card, Field, Dialog, States, GithubMark)
                    data-display/ (EvidencePanel, ActivityChart — lazy-loaded)
                    layout/ (Chrome: Sidebar/Topbar/Toasts)
  layouts/          AppLayouts.jsx (Student/Admin shells + ProtectedRoute, client-side only)
  features/         auth/ dashboard/ problems/ github-activity/ reports/
                    leaderboard/ approval/ students/ review/ admin/
  pages/            SystemPages.jsx (403/404)
```

## 4. Routes

- Public: `/sign-in`, `/admin-login`, `/access-status`, `/forbidden`
- Student (`/app`): `dashboard`, `problems`, `problems/:id`, `activity`, `report`, `leaderboard`
- Admin (`/admin`): `dashboard`, `requests`, `problems`, `problems/new`, `problems/:id/edit`,
  `students`, `students/:id`, `review`, `review/:id`, `leaderboard`, `integration`, `audit`

## 5. Demo honesty

- “Demo mode” badge on auth screens, sidebar, and footer; toasts say “(demo)” for mutations.
- `AuthContext` personas: approved student, pending applicant, rejected applicant, professor admin.
- `ProtectedRoute` is client-side convenience only — docstring states the backend must re-enforce NFR-SEC-01.
- No claim of working OAuth, persistence, or verification anywhere in UI copy.

## 6. Checks run

- `npm run lint` (oxlint): **0 errors**, 3 benign warnings (context-hook export pattern ×2, data-fetch effect ×1).
- `npm run build` (vite): **passes**; Recharts code-split into lazy chunk (`ActivityChart-*.js`).
- `vite preview` smoke test: **HTTP 200**.
- Responsive: mobile-first Tailwind; drawer nav < `lg`; tables scroll inside `.table-scroll` or collapse to
  cards; dialogs fit viewport with internal scroll. Manual device-matrix check (320→1920) still recommended.

## 7. Remaining work (backend phase — do NOT start until this foundation is approved)

1. Confirm open decisions §2 with professors; record ADRs.
2. Implement Express API per `06-api-spec.md`; point `services/api.js` at `services/http.js` (`VITE_API_BASE_URL`).
3. Replace `AuthContext` mock with real session (`GET /api/v1/me`); keep role-aware nav.
4. E2E tests T-01…T-18 per `09-test-plan.md`; visual regression at required widths.
