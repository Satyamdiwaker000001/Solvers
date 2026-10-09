import { createContext } from "react";

/**
 * Shared React contexts (no components here — providers live in
 * `AuthContext.jsx` / `ToastContext.jsx` and hooks in `hooks/`).
 */
export const AuthContext = createContext(null);
export const ToastContext = createContext(null);
