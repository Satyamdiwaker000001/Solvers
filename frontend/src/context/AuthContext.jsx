import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./contexts.js";
import { getMe, isLiveMode, logout as apiLogout, startOAuth, adminLogin } from "../services/api.js";

/**
 * Session state.
 *
 * - Live mode (`VITE_API_BASE_URL` set): the session lives in an HttpOnly
 *   cookie. Role and approval state are re-read from `GET /api/v1/auth/me`
 *   on mount and on demand — never trusted from client input. GitHub OAuth
 *   starts via the backend (`/auth/github/start`) and finishes on
 *   `/auth/finish`, which refreshes this context before routing.
 * - Demo mode (no base URL): the original mock personas so the UI stays
 *   clickable without a backend. Clearly labelled in the UI via `isDemo`.
 */
/** Demo lock length in hours — keeps the countdown visible but testable. */
export const DEMO_LOCK_HOURS = 14;

const PERSONAS = {
  student: { role: "student", name: "Aarav Sharma", displayName: "Aarav Sharma", studentId: "STU001", githubLogin: "aarav-codes", avatarUrl: "https://avatars.githubusercontent.com/u/10240111?v=4", accessState: "APPROVED" },
  pending: { role: "student", name: "New Applicant", displayName: "New Applicant", studentId: null, githubLogin: "newbie-dev-99", accessState: "PENDING" },
  rejected: { role: "student", name: "Loop Learner", displayName: "Loop Learner", studentId: null, githubLogin: "loop-learner", accessState: "REJECTED" },
  admin: { role: "admin", name: "Prof. Rao", displayName: "Prof. Rao", studentId: null, githubLogin: "prof-rao", accessState: "APPROVED" },
};

export function AuthProvider({ children }) {
  const live = isLiveMode();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    getMe()
      .then((r) => {
        if (!cancelled) {
          setUser(r.data.user);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          // 401 simply means "not signed in"; anything else is surfaced so
          // the sign-in screen can say the backend is unreachable.
          if (e.status === 401) setUser(null);
          else setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [live]);

  const refresh = useCallback(async () => {
    if (!isLiveMode()) return null;
    setLoading(true);
    try {
      const r = await getMe();
      setUser(r.data.user);
      setError(null);
      return r.data.user;
    } catch (e) {
      if (e.status === 401) setUser(null);
      else setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    const url = await startOAuth();
    window.location.assign(url);
  }, []);

  const signOut = useCallback(() => {
    // Clear local state synchronously so guards redirect immediately; the
    // server session is destroyed in the background (cookie expires there).
    setUser(null);
    if (isLiveMode()) {
      apiLogout().catch(() => {});
    }
  }, []);

  const signInAs = useCallback((key) => {
    const persona = { ...PERSONAS[key] };
    if (key === "rejected") {
      persona.reapplyAfter = new Date(Date.now() + DEMO_LOCK_HOURS * 3_600_000).toISOString();
    }
    setUser(persona);
  }, []);

  const signInAdmin = useCallback(async (username, password) => {
    if (!isLiveMode()) {
      signInAs("admin");
      return PERSONAS.admin;
    }
    setLoading(true);
    try {
      const r = await adminLogin(username, password);
      setUser(r.data.user);
      setError(null);
      return r.data.user;
    } finally {
      setLoading(false);
    }
  }, [signInAs]);

  /** Demo-only: simulate the lock expiring so the reapply branch is testable. */
  const expireDemoLock = useCallback(() => {
    setUser((u) => (u ? { ...u, reapplyAfter: new Date(Date.now() - 1_000).toISOString() } : u));
  }, []);

  const value = useMemo(
    () => (live
      ? { user, loading, error, isDemo: false, signIn, signInAdmin, signOut, refresh }
      : { user, loading: false, error: null, isDemo: true, signInAs, signInAdmin, signOut, expireDemoLock, refresh: async () => user }),
    [live, user, loading, error, signIn, signInAdmin, signOut, refresh, signInAs, expireDemoLock],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
