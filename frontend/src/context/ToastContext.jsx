import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./contexts.js";

let seq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const push = useCallback((toast) => {
    const id = seq++;
    setToasts((t) => [...t.slice(-3), { id, tone: "success", ...toast }]);
    if (toast.tone !== "danger") {
      timers.current.set(id, setTimeout(() => dismiss(id), toast.duration ?? 4200));
    }
  }, [dismiss]);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
