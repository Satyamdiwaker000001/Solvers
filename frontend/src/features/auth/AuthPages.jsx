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
import { LoadingState } from "../../components/ui/States.jsx";
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
          <span className="grid size-11 place-items-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-[0_0_20px_rgba(67,217,174,0.25)]">
            <GraduationCap aria-hidden="true" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-ink">Solvers</span>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                DSA 2027
              </span>
            </div>
            <p className="text-xs font-medium text-muted">DSA Practice & Verification Engine</p>
          </div>
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
              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <span className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/15 text-primary shadow-xs">
                  <GraduationCap aria-hidden="true" className="size-5" />
                </span>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <p className="font-extrabold tracking-tight text-ink">Solvers</p>
                    <span className="text-[10px] rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.2 text-primary font-bold">2027</span>
                  </div>
                  <p className="text-xs text-muted">{eyebrow}</p>
                </div>
              </div>
              {children}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md min-w-0">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/15 text-primary shadow-xs">
                <GraduationCap aria-hidden="true" className="size-6" />
              </span>
              <div className="leading-tight">
                <p className="font-extrabold tracking-tight text-ink">Solvers</p>
                <p className="text-xs text-muted">{eyebrow}</p>
              </div>
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

    if (auth.loading) return <AuthShell eyebrow="GitHub-verified student practice"><LoadingState label="Checking your session…" /></AuthShell>;
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

  if (auth.loading) return <AuthShell eyebrow="Faculty Administration" isFaculty><LoadingState label="Checking your session…" /></AuthShell>;
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
    <AuthShell eyebrow="Finishing authentication">
      <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {displayError ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-red-500/15 text-red-500 border border-red-500/30">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-black text-ink">Authentication Interrupted</h1>
                <p className="text-xs text-muted">Unable to verify OAuth callback session</p>
              </div>
            </div>

            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400">
              {displayError}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Button onClick={() => nav("/sign-in")} className="w-full sm:w-auto text-xs font-bold bg-primary text-white hover:bg-primary-strong">
                <ArrowLeft className="size-3.5" /> Return to Student Sign In
              </Button>
              <Button tone="secondary" onClick={() => window.location.reload()} className="w-full sm:w-auto text-xs">
                <RefreshCw className="size-3.5" /> Retry Handshake
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-strong text-white shadow-lg shadow-primary/25">
              <GraduationCap className="size-7 animate-pulse" />
            </div>
            <h2 className="mt-4 text-base font-bold text-ink">Completing Secure Handshake</h2>
            <p className="mt-1 text-xs text-muted max-w-xs">Connecting your GitHub credentials with Solvers 2027 and setting up workspace…</p>
          </div>
        )}
      </Card>
    </AuthShell>
  );
}



function LiveAccessStatus() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchStatus = async (showToast = false) => {
    try {
      if (showToast) setChecking(true);
      const updatedUser = await refresh();
      if (updatedUser?.role === "admin") {
        nav("/admin/dashboard", { replace: true });
        return;
      }
      if (updatedUser?.accessState === "APPROVED") {
        toast.push({ tone: "success", title: "Access Approved!", body: "Redirecting to your student dashboard…" });
        nav("/app/dashboard", { replace: true });
        return;
      }

      let r = await getMyRequest();
      // If student is pending but no AccessRequest exists yet, auto-submit to ensure admin sees it
      if (!r?.data && updatedUser?.accessState === "PENDING") {
        try {
          const created = await submitAccessRequest("");
          r = { data: created.data || created };
        } catch {
          // Handled or duplicate
        }
      }
      setRequest(r?.data || null);
      setLastChecked(new Date());

      if (showToast) {
        if (updatedUser?.accessState === "PENDING") {
          toast.push({
            title: "Request in Admin Queue",
            body: "Your request is currently waiting for professor approval.",
          });
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      if (showToast) setChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(false);
    // Auto-poll every 6 seconds so user transitions immediately when approved
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !user) {
    return (
      <AuthShell eyebrow="Access verification status">
        <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-strong text-white shadow-lg shadow-primary/25">
              <GraduationCap className="size-7 animate-pulse" />
            </div>
            <h2 className="mt-4 text-base font-bold text-ink">Connecting to Solvers Central</h2>
            <p className="mt-1 text-xs text-muted max-w-xs">Connecting to university practice portal and checking review queues…</p>
          </div>
        </Card>
      </AuthShell>
    );
  }
  if (!user) {
    nav("/sign-in", { replace: true });
    return null;
  }

  const state = user.accessState;

  const submitNew = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await submitAccessRequest("");
      setRequest(r.data);
      toast.push({ title: "Access request submitted", body: "Professors have been notified. Check back for approval." });
      await refresh();
    } catch (e) {
      if (e.code === "REAPPLICATION_LOCKED") {
        setError(`Your previous request was rejected. You can reapply ${e.retryAfter ? `in ${timeUntil(e.retryAfter)}` : "after the 24-hour lock expires"}. The lock is enforced by server time.`);
      } else if (e.code === "IDEMPOTENCY_CONFLICT") {
        setError("You already have an active pending request in the admin queue.");
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell eyebrow="Access verification status">
      <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {state === "PENDING" && (
          <div className="space-y-6">
            {/* Top Brand Logo & Status Pulse */}
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary-strong text-white shadow-md shadow-primary/25">
                  <GraduationCap className="size-6" />
                  <span className="absolute -top-1 -right-1 flex size-3.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-3.5 rounded-full border-2 border-surface bg-emerald-500" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold tracking-tight text-ink">Solvers 2027</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">DSA Lab</span>
                  </div>
                  <p className="text-xs text-muted">Continuous Assessment & Verification Platform</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Delivered to Admin
              </span>
            </div>

            {/* Hero Waiting Lounge Message */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-canvas to-primary/5 p-5 sm:p-6 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-inner">
                <Clock3 className="size-7 animate-pulse" />
              </div>
              <h1 className="mt-3.5 text-xl sm:text-2xl font-black tracking-tight text-ink">
                Request Sent — Awaiting Professor Approval
              </h1>
              <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-muted">
                Aapki enrollment request course professor ke verification queue mein bhej di gayi hai. Approval milte hi aapka dashboard aur problems list bina page reload kiye turant open ho jayegi.
              </p>
            </div>

            {/* Live Verification Details Card */}
            <div className="rounded-xl border border-border bg-canvas/70 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span className="text-muted font-medium flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Verified Student GitHub
                </span>
                <span className="font-mono font-bold text-ink bg-surface px-2 py-0.5 rounded border border-border">@{user.githubLogin}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span className="text-muted font-medium flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-warning" /> Faculty Queue Status
                </span>
                <span className="font-semibold text-warning flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500 animate-ping" /> In Review Queue
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span className="text-muted font-medium flex items-center gap-1.5">
                  <GitBranch className="size-3.5 text-muted" /> Target Batch Repository
                </span>
                <span className="font-mono text-muted">Satyamdiwaker000001/DSA_Batch_2027</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted font-medium flex items-center gap-1.5">
                  <RefreshCw className="size-3.5 text-muted animate-spin" /> Live Auto-Sync
                </span>
                <span className="text-muted font-medium text-[11px]">
                  Listening live (polls every 6s)
                </span>
              </div>
            </div>

            {/* What Happens Next Guidance */}
            <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border bg-surface/80 p-3 flex gap-2.5 items-start">
                <BookOpen className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-ink">What happens on approval?</p>
                  <p className="text-muted text-[11px] mt-0.5">Your official Student ID & tracking folder will be allocated in the batch repository.</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface/80 p-3 flex gap-2.5 items-start">
                <Sparkles className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-ink">Zero wait dashboard unlock</p>
                  <p className="text-muted text-[11px] mt-0.5">No need to refresh! This page automatically opens the DSA practice dashboard when approved.</p>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger-bg p-3 text-xs font-medium text-danger">
                {error}
              </p>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <Button
                loading={checking}
                onClick={() => fetchStatus(true)}
                className="w-full sm:w-auto text-xs font-bold bg-primary text-white hover:bg-primary-strong shadow-md shadow-primary/20"
              >
                <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} /> Check Status Now
              </Button>
              <Button
                tone="secondary"
                onClick={() => nav("/sign-in")}
                className="w-full sm:w-auto text-xs"
              >
                Sign in as different user
              </Button>
            </div>

            {/* Faculty Admin Quick Access Box */}
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs text-muted">
              <div className="flex items-center justify-between">
                <p className="font-bold text-ink flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-amber-500" /> Are you the Course Professor / Admin?
                </p>
                <Link
                  to="/admin-login"
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline text-[11px]"
                >
                  Admin Login <ExternalLink className="size-3" />
                </Link>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed">
                Professors can approve this student immediately from{" "}
                <Link to="/admin/requests" className="font-semibold text-primary underline">
                  Admin Console &gt; Access Requests
                </Link>.
              </p>
            </div>
          </div>
        )}

        {state === "REJECTED" && (
          <>
            <h1 className="page-title text-danger">Request not approved</h1>
            <p className="mt-1 text-sm text-muted">
              Your access request was rejected. You may submit a new request once the 24-hour restriction expires — the countdown below uses the server-recorded rejection time, not your device clock.
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-canvas/80 p-3 text-sm">
              <p>Eligible to reapply: <strong className="tnum text-warning">{request?.reapplyAfter ? `in ${timeUntil(request.reapplyAfter)}` : "now"}</strong></p>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button loading={busy} onClick={submitNew} className="w-full sm:w-auto">Submit a new access request</Button>
            </div>
          </>
        )}

        {state === "APPROVED" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-bg px-2.5 py-1 text-xs font-bold text-success">
              <CheckCircle2 aria-hidden="true" className="size-3.5" /> Approved
            </p>
            <h1 className="page-title mt-2">You’re in</h1>
            <p className="mt-1 text-sm text-muted">Your student ID is <strong className="mono">{user.studentId}</strong>.</p>
            <Button className="mt-3" onClick={() => nav("/app/dashboard")}>Open student dashboard</Button>
          </>
        )}

        {state !== "PENDING" && state !== "REJECTED" && state !== "APPROVED" && (
          <>
            <h1 className="page-title">Account unavailable</h1>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
            <p className="mt-1 text-sm text-muted">This account is suspended. Contact a professor for help.</p>
          </>
        )}
      </Card>
    </AuthShell>
  );
}

export function AccessStatusPage() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <AuthShell eyebrow="Access status">
        <Card className="glass-panel"><LoadingState label="Checking your access status…" /></Card>
      </AuthShell>
    );
  }
  if (!user) return null;
  return <LiveAccessStatus />;
}
