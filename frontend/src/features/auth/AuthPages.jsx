import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, ArrowRight, GraduationCap, Clock3, CheckCircle2 } from "lucide-react";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, TextInput } from "../../components/ui/Field.jsx";
import { LoadingState } from "../../components/ui/States.jsx";
import { DemoBadge } from "../../components/layout/Chrome.jsx";
import { getMyRequest, isLiveMode, submitAccessRequest } from "../../services/api.js";
import { useToast } from "../../hooks/useToast.js";
import { formatDateTime, timeUntil } from "../../lib/format.js";

function AuthShell({ children, eyebrow }) {
  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
              <GraduationCap aria-hidden="true" className="size-6" />
            </span>
            <div className="leading-tight">
              <p className="font-extrabold tracking-tight">DSA Practice Tracker</p>
              <p className="text-xs text-muted">{eyebrow}</p>
            </div>
          </div>
          {children}
          <div className="mt-4"><DemoBadge /></div>
        </div>
      </div>
    </div>
  );
}

export function SignInPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);

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
      <AuthShell eyebrow="GitHub-verified student practice">
        <Card>
          <h1 className="page-title">Sign in to practice</h1>
          <p className="mt-1 text-sm text-muted">
            Students sign in with GitHub. Program access still needs professor approval — signing in alone unlocks nothing (BR-01).
          </p>
          {auth.error && (
            <p role="alert" className="mt-3 rounded-xl bg-danger-bg/60 p-3 text-sm font-medium text-danger">
              Could not reach the server: {auth.error} Check that the backend is running and try again.
            </p>
          )}
          {failed && <p role="alert" className="mt-3 rounded-xl bg-danger-bg/60 p-3 text-sm font-medium text-danger">{failed}</p>}
          <div className="mt-4 grid gap-2">
            <Button loading={busy} onClick={start}>
              <GithubMark /> Continue with GitHub
            </Button>
          </div>
          <div className="mt-4 border-t border-border pt-4 text-sm">
            <Link to="/admin-login" className="inline-flex items-center gap-1.5 font-semibold text-primary">
              <ShieldCheck aria-hidden="true" className="size-4" /> Professor-admin sign in <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <p className="mt-1 text-[13px] text-muted">Admin sign-in is separate and visually distinct to avoid role confusion.</p>
          </div>
        </Card>
      </AuthShell>
    );
  }

  const { signInAs } = auth;
  const login = (persona, to) => { signInAs(persona); nav(to, { replace: true }); };

  return (
    <AuthShell eyebrow="GitHub-verified student practice">
      <Card>
        <h1 className="page-title">Sign in to practice</h1>
        <p className="mt-1 text-sm text-muted">
          Students sign in with GitHub. Program access still needs professor approval — signing in alone unlocks nothing (BR-01).
        </p>
        <div className="mt-4 grid gap-2">
          <Button onClick={() => login("student", "/app/dashboard")}>
            <GithubMark /> Continue with GitHub <span className="font-normal opacity-80">(demo · approved)</span>
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button tone="secondary" onClick={() => login("pending", "/access-status")}>Demo: pending</Button>
            <Button tone="secondary" onClick={() => login("rejected", "/access-status")}>Demo: rejected</Button>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-4 text-sm">
          <Link to="/admin-login" className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <ShieldCheck aria-hidden="true" className="size-4" /> Professor-admin sign in <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <p className="mt-1 text-[13px] text-muted">Admin sign-in is separate and visually distinct to avoid role confusion.</p>
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

  if (!auth.isDemo) {
    if (auth.loading) return <AuthShell eyebrow="Restricted · professors only"><LoadingState label="Checking your session…" /></AuthShell>;
    if (auth.user?.role === "admin") {
      nav("/admin/dashboard", { replace: true });
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
      <AuthShell eyebrow="Restricted · professors only">
        <Card className="border-primary/30">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
            <ShieldCheck aria-hidden="true" className="size-3.5" /> Professor admin
          </p>
          <h1 className="page-title mt-2">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">Only the two pre-authorized professor accounts can access this console. Student sign-in never grants admin rights (FR-AUTH-04).</p>
          {failed && <p role="alert" className="mt-3 rounded-xl bg-danger-bg/60 p-3 text-sm font-medium text-danger">{failed}</p>}
          <div className="mt-4 grid gap-2">
            <Button loading={busy} onClick={start}>
              <GithubMark /> Continue with GitHub (professors)
            </Button>
            <Link to="/sign-in" className="text-center text-sm font-semibold text-primary">← Back to student sign in</Link>
          </div>
        </Card>
      </AuthShell>
    );
  }

  const { signInAs } = auth;
  return (
    <AuthShell eyebrow="Restricted · professors only">
      <Card className="border-primary/30">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
          <ShieldCheck aria-hidden="true" className="size-3.5" /> Professor admin
        </p>
        <h1 className="page-title mt-2">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Only the two pre-authorized professor accounts can access this console. Student sign-in never grants admin rights (FR-AUTH-04).</p>
        <div className="mt-4 grid gap-2">
          <Button onClick={() => { signInAs("admin"); nav("/admin/dashboard", { replace: true }); }}>
            Sign in as Prof. Rao <span className="font-normal opacity-80">(demo)</span>
          </Button>
          <Link to="/sign-in" className="text-center text-sm font-semibold text-primary">← Back to student sign in</Link>
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

  // A provider refusal (`?error=`) is derived during render, not written
  // into state from the effect below (which only handles the async refresh).
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
      <Card>
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
      // Demo-only simulation of the backend REAPPLICATION_LOCKED response
      // (real enforcement is server-side per FR-AUTH-06; see services/api.js).
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
      <Card>
        {state === "PENDING" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning"><Clock3 aria-hidden="true" className="size-3.5" /> Pending review</p>
            <h1 className="page-title mt-2">Your request is in the queue</h1>
            <p className="mt-1 text-sm text-muted">Signed in as <strong>@{user.githubLogin}</strong>. A professor will approve or reject your request. Protected pages stay locked until then — this is enforced by the backend, not this screen.</p>
            <Button tone="secondary" className="mt-4" onClick={() => nav("/sign-in")}>Sign in as someone else (demo)</Button>
          </>
        )}
        {state === "REJECTED" && (
          <>
            <h1 className="page-title">Request not approved</h1>
            <p className="mt-1 text-sm text-muted">Your access request was rejected. You may submit a new request once the 24-hour restriction expires — the countdown below uses server-recorded time, not your device clock.</p>
            <div className="mt-3 rounded-xl bg-canvas p-3 text-sm">
              <p>Eligible to reapply: <strong className="tnum">in {timeUntil(user.reapplyAfter)}</strong></p>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button loading={busy} onClick={request}>Submit a new access request</Button>
              <Button tone="secondary" onClick={expireDemoLock}>Demo: simulate lock expiry</Button>
            </div>
          </>
        )}
        {state === "APPROVED" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 aria-hidden="true" className="size-3.5" /> Approved</p>
            <h1 className="page-title mt-2">You’re in</h1>
            <Field label="Demo shortcut"><TextInput value="" readOnly placeholder="Approval unlocks /app/** routes" /></Field>
            <Button className="mt-3" onClick={() => nav("/app/dashboard")}>Open student dashboard</Button>
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
        <Card><LoadingState label="Checking your access status…" /></Card>
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
      <Card>
        {state === "PENDING" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-xs font-bold text-warning"><Clock3 aria-hidden="true" className="size-3.5" /> Pending review</p>
            <h1 className="page-title mt-2">Your request is in the queue</h1>
            <p className="mt-1 text-sm text-muted">Signed in as <strong>@{user.githubLogin}</strong>
              {request?.submittedAt && <> · submitted <strong className="tnum">{formatDateTime(request.submittedAt)}</strong></>}.
              A professor will approve or reject your request. Protected pages stay locked until then.</p>
            <Button tone="secondary" className="mt-4" onClick={() => nav("/sign-in")}>Use a different account</Button>
          </>
        )}
        {state === "REJECTED" && (
          <>
            <h1 className="page-title">Request not approved</h1>
            <p className="mt-1 text-sm text-muted">Your access request was rejected. You may submit a new request once the 24-hour restriction expires — the countdown below uses the server-recorded rejection time, not your device clock.</p>
            <div className="mt-3 rounded-xl bg-canvas p-3 text-sm">
              <p>Eligible to reapply: <strong className="tnum">{request?.reapplyAfter ? `in ${timeUntil(request.reapplyAfter)}` : "now"}</strong></p>
            </div>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button loading={busy} onClick={submit}>Submit a new access request</Button>
            </div>
          </>
        )}
        {state === "APPROVED" && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 aria-hidden="true" className="size-3.5" /> Approved</p>
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
          <Card><LoadingState label="Checking your access status…" /></Card>
        </AuthShell>
      );
    }
    if (!user) return null;
    return <LiveAccessStatus />;
  }
  return <DemoAccessStatus />;
}
