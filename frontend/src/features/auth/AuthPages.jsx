import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, GraduationCap, Clock3, CheckCircle2 } from "lucide-react";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, TextInput } from "../../components/ui/Field.jsx";
import { DemoBadge } from "../../components/layout/Chrome.jsx";
import { submitAccessRequest } from "../../services/api.js";
import { useToast } from "../../context/ToastContext.jsx";
import { timeUntil } from "../../lib/format.js";

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
  const { signInAs } = useAuth();
  const nav = useNavigate();
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
  const { signInAs } = useAuth();
  const nav = useNavigate();
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

export function AccessStatusPage() {
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
