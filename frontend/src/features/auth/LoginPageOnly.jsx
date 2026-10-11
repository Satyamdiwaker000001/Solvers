import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { LoadingState } from "../../components/ui/States.jsx";
import { useAuth } from "../../hooks/useAuth.js";

function SolversWordmark({ size = "default" }) {
  const isCompact = size === "compact";
  return (
    <div className="flex items-center gap-2.5 select-none" aria-label="Solvers">
      <div
        className={`flex items-center justify-center font-mono font-bold text-white rounded-xl shadow-sm ${
          isCompact ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"
        } bg-[#4F46E5]`}
      >
        <span className="tracking-tighter">&lt;&#39;&gt;</span>
      </div>
      <span
        className={`font-black tracking-tight text-[#151936] ${
          isCompact ? "text-xl" : "text-2xl"
        }`}
      >
        Solvers
      </span>
    </div>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname === "/admin-login";

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const [showAdminForm, setShowAdminForm] = useState(isAdminRoute);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Sync admin route change
  useEffect(() => {
    if (isAdminRoute) {
      setShowAdminForm(true);
    }
  }, [isAdminRoute]);

  // Session redirect if already logged in
  useEffect(() => {
    if (auth.user && !auth.loading) {
      const target =
        auth.user.role === "admin"
          ? "/admin/dashboard"
          : auth.user.accessState === "APPROVED"
          ? "/app/dashboard"
          : "/access-status";
      navigate(target, { replace: true });
    }
  }, [auth.user, auth.loading, navigate, location]);

  // Trap browser Forward and Back buttons on login page so user cannot re-enter protected routes without logging in
  useEffect(() => {
    if (!auth.user && !auth.loading) {
      const onPopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, [auth.user, auth.loading]);

  const handleAdminSignIn = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setFailed("Please enter both username and password.");
      return;
    }
    setBusy(true);
    setFailed(null);
    try {
      const user = await auth.signInAdmin(username.trim(), password.trim());
      const target = user?.role === "admin" ? "/admin/dashboard" : "/app/dashboard";
      window.history.replaceState(null, "", target);
      navigate(target, { replace: true });
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
      await auth.signIn();
    } catch (error) {
      setFailed(error.message || "We could not start GitHub sign-in. Please try again.");
      setBusy(false);
    }
  };

  if (auth.loading) {
    return (
      <main className="min-h-screen bg-[#F3F4FF] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E2E6F5]">
          <LoadingState label="Checking your session…" />
        </div>
      </main>
    );
  }

  if (auth.user) return null;

  return (
    <main className="min-h-screen w-full bg-[#F3F4FF] text-[#151936] flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-x-hidden selection:bg-[#4F46E5]/20 selection:text-[#4F46E5]">
      {/* Background ambient soft glows on outer canvas */}
      <div
        className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-br from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -mr-40 -mt-40"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-gradient-to-tr from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -ml-40 -mb-40"
        aria-hidden="true"
      />

      {/* Main Login Card Container (Centered Split Screen on Desktop, App Shell on Mobile) */}
      <div className="w-full max-w-[1240px] min-h-[660px] bg-white border border-[#E2E6F5] rounded-[28px] sm:rounded-[34px] shadow-[0_24px_70px_-15px_rgba(79,70,229,0.08)] overflow-hidden relative z-10 flex flex-col lg:flex-row">
        
        {/* ========================================================================= */}
        {/* LEFT BRANDING & MASCOT PANEL (BACKGROUND.PNG APPLIED SPECIFICALLY HERE)    */}
        {/* ========================================================================= */}
        <section
          aria-label="Solvers introduction and features"
          className="w-full lg:w-[57%] relative p-6 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden bg-[#F8F8FF] bg-[url('/background.png')] bg-cover bg-center bg-no-repeat"
        >
          {/* Soft contrast overlay so headline and feature cards stay crystal clear */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#F8F8FF]/90 via-[#F8F8FF]/75 to-[#F8F8FF]/35 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top Row: Wordmark */}
          <div className="relative z-10 flex items-center justify-between mb-6 sm:mb-8">
            <SolversWordmark />
          </div>

          {/* Hero Content & Mascot Area */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center my-auto">
            {/* Left Column: Headlines & Features */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black text-[#151936] tracking-tight leading-[1.06]">
                Practice.
                <br />
                <span className="text-[#4F46E5]">Track.</span>
                <br />
                Improve.
              </h1>

              <p className="mt-4 text-sm sm:text-[15px] text-[#647096] leading-relaxed max-w-md font-normal">
                A DSA practice platform for students, verified by GitHub. Stay
                consistent, compete, and grow together.
              </p>

              {/* 4 Feature Items */}
              <div className="mt-8 space-y-3.5 max-w-md">
                {/* Feature 1 */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl transition-colors hover:bg-white/70">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF8F1] flex items-center justify-center text-[#16A765] shrink-0 shadow-xs border border-[#16A765]/20">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#151936] leading-tight">
                      Daily progress tracking
                    </h3>
                    <p className="text-xs text-[#647096] mt-0.5">
                      Stay consistent every day
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl transition-colors hover:bg-white/70">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF0F8] flex items-center justify-center text-[#151936] shrink-0 shadow-xs border border-[#151936]/15">
                    <GithubMark className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#151936] leading-tight">
                      GitHub verified submissions
                    </h3>
                    <p className="text-xs text-[#647096] mt-0.5">
                      Show real progress, no shortcuts
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl transition-colors hover:bg-white/70">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF6E9] flex items-center justify-center text-[#F59E0B] shrink-0 shadow-xs border border-[#F59E0B]/25">
                    <BarChart3 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#151936] leading-tight">
                      Leaderboard &amp; analytics
                    </h3>
                    <p className="text-xs text-[#647096] mt-0.5">
                      Compete and track your growth
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-center gap-3.5 p-2 rounded-xl transition-colors hover:bg-white/70">
                  <div className="w-10 h-10 rounded-xl bg-[#EEECFF] flex items-center justify-center text-[#4F46E5] shrink-0 shadow-xs border border-[#4F46E5]/20">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#151936] leading-tight">
                      Guided by Professor Admins
                    </h3>
                    <p className="text-xs text-[#647096] mt-0.5">
                      Learn with proper guidance
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Mascot Cutout with Whimsical Accents */}
            <div className="md:col-span-5 relative flex items-center justify-center pt-2 pb-4 md:py-0">
              {/* Soft circular lavender aura behind character */}
              <div
                className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full bg-gradient-to-tr from-[#E9E7FF]/90 to-[#F1EFFF]/80 absolute z-0 -translate-y-2 blur-[1px]"
                aria-hidden="true"
              />

              {/* Playful doodle rays above head */}
              <div
                className="absolute top-2 left-1/2 -translate-x-12 z-0 opacity-80"
                aria-hidden="true"
              >
                <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                  <path
                    d="M6 18L14 8"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20 16V4"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M34 18L26 8"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Yellow squiggle noodle doodle */}
              <div
                className="absolute top-12 right-2 sm:right-6 z-0 opacity-90 hidden sm:block"
                aria-hidden="true"
              >
                <svg width="32" height="38" viewBox="0 0 32 38" fill="none">
                  <path
                    d="M22 4C14 6 6 12 8 20C10 26 26 28 24 34"
                    stroke="#F59E0B"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* 3D Student Character Cutout */}
              <div className="relative z-10 flex items-center justify-center">
                <img
                  src="/mascot.png"
                  alt="Solvers 3D Student Character with Laptop"
                  className="w-auto h-52 sm:h-64 md:h-72 lg:h-80 object-contain select-none transition-transform duration-300 hover:scale-[1.02]"
                  loading="eager"
                  width={360}
                  height={400}
                />
                {/* Subtle Solvers code mark on laptop lid */}
                <div
                  className="absolute right-[28%] bottom-[25%] text-[#8C98BA]/75 font-mono font-bold text-xs select-none pointer-events-none tracking-tighter hidden sm:block"
                  aria-hidden="true"
                >
                  &lt;&gt;
                </div>
              </div>

              {/* Floating handwriting badge: "Better Coders Everyday!" */}
              <div className="absolute -bottom-2 -left-2 sm:bottom-0 sm:left-4 z-20 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-[#E2E6F5] shadow-sm rotate-[-6deg] select-none flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#4F46E5]" />
                <span className="text-xs font-bold text-[#4F46E5] tracking-tight">
                  Better Coders Everyday!
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Desk Book Stack Accent (aligned with the potted plant on background.png) */}
          <div className="relative z-10 pt-4 hidden lg:flex items-center gap-4">
            <div className="flex flex-col select-none" aria-hidden="true">
              <div className="w-20 h-4 bg-[#4F46E5] text-[7.5px] text-white font-mono font-bold flex items-center justify-center rounded-xs shadow-xs">
                DSA
              </div>
              <div className="w-22 h-4 bg-[#151936] text-[7.5px] text-white font-mono font-bold flex items-center justify-center rounded-xs shadow-xs mt-0.5">
                Algorithms
              </div>
              <div className="w-24 h-4.5 bg-[#DC4545] text-[7.5px] text-white font-mono font-bold flex items-center justify-center rounded-xs shadow-xs mt-0.5">
                Problem Solving
              </div>
            </div>
            <span className="text-xs font-semibold text-[#8C98BA] italic select-none">
              Build your competitive foundation
            </span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT AUTHENTICATION PANEL (PERFECTLY CENTERED OPTIONS & FORMS)           */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="login-surface-heading"
          className="w-full lg:w-[43%] bg-white border-t lg:border-t-0 lg:border-l border-[#E2E6F5] p-6 sm:p-10 lg:p-12 flex flex-col justify-between items-center relative"
        >
          {/* Top Row: Faint Tilted Handwriting Text */}
          <div className="w-full flex justify-end select-none">
            <span
              className="text-[13px] font-semibold text-[#9BA8CD] italic select-none pointer-events-none"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Same Effort, Higher Future
            </span>
          </div>

          {/* Centered Login / Admin Form Block */}
          <div className="w-full max-w-[380px] my-auto py-6 flex flex-col items-center text-center">
            {/* Header: Welcome to Solvers */}
            <h2
              id="login-surface-heading"
              className="text-2xl sm:text-3xl font-black text-[#151936] tracking-tight"
            >
              Welcome to <span className="text-[#4F46E5]">Solvers</span>
            </h2>
            <p className="text-sm text-[#647096] mt-2 font-normal max-w-xs">
              {showAdminForm
                ? "Sign in with your authorized professor account."
                : "Sign in with your GitHub account to continue."}
            </p>

            {/* Error Banner */}
            {(auth.error || failed) && (
              <div
                role="alert"
                className="w-full mt-5 p-3.5 rounded-xl bg-[#DC4545]/10 border border-[#DC4545]/20 text-[#DC4545] text-xs sm:text-sm flex items-start gap-2.5 text-left animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="font-medium leading-snug">
                  {failed || `Could not reach the server: ${auth.error}`}
                </p>
              </div>
            )}

            {/* Primary Action Buttons OR Admin Form */}
            <div className="w-full mt-7 space-y-4">
              {!showAdminForm ? (
                <>
                  {/* Primary GitHub Button */}
                  <button
                    type="button"
                    onClick={startOAuth}
                    disabled={busy}
                    aria-label="Continue with GitHub"
                    className="w-full h-[52px] bg-[#151936] hover:bg-[#1E2448] text-white rounded-2xl flex items-center justify-between px-5 sm:px-6 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151936]"
                  >
                    <div className="flex items-center gap-3">
                      <GithubMark className="size-5 text-white" />
                      <span className="font-semibold text-sm sm:text-[15px]">
                        {busy ? "Connecting..." : "Continue with GitHub"}
                      </span>
                    </div>
                    <ArrowRight className="size-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Divider: or */}
                  <div className="flex items-center gap-3 my-5" aria-hidden="true">
                    <div className="flex-1 h-px bg-[#E2E6F5]" />
                    <span className="text-xs font-semibold text-[#8E99B8] uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 h-px bg-[#E2E6F5]" />
                  </div>

                  {/* Admin Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFailed(null);
                      setShowAdminForm(true);
                    }}
                    disabled={busy}
                    aria-label="Admin Login (Authorized Professors Only)"
                    className="w-full h-[52px] bg-white hover:bg-[#F8F8FF] text-[#151936] border border-[#E2E6F5] hover:border-[#D0D5E8] rounded-2xl flex items-center justify-between px-5 sm:px-6 transition-all duration-200 disabled:opacity-60 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#F0F2FA] flex items-center justify-center text-[#151936]">
                        <Lock className="size-3.5" />
                      </div>
                      <span className="font-semibold text-xs sm:text-sm text-[#151936]">
                        Admin Login (Authorized Professors Only)
                      </span>
                    </div>
                    <ArrowRight className="size-4 text-[#8E99B8] group-hover:translate-x-1 transition-transform" />
                  </button>
                </>
              ) : (
                /* Admin Credential Form (Center-aligned layout) */
                <form onSubmit={handleAdminSignIn} className="w-full space-y-4 text-left">
                  <div>
                    <label
                      htmlFor="admin-username"
                      className="block text-xs font-semibold text-[#151936] mb-1.5"
                    >
                      Professor Username
                    </label>
                    <input
                      id="admin-username"
                      type="text"
                      autoComplete="username"
                      placeholder="e.g. admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={busy}
                      className="w-full h-[46px] px-3.5 rounded-xl border border-[#E2E6F5] bg-[#F8F8FF] text-sm text-[#151936] focus:bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-password"
                      className="block text-xs font-semibold text-[#151936] mb-1.5"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="admin-password"
                        type={passwordVisible ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                        className="w-full h-[46px] pl-3.5 pr-10 rounded-xl border border-[#E2E6F5] bg-[#F8F8FF] text-sm text-[#151936] focus:bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E99B8] hover:text-[#151936] cursor-pointer"
                      >
                        {passwordVisible ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl text-sm transition-all shadow-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="size-4" />
                    {busy ? "Verifying..." : "Sign in as Admin"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFailed(null);
                      setShowAdminForm(false);
                    }}
                    disabled={busy}
                    className="w-full py-2 text-xs font-medium text-[#647096] hover:text-[#151936] text-center transition-colors cursor-pointer"
                  >
                    &larr; Back to Student GitHub Login
                  </button>
                </form>
              )}


            </div>

            {/* Participation Rules & Academic Integrity Disclaimer */}
            <p className="text-xs text-[#8E99B8] text-center mt-6 leading-relaxed max-w-xs mx-auto">
              By signing in, you agree to our participation rules and academic
              integrity policy.
            </p>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="w-full max-w-[380px] grid grid-cols-3 gap-2 pt-6 border-t border-[#F0F2FA] text-center">
            {/* Indicator 1 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-[#EEECFF] flex items-center justify-center text-[#4F46E5]">
                <ShieldCheck className="size-4" />
              </div>
              <span className="text-[11px] font-semibold text-[#151936] leading-tight">
                Secure
                <br />
                Authentication
              </span>
            </div>

            {/* Indicator 2 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-[#EAF8F1] flex items-center justify-center text-[#16A765]">
                <Users className="size-4" />
              </div>
              <span className="text-[11px] font-semibold text-[#151936] leading-tight">
                Academic
                <br />
                Integrity
              </span>
            </div>

            {/* Indicator 3 */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-[#FEF6E9] flex items-center justify-center text-[#F59E0B]">
                <Zap className="size-4" />
              </div>
              <span className="text-[11px] font-semibold text-[#151936] leading-tight">
                Focused on
                <br />
                Real Learning
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SignInPage() {
  return <LoginPage />;
}

export function AdminLoginPage() {
  return <LoginPage />;
}
