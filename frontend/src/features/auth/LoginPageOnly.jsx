import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowUpRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { siC, siCplusplus, siDotnet, siJavascript, siOpenjdk } from "simple-icons";
import javaLogoSvg from "devicon/icons/java/java-original.svg?raw";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState } from "../../components/ui/States.jsx";
import { SolversLogo } from "../../components/ui/SolversLogo.jsx";
import { useAuth } from "../../hooks/useAuth.js";

function LanguageBackground() {
  const marks = [
    { x: 115, y: 145, icon: siCplusplus, accent: "indigo" },
    { x: 188, y: 690, icon: siC, accent: "teal" },
    { x: 1320, y: 150, raw: javaLogoSvg, icon: siOpenjdk, accent: "teal", kind: "java-mark" },
    { x: 1435, y: 690, icon: siJavascript, accent: "indigo" },
    { x: 1500, y: 360, icon: siDotnet, accent: "teal" },
  ];
  return <svg className="language-background" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
    <g className="language-network"><path d="M90 150 L350 260 L520 120 M1450 150 L1260 260 L1080 110 M150 730 L390 620 L560 790 M1450 730 L1220 620 L1050 790" /><path d="M90 150 L150 730 M1450 150 L1450 730 M350 260 L390 620 M1260 260 L1220 620" /><circle cx="350" cy="260" r="4" /><circle cx="1260" cy="260" r="4" /><circle cx="390" cy="620" r="4" /><circle cx="1220" cy="620" r="4" /></g>
    {marks.map((mark) => <LanguageLogo key={mark.icon.title} {...mark} />)}
    <g className="language-grid"><path d="M0 270 H240 M1360 270 H1600 M0 635 H240 M1360 635 H1600" /><path d="M250 0 V120 M1350 0 V120 M250 780 V900 M1350 780 V900" /></g>
  </svg>;
}

function LanguageLogo({ x, y, raw, icon, accent, kind = "" }) {
  return <g transform={`translate(${x} ${y})`} className={`language-mark ${accent} ${kind}`}><circle r="34" />{raw ? <svg x="-24" y="-24" width="48" height="48" viewBox="0 0 128 128" aria-label="Java" role="img" dangerouslySetInnerHTML={{ __html: raw.replaceAll(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="currentColor"') }} /> : <svg x="-23" y="-23" width="46" height="46" viewBox="0 0 24 24" aria-label={icon.title} role="img"><path d={icon.path} /></svg>}</g>;
}

function LoginForm({ isDemo, isAdminRoute }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFailed("Please enter both username and password.");
      return;
    }
    setBusy(true);
    setFailed(null);
    try {
      const user = await auth.signInAdmin(username.trim(), password.trim());
      navigate(user?.role === "admin" ? "/admin/dashboard" : "/app/dashboard", { replace: true });
    } catch (error) {
      setFailed(error.message || "Invalid credentials. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startOAuth = async () => {
    setBusy(true);
    setFailed(null);
    try {
      if (isDemo) {
        auth.signInAs(isAdminRoute ? "admin" : "student");
        navigate(isAdminRoute ? "/admin/dashboard" : "/app/dashboard", { replace: true });
        return;
      }
      await auth.signIn();
    } catch (error) {
      setFailed(error.message || "We could not start GitHub sign-in. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      {(auth.error || failed) && (
        <div role="alert" className="auth-error">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          <p>{failed || `Could not reach the server: ${auth.error}`}</p>
        </div>
      )}
      <form className="auth-form" onSubmit={handleSignIn}>
        <div className="auth-field">
          <label htmlFor="login-identity">Username</label>
          <input
            id="login-identity"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <div className="auth-password-wrap">
            <input
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? "Hide password" : "Show password"}
            >
              {passwordVisible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="auth-signin-button"
          disabled={busy}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="auth-divider" aria-hidden="true"><span>OR</span></div>
      <Button onClick={startOAuth} loading={busy} className="auth-github-button" aria-label="Continue with GitHub">
        <GithubMark className="size-4" /> Continue with GitHub
      </Button>
    </>
  );
}

export function LoginPage() {
  const auth = useAuth(); const location = useLocation(); const navigate = useNavigate(); const isAdminRoute = location.pathname === "/admin-login";

  useEffect(() => {
    if (auth.user && !auth.loading) {
      navigate(auth.user.role === "admin" ? "/admin/dashboard" : auth.user.accessState === "APPROVED" ? "/app/dashboard" : "/access-status", { replace: true });
    }
  }, [auth.user, auth.loading, navigate, location]);

  useEffect(() => {
    // Force history push state to prevent back navigation entirely
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.go(1);
    };
    return () => {
      window.onpopstate = null;
    };
  }, []);

  if (!auth.isDemo && auth.loading) return <main className="auth-page"><LanguageBackground /><div className="auth-card"><LoadingState label="Checking your session…" /></div></main>;
  if (auth.user) return null;
  return <main className="auth-page"><LanguageBackground /><div className="auth-layout"><section className="auth-intro" aria-label="Solvers introduction"><div className="auth-intro-brand"><SolversLogo /><div><b>Solvers</b><small>DSA Practice Tracker</small></div></div><div className="auth-intro-copy"><p className="auth-kicker">YOUR DAILY EDGE IN DSA</p><h1>Think clearly.<br /><em>Code boldly.</em></h1><p>Turn every assignment into momentum with focused practice, verified progress, and a leaderboard that keeps you moving.</p><div className="auth-proof"><span><ShieldCheck aria-hidden="true" /><b>Evidence-based progress</b></span><span><ArrowUpRight aria-hidden="true" /><b>Built for consistency</b></span></div></div><div className="auth-intro-footer"><span>01</span><i /><span>Practice · Progress · Prove</span></div></section><div className="auth-stage"><section className="auth-card" aria-labelledby="login-heading"><header className="auth-brand"><span className="auth-brand-mark" aria-hidden="true"><SolversLogo compact /></span><div><p className="auth-brand-name">Welcome back</p><p className="auth-brand-descriptor">Sign in to continue your practice session</p></div></header><div className="auth-title-block"><p className="auth-card-eyebrow">READY WHEN YOU ARE</p><h2 id="login-heading" className="auth-heading">Let’s get solving.</h2></div><LoginForm isDemo={auth.isDemo} isAdminRoute={isAdminRoute} /></section></div></div></main>;
}

export function SignInPage() { return <LoginPage />; }
export function AdminLoginPage() { return <LoginPage />; }
