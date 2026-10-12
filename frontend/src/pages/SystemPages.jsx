import { Link, useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  Compass,
  AlertTriangle,
  ServerCrash,
  WifiOff,
  Clock,
  Home,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { SolversLogo } from "../components/ui/SolversLogo.jsx";

function ErrorLayout({ icon: Icon, tone = "primary", code, title, subtitle, description, details, actions }) {
  const toneMap = {
    danger: {
      border: "border-red-500/20",
      bg: "bg-red-500/10",
      text: "text-red-500",
      badge: "border-red-500/30 bg-red-500/10 text-red-500",
      glow: "shadow-red-500/20",
    },
    warning: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
      glow: "shadow-amber-500/20",
    },
    primary: {
      border: "border-primary/20",
      bg: "bg-primary/10",
      text: "text-primary",
      badge: "border-primary/30 bg-primary/10 text-primary",
      glow: "shadow-primary/20",
    },
  };
  const theme = toneMap[tone] || toneMap.primary;

  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center p-4 bg-canvas text-ink overflow-x-hidden">
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full blur-[140px] opacity-20"
        style={{ background: "radial-gradient(circle, #4F46E5 0%, #A3E635 60%, transparent 100%)" }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <SolversLogo size="default" />
          </Link>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${theme.badge}`}>
            {code}
          </span>
        </div>

        {/* Main Error Card */}
        <div className="rounded-2xl border border-white/10 bg-surface/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`grid size-14 shrink-0 place-items-center rounded-2xl border ${theme.border} ${theme.bg} ${theme.text} shadow-lg ${theme.glow}`}>
              <Icon className="size-7" />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{subtitle}</p>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-black tracking-tight text-ink">{title}</h1>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted">
            {description}
          </p>

          {details && (
            <div className="rounded-xl border border-border bg-canvas/60 p-3.5 text-xs font-mono text-muted break-all">
              <span className="text-[10px] uppercase font-bold text-muted/70 block mb-1">Diagnostic Detail:</span>
              {details}
            </div>
          )}

          <div className="pt-2 border-t border-border/80 flex flex-col sm:flex-row gap-2.5">
            {actions}
          </div>
        </div>

        {/* Help footer */}
        <div className="mt-6 text-center text-xs text-muted flex items-center justify-center gap-4">
          <Link to="/sign-in" className="hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="size-3" /> Back to Sign In
          </Link>
          <span>·</span>
          <Link to="/admin-login" className="hover:text-primary transition-colors flex items-center gap-1">
            Faculty Admin <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** 403 Forbidden */
export function ForbiddenPage() {
  return (
    <ErrorLayout
      icon={ShieldAlert}
      tone="warning"
      code="403 FORBIDDEN"
      subtitle="Access Restricted"
      title="Permission Denied"
      description="Aapka account is specific area ya action ke liye authorized nahi hai. Real security policies server par enforce hoti hain. Agar aap student hain, toh aap student dashboard access kar sakte hain."
      actions={
        <>
          <Button onClick={() => window.history.back()} tone="secondary" className="w-full sm:w-auto text-xs">
            <ArrowLeft className="size-3.5" /> Previous Page
          </Button>
          <Link to="/app/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-strong transition">
            Student Dashboard <ChevronRight className="size-3.5 ml-1" />
          </Link>
        </>
      }
    />
  );
}

/** 404 Not Found */
export function NotFoundPage() {
  return (
    <ErrorLayout
      icon={Compass}
      tone="primary"
      code="404 NOT FOUND"
      subtitle="Resource Missing"
      title="Page Not Found"
      description="Jis page ya resource ko aap dhoondh rahe hain woh exist nahi karta ya uska URL change ho chuka hai."
      actions={
        <>
          <Button onClick={() => window.history.back()} tone="secondary" className="w-full sm:w-auto text-xs">
            <ArrowLeft className="size-3.5" /> Go Back
          </Button>
          <Link to="/sign-in" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-strong transition">
            <Home className="size-3.5 mr-1.5" /> Return Home
          </Link>
        </>
      }
    />
  );
}

/** 500 / 502 / 503 Server & Network Error Page */
export function ServerErrorPage() {
  const [params] = useSearchParams();
  const rawCode = params.get("code") || "500";
  const message = params.get("message") || "An unexpected server issue occurred while processing your request.";
  const isNetwork = rawCode === "OFFLINE" || rawCode === "503";

  return (
    <ErrorLayout
      icon={isNetwork ? WifiOff : ServerCrash}
      tone="danger"
      code={`HTTP ${rawCode}`}
      subtitle="System Exception"
      title={isNetwork ? "Service Unreachable" : "Internal Server Error"}
      description="Backend service se connect karte waqt dikkat aayi hai. Render cold-start ya temporary network interrupt ho sakta hai. Kripya kuch second baad dobara try karein."
      details={message}
      actions={
        <>
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto text-xs font-bold bg-primary text-white hover:bg-primary-strong">
            <RefreshCw className="size-3.5" /> Retry Request
          </Button>
          <Link to="/sign-in" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 transition">
            <Home className="size-3.5 mr-1.5" /> Back to Sign In
          </Link>
        </>
      }
    />
  );
}

/** 429 Too Many Requests Rate-Limit Page */
export function RateLimitPage() {
  return (
    <ErrorLayout
      icon={Clock}
      tone="warning"
      code="429 RATE LIMITED"
      subtitle="Traffic Protection"
      title="Too Many Requests"
      description="Too many requests were detected from your network within a short timeframe. In accordance with platform security and rate-limiting policies, access has been temporarily throttled."
      details="The request window refreshes automatically. Please wait approximately 30–60 seconds before retrying."
      actions={
        <>
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto text-xs font-bold bg-primary text-white hover:bg-primary-strong">
            <RefreshCw className="size-3.5" /> Try Again
          </Button>
          <Link to="/" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 transition">
            Home
          </Link>
        </>
      }
    />
  );
}

/** General Universal Error Page for any unhandled application catch */
export function GenericErrorPage({ error, onRetry }) {
  return (
    <ErrorLayout
      icon={AlertTriangle}
      tone="danger"
      code="UNEXPECTED_ERROR"
      subtitle="Application Notice"
      title="Something Went Wrong"
      description="An unexpected runtime exception occurred while processing this page. Please refresh the page or try again in a few moments."
      details={error?.message || String(error || "Unknown error")}
      actions={
        <>
          <Button onClick={onRetry || (() => window.location.reload())} className="w-full sm:w-auto text-xs font-bold bg-primary text-white hover:bg-primary-strong">
            <RefreshCw className="size-3.5" /> Reload Application
          </Button>
          <Link to="/sign-in" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface/80 transition">
            Sign In
          </Link>
        </>
      }
    />
  );
}
