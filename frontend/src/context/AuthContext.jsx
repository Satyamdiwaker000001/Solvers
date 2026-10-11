import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./contexts.js";
import { getMe, logout as apiLogout, startOAuth, adminLogin, updateAdminProfile } from "../services/api.js";

/**
 * Session state for Solvers.
 *
 * Session lives in an HttpOnly cookie / session token with the live Express backend.
 * Role and approval state are fetched from `GET /api/v1/auth/me` on mount and refreshed on demand.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, []);

  const refresh = useCallback(async () => {
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
    setUser(null);
    apiLogout().catch(() => {});
  }, []);

  const signInAdmin = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const r = await adminLogin(username, password);
      setUser(r.data.user);
      setError(null);
      return r.data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const res = await updateAdminProfile(updates);
    if (res?.data?.user) {
      setUser(res.data.user);
    }
    return res;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isDemo: false,
      signIn,
      signInAdmin,
      signOut,
      refresh,
      updateUser,
      updateProfile,
    }),
    [user, loading, error, signIn, signInAdmin, signOut, refresh, updateUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
