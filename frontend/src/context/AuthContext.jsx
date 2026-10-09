import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * MOCK auth — demo only. There is no real GitHub OAuth, session, or persistence.
 * `signInAs(role)` simply selects a demo persona so every workflow is clickable.
 * ProtectedRoute enforces the selected role client-side; the future backend
 * must re-enforce FR-AUTH/FR-PS authorization server-side (NFR-SEC-01).
 */
const AuthContext = createContext(null);

const PERSONAS = {
  student: { role: "student", name: "Aarav Sharma", studentId: "STU001", githubLogin: "aarav-codes", accessState: "APPROVED" },
  pending: { role: "student", name: "New Applicant", studentId: null, githubLogin: "newbie-dev-99", accessState: "PENDING" },
  rejected: { role: "student", name: "Loop Learner", studentId: null, githubLogin: "loop-learner", accessState: "REJECTED", reapplyAfter: "2026-10-09T09:05:00Z" },
  admin: { role: "admin", name: "Prof. Rao", studentId: null, githubLogin: "prof-rao", accessState: "APPROVED" },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signInAs = useCallback((key) => setUser({ ...PERSONAS[key] }), []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, isDemo: true, signInAs, signOut }), [user, signInAs, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
