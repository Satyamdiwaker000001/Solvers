import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { AuthContext } from "./contexts.js";
import { getMe, logout as apiLogout, startOAuth, adminLogin, updateAdminProfile } from "../services/api.js";
import { clearSessionId } from "../services/http.js";

// Professional security standard: 15 minutes idle timeout (900,000 ms)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastActiveRef = useRef(Date.now());

  const signOut = useCallback(() => {
    setUser(null);
    clearSessionId();
    apiLogout().catch(() => {});
  }, []);

  // Monitor user activity and tab visibility
  useEffect(() => {
    if (!user) return;

    const recordActivity = () => {
      lastActiveRef.current = Date.now();
    };

    const checkInactivity = () => {
      const now = Date.now();
      if (now - lastActiveRef.current > IDLE_TIMEOUT_MS) {
        console.warn("[Session] Inactivity limit reached. Signing out for security.");
        signOut();
      }
    };

    // Activity events
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    // Visibility change (tab switch or backgrounding)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      } else {
        recordActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic idle checker every 30 seconds
    const interval = setInterval(checkInactivity, 30000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [user, signOut]);

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
          if (e.status === 401) {
            setUser(null);
            clearSessionId();
          } else {
            setError(e.message);
          }
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
      if (e.status === 401) {
        setUser(null);
        clearSessionId();
      } else {
        setError(e.message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    const url = await startOAuth();
    window.location.assign(url);
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
