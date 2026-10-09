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
} from "lucide-react";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { LoadingState } from "../../components/ui/States.jsx";
import { DemoBadge } from "../../components/layout/Chrome.jsx";
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
              <div className="mt-4"><DemoBadge /></div>
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
            <div className="mt-4"><DemoBadge /></div>
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

  if (!auth.isDemo) {
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

  const { signInAs } = auth;
  const login = (persona, to) => { signInAs(persona); nav(to, { replace: true }); };

  return (
    <AuthShell eyebrow="Student Practice Portal" split>
      <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          <GraduationCap aria-hidden="true" className="size-3.5" /> Student Access
        </div>
        <h2 className="page-title mt-3">Sign in with GitHub</h2>
        <p className="mt-1 text-sm text-muted">
          Connect your GitHub account to access assignments and track your verified solutions.
        </p>

        <div className="mt-5 grid gap-2.5">
          <Button onClick={() => login("student", "/app/dashboard")} className="w-full min-h-11 shadow-[0_0_20px_rgba(67,217,174,0.25)] flex-wrap text-xs sm:text-sm py-2 px-3 sm:px-4">
            <GithubMark className="size-4 shrink-0" /> <span className="font-bold">Continue with GitHub</span> <span className="font-normal opacity-80 text-[11px] sm:text-xs">(demo · approved)</span>
          </Button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            <Button tone="secondary" onClick={() => login("pending", "/access-status")}>Demo: pending</Button>
            <Button tone="secondary" onClick={() => login("rejected", "/access-status")}>Demo: rejected</Button>
          </div>
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);

  // Live administration uses the same GitHub OAuth flow as students. The
  // backend decides admin access from its two-ID allowlist.
  if (!auth.isDemo) {
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
          <p className="mt-1 text-sm text-muted">Only the two authorized professor GitHub accounts can access administration.</p>
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

  if (_legacyAdminAuthEnabled && !auth.isDemo) {
    if (auth.loading) return <AuthShell eyebrow="Faculty Administration" isFaculty><LoadingState label="Checking your session…" /></AuthShell>;
    if (auth.user?.role === "admin") {
      nav("/admin/dashboard", { replace: true });
      return null;
    }

    const handlePasswordSubmit = async (e) => {
      e.preventDefault();
      if (!username.trim() || !password) {
        setFailed("Please enter both username/email and password.");
        return;
      }
      setBusy(true);
      setFailed(null);
      try {
        if (typeof auth.signInAdmin === "function") {
          await auth.signInAdmin(username.trim(), password);
        } else {
          throw new Error("Admin login is not initialized.");
        }
        nav("/admin/dashboard", { replace: true });
      } catch (err) {
        setFailed(err.message || "Invalid administrator credentials.");
        setBusy(false);
      }
    };

    const handleFacultyGithub = async () => {
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
      <AuthShell eyebrow="Faculty Administration" split isFaculty>
        <Card className="glass-panel border-warning/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning">
              <ShieldAlert aria-hidden="true" className="size-3.5" /> Faculty Administration
            </span>
            <span className="text-[11px] font-mono text-muted">Admin Auth</span>
          </div>

          <h2 className="page-title mt-3">Admin Sign In</h2>
          <p className="mt-1 text-sm text-muted">
            Authorized course professors and staff authenticate with verified faculty credentials.
          </p>

          {failed && (
            <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger-bg/80 p-3 text-sm font-medium text-danger">
              {failed}
            </p>
          )}

          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3.5">
            <div>
              <label htmlFor="admin-ident" className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Email or Username
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted pointer-events-none">
                  <User aria-hidden="true" className="size-4" />
                </span>
                <input
                  id="admin-ident"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin@solvers.edu or admin"
                  className="w-full rounded-xl border border-white/10 bg-canvas/60 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted/50 focus:border-warning focus:outline-none focus:ring-1 focus:ring-warning"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-pwd" className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Password
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted pointer-events-none">
                  <Lock aria-hidden="true" className="size-4" />
                </span>
                <input
                  id="admin-pwd"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-white/10 bg-canvas/60 py-2.5 pl-9 pr-10 text-sm text-ink placeholder:text-muted/50 focus:border-warning focus:outline-none focus:ring-1 focus:ring-warning"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink focus:outline-none"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              tone="amber"
              loading={busy}
              className="w-full min-h-11 shadow-[0_0_20px_rgba(241,185,87,0.25)] text-xs sm:text-sm"
            >
              <KeyRound className="size-4 shrink-0" /> <span className="truncate">Authenticate as Administrator</span>
            </Button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-4 space-y-3">
            <button
              type="button"
              onClick={handleFacultyGithub}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface/60 px-3 py-2.5 text-xs font-semibold text-ink hover:bg-surface hover:border-primary/30 transition-all min-h-10 min-w-0"
            >
              <GithubMark className="size-3.5 shrink-0" /> <span className="truncate">Sign in via Faculty GitHub</span>
            </button>
            <div className="text-center">
              <Link to="/sign-in" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to student sign in
              </Link>
            </div>
          </div>
        </Card>
      </AuthShell>
    );
  }

  const { signInAs } = auth;
  return (
    <AuthShell eyebrow="Faculty Administration" split isFaculty>
      <Card className="glass-panel border-warning/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning">
            <ShieldAlert aria-hidden="true" className="size-3.5" /> Course Administrator
          </span>
          <span className="text-[11px] font-mono text-muted">Demo Mode</span>
        </div>
        <h2 className="page-title mt-3">Admin Sign In</h2>
        <p className="mt-1 text-sm text-muted">Authorized faculty accounts sign in to manage assignments, students, and review queues.</p>
        <div className="mt-5 grid gap-3">
          <Button
            tone="amber"
            onClick={() => { signInAs("admin"); nav("/admin/dashboard", { replace: true }); }}
            className="w-full min-h-11 shadow-[0_0_20px_rgba(241,185,87,0.25)]"
          >
            Sign in as Course Admin <span className="font-normal opacity-80">(demo)</span>
          </Button>
          <Link to="/sign-in" className="text-center text-sm font-semibold text-primary hover:underline pt-2">
            ← Back to student sign in
          </Link>
        </div>
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

  useEffect(() => {
    let cancelled = false;
    if (providerError) return undefined;
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
    <AuthShell eyebrow="Signing you in">
      <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {displayError ? (
          <>
            <h1 className="page-title">Sign-in didn’t complete</h1>
            <p role="alert" className="mt-2 text-sm font-medium text-danger">{displayError}</p>
            <Button tone="secondary" className="mt-4" onClick={() => nav("/sign-in")}>Back to sign in</Button>
          </>
        ) : (
          <LoadingState label="Finishing GitHub sign-in…" />
        )}
      </Card>
    </AuthShell>
  );
}

function DemoAccessStatus() {
  const { user, signInAs, expireDemoLock } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return null;
  const state = user.accessState;

  const request = async () => {
    setBusy(true); setError(null);
    try {
      if (user.reapplyAfter && new Date(user.reapplyAfter) > new Date()) {
        setError(`You can reapply in ${timeUntil(user.reapplyAfter)} (demo lock). The real 24-hour rule is enforced by server time, not this screen.`);
        return;
      }
      await submitAccessRequest(user.githubLogin);
      toast.push({ title: "Access request submitted", body: "Professors have been notified. Check back for approval." });
      signInAs("pending");
    } catch (e) {
      if (e.code === "REAPPLICATION_LOCKED") setError(`You can reapply ${timeUntil(e.retryAfter)} from now. The 24-hour rule is enforced by server time.`);
      else if (e.code === "IDEMPOTENCY_CONFLICT") setError("You already have an active pending request.");
      else setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <AuthShell eyebrow="Access status">
      <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {state === "PENDING" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning">
              <Clock3 aria-hidden="true" className="size-3.5" /> Pending review
            </p>
            <h1 className="page-title mt-2">Your request is in the queue</h1>
            <p className="mt-1 text-sm text-muted">
              Signed in as <strong>@{user.githubLogin}</strong>. A professor will approve or reject your request. Protected pages stay locked until then — this is enforced by the backend, not this screen.
            </p>
            <Button tone="secondary" className="mt-4" onClick={() => nav("/sign-in")}>Sign in as someone else (demo)</Button>
          </>
        )}
        {state === "REJECTED" && (
          <>
            <h1 className="page-title text-danger">Request not approved</h1>
            <p className="mt-1 text-sm text-muted">
              Your access request was rejected. You may submit a new request once the 24-hour restriction expires — the countdown below uses server-recorded time, not your device clock.
            </p>
            <div className="mt-3 rounded-xl border border-white/10 bg-canvas/80 p-3 text-sm">
              <p>Eligible to reapply: <strong className="tnum text-warning">in {timeUntil(user.reapplyAfter)}</strong></p>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
              <Button loading={busy} onClick={request} className="w-full sm:w-auto">Submit a new access request</Button>
              <Button tone="secondary" onClick={expireDemoLock} className="w-full sm:w-auto">Demo: simulate lock expiry</Button>
            </div>
          </>
        )}
        {state === "APPROVED" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-bg px-2.5 py-1 text-xs font-bold text-success">
              <CheckCircle2 aria-hidden="true" className="size-3.5" /> Approved
            </p>
            <h1 className="page-title mt-2">Access Approved</h1>
            <p className="mt-1 text-sm text-muted">Your student enrollment is approved. You can now access all course assignments.</p>
            <Button className="mt-4" onClick={() => nav("/app/dashboard")}>Open student dashboard</Button>
          </>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .then(() => getMyRequest())
      .then((r) => {
        if (!cancelled) setRequest(r.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refresh]);

  if (loading) {
    return (
      <AuthShell eyebrow="Access status">
        <Card className="glass-panel"><LoadingState label="Checking your access status…" /></Card>
      </AuthShell>
    );
  }
  if (!user) {
    nav("/sign-in", { replace: true });
    return null;
  }

  const state = user.accessState;

  const submit = async () => {
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
        setError("You already have an active pending request.");
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell eyebrow="Access status">
      <Card className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {state === "PENDING" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning">
              <Clock3 aria-hidden="true" className="size-3.5" /> Pending review
            </p>
            <h1 className="page-title mt-2">Your request is in the queue</h1>
            <p className="mt-1 text-sm text-muted">
              Signed in as <strong>@{user.githubLogin}</strong>
              {request?.submittedAt && <> · submitted <strong className="tnum">{formatDateTime(request.submittedAt)}</strong></>}.
              A professor will approve or reject your request. Protected pages stay locked until then.
            </p>
            <Button tone="secondary" className="mt-4" onClick={() => nav("/sign-in")}>Use a different account</Button>
          </>
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
              <Button loading={busy} onClick={submit} className="w-full sm:w-auto">Submit a new access request</Button>
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
  if (isLiveMode()) {
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
  return <DemoAccessStatus />;
}
