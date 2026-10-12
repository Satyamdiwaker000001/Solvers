import { useState, useEffect } from "react";
import { AlertCircle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "./Button.jsx";
import { cn } from "./cn.js";
import { SolversLogo } from "./SolversLogo.jsx";
import { networkBus } from "../../services/networkBus.js";

/**
 * Intelligent, network-aware loading state:
 * 1. Anti-flicker delay (150ms): Doesn't flash on fast responses.
 * 2. Adaptive latency messaging: Updates status if server/network takes 2.5s or 5s+.
 * 3. Offline aware: Immediately notes when internet drops.
 * 4. High-fidelity shimmer skeleton lines.
 */
export function LoadingState({
  label = "Loading…",
  lines = 3,
  delayMs = 140,
  className = "",
  showSkeletons = true,
}) {
  const [shouldRender, setShouldRender] = useState(delayMs <= 0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Anti-flicker threshold: avoid showing loader if network resolves in < 140ms
  useEffect(() => {
    if (delayMs <= 0) return;
    const t = setTimeout(() => setShouldRender(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  // Network connectivity listener
  useEffect(() => {
    return networkBus.subscribeConnectivity((online) => {
      setIsOnline(online);
    });
  }, []);

  // Latency counter to provide adaptive feedback
  useEffect(() => {
    if (!shouldRender) return;
    const interval = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [shouldRender]);

  if (!shouldRender) return null;

  // Adaptive label based on network latency
  let currentLabel = label;
  let statusTone = "text-[#647096]";

  if (!isOnline) {
    currentLabel = "Internet disconnected. Waiting for connection…";
    statusTone = "text-rose-600 font-bold";
  } else if (elapsedSec >= 5) {
    currentLabel = "Slower network detected. Still waiting for server response…";
    statusTone = "text-amber-600 font-medium";
  } else if (elapsedSec >= 2) {
    currentLabel = "Syncing with Solvers network…";
    statusTone = "text-[#4F46E5] font-medium";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={currentLabel}
      className={cn(
        "rounded-2xl border border-[#E2E6F5] bg-white p-4 sm:p-5 shadow-xs transition-all duration-300",
        className
      )}
    >
      {/* Header with orbital micro-spinner and adaptive message */}
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {!isOnline ? (
            <WifiOff className="size-4 text-rose-600 animate-pulse shrink-0" />
          ) : (
            <div className="relative size-4 shrink-0">
              <span className="absolute inset-0 rounded-full border-2 border-[#E9E7FF]" />
              <span className="absolute inset-0 rounded-full border-2 border-t-[#4F46E5] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
          )}
          <p className={cn("text-xs truncate transition-colors", statusTone)}>
            {currentLabel}
          </p>
        </div>

        {elapsedSec >= 3 && isOnline && (
          <span className="text-[10px] text-[#647096] font-mono shrink-0">
            {elapsedSec}s elapsed
          </span>
        )}
      </div>

      {/* Shimmer skeleton lines */}
      {showSkeletons && lines > 0 && (
        <div className="grid gap-2" aria-hidden="true">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-8 rounded-lg overflow-hidden relative bg-[#F0F2FD]",
                i === lines - 1 && "w-3/4",
                i === 0 && "h-10"
              )}
            >
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent"
                style={{
                  animationDuration: "1.8s",
                  animationTimingFunction: "ease-in-out",
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Premium Full-Page Branded Loader for Auth Check, Page Transitions, and Bootstrapping.
 * Includes Solvers mascot/brand, animated orbital aura, and network resilience.
 */
export function PageLoader({ label = "Loading Solvers…", isMascot = true }) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return networkBus.subscribeConnectivity((online) => {
      setIsOnline(online);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  let displayLabel = label;
  if (!isOnline) {
    displayLabel = "Internet connection lost. Reconnecting…";
  } else if (elapsedSec >= 5) {
    displayLabel = "Taking longer than usual. Checking server connection…";
  } else if (elapsedSec >= 2) {
    displayLabel = "Securing session and loading workspace…";
  }

  return (
    <main className="min-h-svh w-screen bg-[#F3F4FF] text-[#151936] flex items-center justify-center p-4 relative selection:bg-[#4F46E5]/20 selection:text-[#4F46E5]">
      {/* Background ambient soft glows */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[#E9E7FF]/80 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#E9E7FF]/80 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"
        aria-hidden="true"
      />

      <div className="w-full max-w-sm bg-white border border-[#E2E6F5] rounded-3xl p-6 sm:p-7 shadow-[0_12px_40px_-10px_rgba(79,70,229,0.08)] text-center relative z-10">
        {/* Animated brand emblem or 3D Mascot */}
        {isMascot ? (
          <div className="relative mx-auto mb-3 size-24 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E9E7FF] to-[#F1EFFF] absolute z-0 blur-[0.5px]" />
            <img
              src="/mascot.png"
              alt="Solvers Student"
              className="w-auto h-20 object-contain relative z-10 select-none"
            />
          </div>
        ) : (
          <div className="relative mx-auto mb-4 size-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-[#EEECFF] animate-pulse" />
            <div className="relative z-10">
              <SolversLogo size="large" showText={false} />
            </div>
          </div>
        )}

        <SolversLogo size="default" />

        <p className="mt-3 text-xs font-semibold text-[#151936] min-h-[1.25rem]">
          {displayLabel}
        </p>

        {/* Micro-Progress Bar Track */}
        <div className="mt-4 mx-auto w-48 h-1.5 rounded-full bg-[#EEECFF] overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-[#4F46E5] to-[#16A765] rounded-full animate-[progress_1.6s_ease-in-out_infinite]" />
        </div>

        {elapsedSec >= 7 && (
          <div className="mt-5 pt-3 border-t border-[#E2E6F5]/80">
            <Button
              tone="secondary"
              onClick={() => window.location.reload()}
              className="text-[11px] py-1.5 w-full text-[#647096]"
            >
              <RefreshCw className="size-3" /> Refresh Page
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

export function EmptyState({ title, body, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[#E2E6F5] bg-white px-6 py-10 text-center shadow-xs">
      <span className="rounded-full bg-[#EEECFF] p-3 text-[#4F46E5]">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h2 className="text-base font-bold text-[#151936]">{title}</h2>
      {body && <p className="max-w-md text-sm text-[#647096]">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 px-6 py-10 text-center shadow-xs"
    >
      <AlertCircle aria-hidden="true" className="size-7 text-rose-600" />
      <h2 className="text-base font-bold text-[#151936]">{title}</h2>
      {body && <p className="max-w-md text-sm text-[#647096]">{body}</p>}
      {onRetry && (
        <Button
          tone="secondary"
          onClick={onRetry}
          className="mt-2 border-rose-200 text-rose-700 hover:bg-rose-100/60"
        >
          <RefreshCw aria-hidden="true" className="size-4" /> Try again
        </Button>
      )}
    </div>
  );
}
