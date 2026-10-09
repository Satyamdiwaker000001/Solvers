import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * MOCK auth — demo only. There is no real GitHub OAuth, session, or persistence.
 * `signInAs(role)` simply selects a demo persona so every workflow is clickable.
 * ProtectedRoute enforces the selected role client-side; the future backend
 * must re-enforce FR-AUTH/FR-PS authorization server-side (NFR-SEC-01).
 *
 * Demo cooldown note: the rejected persona's `reapplyAfter` is computed
 * relative to sign-in time (not a hard-coded timestamp) so the 24-hour-lock
 * UI stays testable. Real cooldown enforcement belongs to the backend
 * (server-recorded `decided_at` + 24h, FR-AUTH-06); this is display-only.
 */
const AuthContext = createContext(null);

/** Demo lock length in hours — keeps the countdown visible but testable. */
export const DEMO_LOCK_HOURS = 14;

const PERSONAS = {
  student: { role: "student", name: "Aarav Sharma", studentId: "STU001", githubLogin: "aarav-codes", accessState: "APPROVED" },
  pending: { role: "student", name: "New Applicant", studentId: null, githubLogin: "newbie-dev-99", accessState: "PENDING" },
  rejected: { role: "student", name: "Loop Learner", studentId: null, githubLogin: "loop-learner", accessState: "REJECTED" },
  admin: { role: "admin", name: "Prof. Rao", studentId: null, githubLogin: "prof-rao", accessState: "APPROVED" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signInAs = useCallback((key) => {
    const persona = { ...PERSONAS[key] };
    if (key === "rejected") {
      persona.reapplyAfter = new Date(Date.now() + DEMO_LOCK_HOURS * 3_600_000).toISOString();
    }
    setUser(persona);
  }, []);
  const signOut = useCallback(() => setUser(null), []);

  /** Demo-only: simulate the lock expiring so the reapply branch is testable. */
  const expireDemoLock = useCallback(() => {
    setUser((u) => (u ? { ...u, reapplyAfter: new Date(Date.now() - 1_000).toISOString() } : u));
  }, []);

  const value = useMemo(
    () => ({ user, isDemo: true, signInAs, signOut, expireDemoLock }),
    [user, signInAs, signOut, expireDemoLock],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
