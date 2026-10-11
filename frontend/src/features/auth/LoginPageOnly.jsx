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
    <div className="flex items-center gap-2 select-none" aria-label="Solvers">
      <div
        className={`flex items-center justify-center font-mono font-bold text-white rounded-xl shadow-xs shrink-0 ${
          isCompact ? "w-7 h-7 text-xs" : "w-8 h-8 sm:w-9 sm:h-9 text-sm"
        } bg-[#4F46E5]`}
      >
        <span className="tracking-tighter">&lt;&#39;&gt;</span>
      </div>
      <span
        className={`font-black tracking-tight text-[#151936] ${
          isCompact ? "text-lg" : "text-xl sm:text-2xl"
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
      <main className="min-h-svh bg-[#F3F4FF] flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xs border border-[#E2E6F5]">
          <LoadingState label="Checking your session…" />
        </div>
      </main>
    );
  }

  if (auth.user) return null;

  return (
    <main className="min-h-svh w-full bg-[#F3F4FF] text-[#151936] flex items-center justify-center p-3 sm:p-5 md:p-6 lg:p-8 relative selection:bg-[#4F46E5]/20 selection:text-[#4F46E5]">
      {/* Background ambient soft glows on outer canvas */}
      <div
        className="absolute top-0 right-0 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-br from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"
        aria-hidden="true"
      />

      {/* Main Login Card Container:
          - Mobile (<md): Full available width card with proper padding (nearly 100% of screen).
          - Tablet (md): Split card 820px.
          - Desktop (lg+): 1080px split card. */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-[820px] lg:max-w-[1080px] xl:max-w-[1140px] bg-white border border-[#E2E6F5] rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_-10px_rgba(79,70,229,0.08)] overflow-hidden relative z-10 flex flex-col md:flex-row my-auto">
        
        {/* ========================================================================= */}
        {/* BRANDING & HERO PANEL                                                     */}
        {/* Mobile: App-like Hero at top. Tablet & Desktop: Left split banner.        */}
        {/* ========================================================================= */}
        <section
          aria-label="Solvers introduction and features"
          className="w-full md:w-[54%] lg:w-[56%] relative p-5 sm:p-6 md:p-6 lg:p-8 xl:p-9 flex flex-col justify-between overflow-hidden bg-[#F8F8FF] bg-[url('/background.png')] bg-cover bg-center bg-no-repeat shrink-0"
        >
          {/* Soft contrast overlay so headline and text stay readable */}
          <div
            className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-[#F8F8FF]/95 via-[#F8F8FF]/80 to-[#F8F8FF]/40 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top Row: Wordmark */}
          <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-5 md:mb-4">
            <SolversWordmark />
            <span className="md:hidden text-xs font-bold text-[#4F46E5] bg-[#EEECFF] px-2.5 py-0.5 rounded-full border border-[#4F46E5]/20 select-none">
              2027
            </span>
          </div>

          {/* Hero Content & Mascot Area:
              - Mobile (<md): Stacked hero layout.
              - Tablet & Desktop (md+): 2-column layout (Headline+Features left, Mascot right). */}
          <div className="relative z-10 my-auto">
            {/* Tablet & Desktop 2-column grid */}
            <div className="hidden md:grid grid-cols-12 gap-3.5 lg:gap-5 xl:gap-6 items-center">
              {/* Left: Headlines & Features */}
              <div className="col-span-7 flex flex-col justify-center">
                <h1 className="text-3xl xl:text-4xl font-black text-[#151936] tracking-tight leading-[1.1]">
                  Practice.
                  <br />
                  <span className="text-[#4F46E5]">Track.</span>
                  <br />
                  Improve.
                </h1>

                <p className="mt-2.5 text-xs xl:text-[13px] text-[#647096] leading-relaxed max-w-sm font-normal">
                  A DSA practice platform for students, verified by GitHub. Stay
                  consistent, compete, and grow together.
                </p>

                {/* 4 Feature Items (compact on desktop) */}
                <div className="mt-4 xl:mt-5 space-y-2 max-w-sm">
                  {/* Feature 1 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="w-8 h-8 rounded-lg bg-[#EAF8F1] flex items-center justify-center text-[#16A765] shrink-0 border border-[#16A765]/20">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold text-[#151936] leading-tight">
                        Daily progress tracking
                      </h2>
                      <p className="text-[11px] text-[#647096] mt-0.5 truncate">
                        Stay consistent every day
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF0F8] flex items-center justify-center text-[#151936] shrink-0 border border-[#151936]/15">
                      <GithubMark className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold text-[#151936] leading-tight">
                        GitHub verified submissions
                      </h2>
                      <p className="text-[11px] text-[#647096] mt-0.5 truncate">
                        Show real progress, no shortcuts
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF6E9] flex items-center justify-center text-[#F59E0B] shrink-0 border border-[#F59E0B]/25">
                      <BarChart3 className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold text-[#151936] leading-tight">
                        Leaderboard &amp; analytics
                      </h2>
                      <p className="text-[11px] text-[#647096] mt-0.5 truncate">
                        Compete and track your growth
                      </p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="w-8 h-8 rounded-lg bg-[#EEECFF] flex items-center justify-center text-[#4F46E5] shrink-0 border border-[#4F46E5]/20">
                      <Users className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold text-[#151936] leading-tight">
                        Guided by Professor Admins
                      </h2>
                      <p className="text-[11px] text-[#647096] mt-0.5 truncate">
                        Learn with proper guidance
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: 3D Mascot Cutout on Desktop */}
              <div className="col-span-5 relative flex flex-col items-center justify-center">
                {/* Soft circular lavender aura */}
                <div
                  className="w-48 h-48 xl:w-56 xl:h-56 rounded-full bg-gradient-to-tr from-[#E9E7FF]/90 to-[#F1EFFF]/80 absolute z-0 blur-[1px]"
                  aria-hidden="true"
                />

                {/* Playful doodle rays above head */}
                <div className="absolute -top-3 left-1/2 -translate-x-6 z-0 opacity-80" aria-hidden="true">
                  <svg width="32" height="20" viewBox="0 0 40 24" fill="none">
                    <path d="M6 18L14 8" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M20 16V4" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M34 18L26 8" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Mascot image */}
                <div className="relative z-10 flex items-center justify-center">
                  <img
                    src="/mascot.png"
                    alt="Solvers 3D Student Character with Laptop"
                    className="w-auto h-52 xl:h-60 object-contain select-none transition-transform duration-300 hover:scale-[1.02]"
                    loading="eager"
                    width={320}
                    height={360}
                  />
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-1 -left-1 xl:left-2 z-20 bg-white/95 px-2.5 py-1 rounded-full border border-[#E2E6F5] shadow-xs rotate-[-5deg] select-none flex items-center gap-1.5">
                  <Sparkles className="size-3 text-[#4F46E5]" />
                  <span className="text-[11px] font-bold text-[#4F46E5] tracking-tight">
                    Better Coders Everyday!
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Hero Layout (<md: 768px) */}
            <div className="md:hidden flex flex-col items-center text-center">
              <div className="relative w-full flex items-center justify-between gap-4">
                <div className="text-left flex-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#151936] tracking-tight leading-[1.1]">
                    Practice.
                    <br />
                    <span className="text-[#4F46E5]">Track.</span>
                    <br />
                    Improve.
                  </h1>
                  <p className="mt-1.5 text-xs text-[#647096] leading-relaxed max-w-[210px] sm:max-w-xs font-normal">
                    A DSA practice platform for students, verified by GitHub. Stay consistent, compete, and grow.
                  </p>
                </div>

                {/* Mobile Mascot Cutout */}
                <div className="relative shrink-0 flex items-center justify-center -mr-2">
                  <div
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#E9E7FF] to-[#F1EFFF] absolute z-0 blur-[0.5px]"
                    aria-hidden="true"
                  />
                  <img
                    src="/mascot.png"
                    alt="Solvers Student Character"
                    className="w-auto h-32 sm:h-40 object-contain select-none relative z-10"
                    loading="eager"
                    width={180}
                    height={200}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badges (Tablet & Desktop matching reference) */}
          <div className="relative z-10 pt-4 hidden md:flex items-center justify-between gap-2 border-t border-[#E2E6F5]/80">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#647096]">
              <ShieldCheck className="size-3.5 text-[#4F46E5]" />
              <span>Secure Authentication</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#647096]">
              <Users className="size-3.5 text-[#16A765]" />
              <span>Academic Integrity</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#647096]">
              <Zap className="size-3.5 text-[#F59E0B]" />
              <span>Real Learning</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* AUTHENTICATION PANEL                                                      */}
        {/* Clean, perfectly proportioned, accessible on all screen sizes             */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="login-surface-heading"
          className="w-full md:w-[46%] lg:w-[44%] bg-white border-t md:border-t-0 md:border-l border-[#E2E6F5] p-5 sm:p-7 md:p-6 lg:p-8 xl:p-9 flex flex-col justify-between items-center relative"
        >
          {/* Top Tag on Tablet & Desktop */}
          <div className="w-full hidden md:flex justify-end select-none">
            <span
              className="text-xs font-semibold text-[#9BA8CD] italic select-none pointer-events-none"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Same Effort, Higher Future
            </span>
          </div>

          {/* Centered Login / Admin Form Block */}
          <div className="w-full max-w-full sm:max-w-[380px] my-auto py-3 sm:py-4 flex flex-col items-center text-center">
            {/* Header: Welcome to Solvers */}
            <h2
              id="login-surface-heading"
              className="text-2xl sm:text-2xl font-black text-[#151936] tracking-tight"
            >
              Welcome to <span className="text-[#4F46E5]">Solvers</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#647096] mt-1.5 font-normal max-w-xs">
              {showAdminForm
                ? "Sign in with your authorized professor account."
                : "Sign in with your GitHub account to continue."}
            </p>

            {/* Error Banner */}
            {(auth.error || failed) && (
              <div
                role="alert"
                className="w-full mt-3.5 p-3 rounded-xl bg-[#DC4545]/10 border border-[#DC4545]/20 text-[#DC4545] text-xs flex items-start gap-2 text-left animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="font-medium leading-snug">
                  {failed || `Could not reach the server: ${auth.error}`}
                </p>
              </div>
            )}

            {/* Action Buttons OR Admin Form */}
            <div className="w-full mt-5 space-y-3">
              {!showAdminForm ? (
                <>
                  {/* Primary GitHub Button */}
                  <button
                    type="button"
                    onClick={startOAuth}
                    disabled={busy}
                    aria-label="Continue with GitHub"
                    className="w-full h-12 bg-[#151936] hover:bg-[#1E2448] text-white rounded-xl sm:rounded-2xl flex items-center justify-between px-4 sm:px-5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151936]"
                  >
                    <div className="flex items-center gap-2.5">
                      <GithubMark className="size-4.5 text-white" />
                      <span className="font-semibold text-xs sm:text-sm">
                        {busy ? "Connecting..." : "Continue with GitHub"}
                      </span>
                    </div>
                    <ArrowRight className="size-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Divider: or */}
                  <div className="flex items-center gap-3 my-3" aria-hidden="true">
                    <div className="flex-1 h-px bg-[#E2E6F5]" />
                    <span className="text-[11px] font-semibold text-[#8E99B8] uppercase tracking-wider">
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
                    className="w-full h-11 sm:h-12 bg-white hover:bg-[#F8F8FF] text-[#151936] border border-[#E2E6F5] hover:border-[#D0D5E8] rounded-xl sm:rounded-2xl flex items-center justify-between px-4 sm:px-5 transition-all duration-200 disabled:opacity-60 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-6 rounded-lg bg-[#F0F2FA] flex items-center justify-center text-[#151936] shrink-0">
                        <Lock className="size-3.5" />
                      </div>
                      <span className="font-semibold text-[11px] sm:text-xs text-[#151936] truncate">
                        Admin Login (Authorized Professors Only)
                      </span>
                    </div>
                    <ArrowRight className="size-3.5 text-[#8E99B8] group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </>
              ) : (
                /* Admin Credential Form */
                <form onSubmit={handleAdminSignIn} className="w-full space-y-3 text-left">
                  <div>
                    <label
                      htmlFor="admin-username"
                      className="block text-[11px] font-semibold text-[#151936] mb-1"
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
                      className="w-full h-10 px-3 rounded-xl border border-[#E2E6F5] bg-[#F8F8FF] text-xs text-[#151936] focus:bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-password"
                      className="block text-[11px] font-semibold text-[#151936] mb-1"
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
                        className="w-full h-10 pl-3 pr-9 rounded-xl border border-[#E2E6F5] bg-[#F8F8FF] text-xs text-[#151936] focus:bg-white focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E99B8] hover:text-[#151936] cursor-pointer"
                      >
                        {passwordVisible ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl text-xs transition-all shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Lock className="size-3.5" />
                    {busy ? "Verifying..." : "Sign in as Admin"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFailed(null);
                      setShowAdminForm(false);
                    }}
                    disabled={busy}
                    className="w-full py-1.5 text-xs font-medium text-[#647096] hover:text-[#151936] text-center transition-colors cursor-pointer"
                  >
                    &larr; Back to Student GitHub Login
                  </button>
                </form>
              )}
            </div>

            {/* Participation Rules & Academic Integrity Disclaimer */}
            <p className="text-[11px] text-[#8E99B8] text-center mt-4 sm:mt-5 leading-relaxed max-w-xs mx-auto">
              By signing in, you agree to our participation rules and academic
              integrity policy.
            </p>
          </div>

          {/* Bottom Trust Indicators (Hidden on small mobile to save vertical space, visible on tablet & desktop) */}
          <div className="w-full max-w-[340px] sm:max-w-[360px] hidden sm:grid grid-cols-3 gap-2 pt-4 border-t border-[#F0F2FA] text-center">
            {/* Indicator 1 */}
            <div className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-lg bg-[#EEECFF] flex items-center justify-center text-[#4F46E5]">
                <ShieldCheck className="size-3.5" />
              </div>
              <span className="text-[10px] font-semibold text-[#151936] leading-tight">
                Secure
                <br />
                Authentication
              </span>
            </div>

            {/* Indicator 2 */}
            <div className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-lg bg-[#EAF8F1] flex items-center justify-center text-[#16A765]">
                <Users className="size-3.5" />
              </div>
              <span className="text-[10px] font-semibold text-[#151936] leading-tight">
                Academic
                <br />
                Integrity
              </span>
            </div>

            {/* Indicator 3 */}
            <div className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-lg bg-[#FEF6E9] flex items-center justify-center text-[#F59E0B]">
                <Zap className="size-3.5" />
              </div>
              <span className="text-[10px] font-semibold text-[#151936] leading-tight">
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
