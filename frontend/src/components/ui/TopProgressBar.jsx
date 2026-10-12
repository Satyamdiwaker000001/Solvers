import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { WifiOff, CheckCircle2 } from "lucide-react";
import { networkBus } from "../../services/networkBus.js";

/**
 * Global slim, high-performance top progress bar (YouTube / Linear / Vercel style).
 * - Reacts instantly to route changes & active API requests.
 * - Trickles progress naturally according to network latency.
 * - Graceful completion & fade-out.
 * - Real-time internet connection monitor (online / offline pills).
 */
export function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const timerRef = useRef(null);
  const wasOfflineRef = useRef(false);

  // Monitor real-time online/offline connectivity
  useEffect(() => {
    return networkBus.subscribeConnectivity((online) => {
      setIsOnline(online);
      if (!online) {
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        setShowReconnected(true);
        const t = setTimeout(() => {
          setShowReconnected(false);
          wasOfflineRef.current = false;
        }, 3000);
        return () => clearTimeout(t);
      }
    });
  }, []);

  const startProgress = () => {
    setVisible(true);
    setProgress((prev) => (prev > 0 ? prev : 18));

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 45) return prev + Math.random() * 12 + 6;
        if (prev < 75) return prev + Math.random() * 6 + 2;
        if (prev < 90) return prev + 1;
        return prev;
      });
    }, 200);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
    return () => clearTimeout(hideTimer);
  };

  // Route change triggers immediate slim progress
  useEffect(() => {
    startProgress();
    const t = setTimeout(() => {
      completeProgress();
    }, 180);
    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [location.pathname, location.search]);

  // Network activity subscription
  useEffect(() => {
    return networkBus.subscribe(({ isActive }) => {
      if (isActive) {
        startProgress();
      } else {
        completeProgress();
      }
    });
  }, []);

  return (
    <>
      {/* Top Slim Progress Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-[9999] pointer-events-none transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ height: "2.5px" }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-[#4F46E5] via-[#818CF8] to-[#16A765] transition-all duration-200 ease-out shadow-[0_0_8px_rgba(79,70,229,0.7)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Offline Toast Alert */}
      {!isOnline && (
        <aside
          role="status"
          aria-live="assertive"
          aria-label="No Internet Connection"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50/95 px-4 py-2 text-xs font-bold text-rose-700 shadow-lg backdrop-blur-md animate-bounce"
        >
          <WifiOff aria-hidden="true" className="size-4 text-rose-600 shrink-0" />
          <span>No Internet Connection — Checking network…</span>
        </aside>
      )}

      {/* Reconnected Pill */}
      {showReconnected && isOnline && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="Internet Connection Restored"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50/95 px-4 py-2 text-xs font-bold text-emerald-700 shadow-lg backdrop-blur-md transition-all duration-300"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600 shrink-0" />
          <span>Connection Restored</span>
        </aside>
      )}
    </>
  );
}
