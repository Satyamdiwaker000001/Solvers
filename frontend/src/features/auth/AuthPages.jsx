import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Clock3,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff,
  Code2,
  Terminal,
  Trophy,
  ShieldAlert,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  BookOpen,
  GitBranch,
} from "lucide-react";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { LoadingState, PageLoader } from "../../components/ui/States.jsx";
import { SolversLogo } from "../../components/ui/SolversLogo.jsx";
import { setSessionId } from "../../services/http.js";
import { getMyRequest, isLiveMode, submitAccessRequest } from "../../services/api.js";
import { useToast } from "../../hooks/useToast.js";
import { formatDateTime, timeUntil } from "../../lib/format.js";

function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
      {/* Emerald atmospheric lighting - top left */}
      <div
        className="absolute -top-32 -left-32 size-[550px] rounded-full blur-[130px] opacity-25"
        style={{ background: "radial-gradient(circle, #DDF4E5 0%, transparent 50%, transparent 100%)" }}
      />
      {/* Warm amber atmospheric lighting - bottom right */}
      <div
        className="absolute -bottom-32 -right-32 size-[600px] rounded-full blur-[140px] opacity-20"
        style={{ background: "radial-gradient(circle, #EEF2F0 0%, transparent 50%, transparent 100%)" }}
      />
      {/* Orbital ellipses */}
      <svg
        className="absolute inset-0 size-full stroke-primary/10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20%" cy="35%" r="320" fill="none" strokeWidth="1" strokeDasharray="4 8" className="opacity-40" />
        <circle cx="20%" cy="35%" r="200" fill="none" strokeWidth="1" className="opacity-30" />
        <circle cx="85%" cy="70%" r="380" fill="none" strokeWidth="1" strokeDasharray="6 10" className="opacity-25 text-warning stroke-amber-400/10" />
        <circle cx="85%" cy="70%" r="240" fill="none" strokeWidth="1" className="opacity-20 text-warning stroke-amber-400/10" />
        {/* Orbital particles */}
        <circle cx="20%" cy="17%" r="3" fill="#DDF4E5" className="opacity-60" />
        <circle cx="34%" cy="35%" r="2" fill="#DDF4E5" className="opacity-40" />
        <circle cx="80%" cy="55%" r="3" fill="#16803C" className="opacity-50" />
        <circle cx="72%" cy="85%" r="2" fill="#16803C" className="opacity-40" />
      </svg>
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(rgba(242, 245, 242, 0.8) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-white/5 bg-surface/50 p-3.5 backdrop-blur-md transition-all hover:border-primary/20 hover:bg-surface/80">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

function AuthLeftBranding({ isFaculty = false }) {
  return (
    <div className="hidden lg:flex flex-col justify-between py-4 pr-6">
      <div>
        <div className="flex items-center gap-3">
          <SolversLogo size="large" />
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
            DSA 2027
          </span>
        </div>

        <div className="mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Code2 aria-hidden="true" className="size-3.5" />
            {isFaculty ? "Faculty Administration Portal" : "Student Practice & Assessment Platform"}
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl leading-[1.15]">
            Master DSA Through <span className="bg-gradient-to-r from-primary to-primary-strong bg-clip-text text-transparent">Verified Code</span>
          </h1>
          <p className="mt-3.5 text-sm leading-relaxed text-muted">
            Automated verification directly from your student GitHub repository commits. Transparent faculty grading, zero commit-spam inflation, and real-time batch progress tracking.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <FeatureCard
            icon={ShieldCheck}
            title="Git-Verified Evidence Pipeline"
            description="Solutions are validated cryptographically against repository path schemas and real DSA constraints."
          />
          <FeatureCard
            icon={Terminal}
            title="Milestones & Assignments"
            description="Common batch problem sets and individual assignments with deadline enforcement and faculty review queues."
          />
          <FeatureCard
            icon={Trophy}
            title="Fair Merit Leaderboard"
            description="Rankings computed strictly from distinct verified problem solutions, preventing superficial commit bloat."
          />
        </div>
      </div>

      <div className="pt-8 border-t border-white/5">
        <p className="text-xs text-muted/75">
          Department of Computer Science · Solvers Continuous Practice Tracker v1.0
        </p>
      </div>
    </div>
  );
}

function AuthShell({ children, eyebrow, split = false, isFaculty = false }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-canvas text-ink overflow-x-hidden">
      <AuthBackground />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-3 py-6 sm:px-6 lg:px-8">
        {split ? (
          <div className="grid min-w-0 w-full gap-10 lg:grid-cols-2 lg:items-center">
            <AuthLeftBranding isFaculty={isFaculty} />
            <div className="mx-auto w-full max-w-md min-w-0 lg:max-w-none">
              {/* Mobile Branding Header */}
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <SolversLogo size="default" />
                <span className="text-[10px] rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary font-bold">2027</span>
              </div>
              {children}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md min-w-0">
            <div className="mb-6 flex items-center justify-between">
              <SolversLogo size="default" />
              <span className="text-[10px] rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary font-bold">2027</span>
            </div>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function SignInPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const _legacyAdminAuthEnabled = false;

  if (auth.loading) return <PageLoader label="Checking your session…" />;
    if (auth.user) {
      nav(auth.user.role === "admin" ? "/admin/dashboard" : auth.user.accessState === "APPROVED" ? "/app/dashboard" : "/access-status", { replace: true });
      return null;
    }
    const start = async () => {
      setBusy(true);
      setFailed(null);
      try {
        await auth.signIn();
      } catch (e) {
        setFailed(e.message);
        setBusy(false);
      }
    };
    return (
      <AuthShell eyebrow="Student Practice Portal" split>
        <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <GraduationCap aria-hidden="true" className="size-3.5" /> Student Access
          </div>
          <h2 className="page-title mt-3">Sign in with GitHub</h2>
          <p className="mt-1 text-sm text-muted">
            Connect your registered GitHub account to access assignments and track your verified solutions.
          </p>

          {auth.error && (
            <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger-bg/80 p-3 text-sm font-medium text-danger">
              Could not reach the server: {auth.error} Verify that the backend is running.
            </p>
          )}
          {failed && (
            <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger-bg/80 p-3 text-sm font-medium text-danger">
              {failed}
            </p>
          )}

          <div className="mt-5 grid gap-3">
            <Button
              loading={busy}
              onClick={start}
              className="w-full min-h-11 bg-primary text-ink font-bold hover:bg-primary-strong shadow-sm transition-all"
            >
              <GithubMark className="size-4" /> Continue with GitHub
            </Button>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs text-muted mb-2 font-medium">Faculty & Course Leadership</p>
            <Link
              to="/admin-login"
              className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning-bg/40 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-warning hover:bg-warning-bg/70 hover:border-warning/50 transition-all min-h-11"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ShieldCheck aria-hidden="true" className="size-4 text-warning shrink-0" />
                <span className="truncate">Course Administrator Sign In</span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        </Card>
      </AuthShell>
    );
  }

export function AdminLoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);

  if (auth.loading) return <PageLoader label="Checking your session…" />;
  if (auth.user) {
    nav(auth.user.role === "admin" ? "/admin/dashboard" : "/access-status", { replace: true });
    return null;
  }
  const startFacultyOAuth = async () => {
    setBusy(true);
    setFailed(null);
    try { await auth.signIn(); } catch (e) { setFailed(e.message); setBusy(false); }
  };
  return (
    <AuthShell eyebrow="Faculty Administration" split isFaculty>
      <Card className="border-primary/40">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
          <ShieldAlert aria-hidden="true" className="size-3.5" /> Admin access
        </span>
        <h2 className="page-title mt-3">Admin sign in</h2>
        <p className="mt-1 text-sm text-muted">Only authorized faculty accounts can access administration.</p>
        {failed && <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger-bg p-3 text-sm font-medium text-danger">{failed}</p>}
        <Button onClick={startFacultyOAuth} loading={busy} className="mt-5 w-full">
          <GithubMark className="size-4" /> Continue with Faculty GitHub
        </Button>
        <p className="mt-3 text-center text-xs text-muted">Access is determined by the server allowlist, not by a frontend role choice.</p>
        <Link to="/sign-in" className="mt-5 inline-flex w-full justify-center text-sm font-semibold text-primary hover:underline">Back to student sign in</Link>
      </Card>
    </AuthShell>
  );
}

/**
 * OAuth landing page: the backend redirects here after the GitHub handshake
 * (`?status=&role=` on success, `?error=` on refusal). Refresh the session
 * from the server, then route by authoritative role + approval state.
 */
export function AuthFinishPage() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(null);

  const providerError = params.get("error");
  const sid = params.get("sid");

  useEffect(() => {
    let cancelled = false;
    if (providerError) return undefined;
    if (sid) {
      setSessionId(sid);
    }
    refresh()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          nav("/sign-in", { replace: true });
          return;
        }
        if (user.role === "admin") nav("/admin/dashboard", { replace: true });
        else if (user.accessState === "APPROVED") nav("/app/dashboard", { replace: true });
        else nav("/access-status", { replace: true });
      })
      .catch((e) => {
        if (!cancelled) setFailed(e?.message || "Sign-in failed.");
      });
    return () => { cancelled = true; };
  }, [nav, params, providerError, refresh]);

  const displayError = failed || providerError;

  return (
    <main className="min-h-svh w-screen bg-[#F3F4FF] text-[#151936] flex items-center justify-center p-4 relative selection:bg-[#4F46E5]/20 selection:text-[#4F46E5]">
      {/* Background ambient soft glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" aria-hidden="true" />

      <div className="w-full max-w-md bg-white border border-[#E2E6F5] rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_-10px_rgba(79,70,229,0.08)] text-center relative z-10">
        {displayError ? (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-[#151936]">Authentication Interrupted</h1>
                <p className="text-xs text-[#647096]">Unable to verify OAuth callback session</p>
              </div>
            </div>

            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs font-medium text-rose-700">
              {displayError}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Button onClick={() => nav("/sign-in")} className="w-full sm:w-auto text-xs font-bold bg-[#4F46E5] text-white hover:bg-[#4338CA]">
                <ArrowLeft className="size-3.5" /> Return to Student Sign In
              </Button>
              <Button tone="secondary" onClick={() => window.location.reload()} className="w-full sm:w-auto text-xs">
                <RefreshCw className="size-3.5" /> Retry Handshake
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="relative mb-3 size-28 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#E9E7FF] to-[#F1EFFF] absolute z-0 blur-[0.5px]" />
              <img src="/mascot.png" alt="Solvers Mascot" className="w-auto h-24 object-contain relative z-10 select-none" />
            </div>
            <SolversLogo size="default" />
            <h2 className="mt-4 text-base font-bold text-[#151936]">Connecting to Solvers Central</h2>
            <p className="mt-1 text-xs text-[#647096] max-w-xs">Connecting your GitHub credentials and setting up workspace…</p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-[#4F46E5] font-semibold bg-[#EEECFF] px-3 py-1 rounded-full border border-[#4F46E5]/20">
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Completing secure handshake…</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


export { AccessStatusPage } from "./AccessStatusPage.jsx";

