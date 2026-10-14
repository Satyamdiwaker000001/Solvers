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
  Users,
  Zap,
} from "lucide-react";
import { GithubMark } from "../../components/ui/GithubMark.jsx";
import { SolversLogo } from "../../components/ui/SolversLogo.jsx";
import { useAuth } from "../../hooks/useAuth.js";

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

  // Session redirect if already logged in (background check with zero blocking loader)
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

  // Trap browser Forward and Back buttons on login page
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

  return (
    <main className="min-h-[100dvh] w-full bg-[#F3F4FF] text-[#151936] flex items-center justify-center p-3 sm:p-5 lg:p-6 relative selection:bg-[#4F46E5]/20 selection:text-[#4F46E5] overflow-y-auto">
      {/* Background ambient soft glows on outer canvas */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"
        aria-hidden="true"
      />

      {/* Main Login Card Container:
          Responsive, scrollable when needed so inputs are always accessible on Mobile M & L */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-[860px] lg:max-w-[980px] xl:max-w-[1040px] md:max-h-[92dvh] bg-white border border-[#E2E6F5] rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_-10px_rgba(79,70,229,0.08)] overflow-hidden relative z-10 flex flex-col md:flex-row my-auto">
        
        {/* ========================================================================= */}
        {/* LEFT SHOWCASE PANEL: Solvers Logo, Value Props, and Mascot                */}
        {/* ========================================================================= */}
        <section
          aria-label="Solvers introduction and features"
          className="w-full md:w-[55%] lg:w-[56%] relative p-3.5 sm:p-6 lg:p-7 flex flex-col justify-between overflow-hidden bg-[#F8F8FF] shrink-0 border-b md:border-b-0 md:border-r border-[#E2E6F5]"
        >
          {/* Background image layer showing exactly the left half (200% width aligned to left) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "url('/background.png')",
              backgroundSize: "200% 100%",
              backgroundPosition: "left center",
              backgroundRepeat: "no-repeat",
            }}
            aria-hidden="true"
          />

          {/* Subtle contrast overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-[#F8F8FF]/95 via-[#F8F8FF]/85 to-[#F8F8FF]/50 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top Row: Clean Solvers Wordmark (NO tags or extra badges) */}
          <div className="relative z-10 flex items-center mb-3">
            <SolversLogo size="default" />
          </div>

          {/* Hero Content & 3D Mascot Showcase */}
          <div className="relative z-10 my-auto py-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 lg:gap-5 items-center">
              
              {/* Left Column: Headlines & Features */}
              <div className="md:col-span-7 flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-[34px] font-black text-[#151936] tracking-tight leading-[1.15]">
                  Practice. <span className="text-[#4F46E5]">Track.</span> Improve.
                </h1>

                <p className="mt-1.5 text-xs text-[#647096] leading-relaxed max-w-sm font-normal">
                  A DSA practice platform for students, verified by GitHub. Stay consistent, compete, and grow together.
                </p>

                {/* Feature Items - collapsed to 2 on small screens, all 4 on sm+ */}
                <div className="mt-3 space-y-1.5 max-w-sm">
                  {/* Feature 1 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="size-7 sm:size-8 rounded-lg bg-[#EAF8F1] flex items-center justify-center text-[#16A765] shrink-0 border border-[#16A765]/20">
                      <CheckCircle2 className="size-3.5 sm:size-4" />
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
                    <div className="size-7 sm:size-8 rounded-lg bg-[#EEF0F8] flex items-center justify-center text-[#151936] shrink-0 border border-[#151936]/15">
                      <GithubMark className="size-3.5 sm:size-4" />
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

                  {/* Feature 3 (Hidden on mobile to save vertical space for login inputs) */}
                  <div className="hidden sm:flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="size-8 rounded-lg bg-[#FEF6E9] flex items-center justify-center text-[#F59E0B] shrink-0 border border-[#F59E0B]/25">
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

                  {/* Feature 4 (Hidden on mobile to save vertical space for login inputs) */}
                  <div className="hidden sm:flex items-center gap-2.5 p-1.5 rounded-xl transition-colors hover:bg-white/60">
                    <div className="size-8 rounded-lg bg-[#EEECFF] flex items-center justify-center text-[#4F46E5] shrink-0 border border-[#4F46E5]/20">
                      <Users className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold text-[#151936] leading-tight">
                        Guided by Professors
                      </h2>
                      <p className="text-[11px] text-[#647096] mt-0.5 truncate">
                        Learn with proper guidance
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 3D Mascot Character */}
              <div className="hidden md:flex md:col-span-5 relative flex-col items-center justify-center">
                {/* Shifted down slightly to -translate-y-4 */}
                <div className="relative flex flex-col items-center -translate-y-4">
                  {/* Soft circular aura */}
                  <div
                    className="w-52 h-52 xl:w-60 xl:h-60 rounded-full bg-gradient-to-tr from-[#E9E7FF]/90 to-[#F1EFFF]/80 absolute z-0 blur-[1px] top-6 translate-y-2"
                    aria-hidden="true"
                  />

                  {/* Doodle rays above mascot head */}
                  <div className="absolute -top-5 left-1/2 -translate-x-6 z-0 opacity-80" aria-hidden="true">
                    <svg width="36" height="22" viewBox="0 0 40 24" fill="none">
                      <path d="M6 18L14 8" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M20 16V4" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M34 18L26 8" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Mascot Image */}
                  <div className="relative z-10 flex items-center justify-center">
                    <img
                      src="/mascot.png"
                      alt="Solvers Student Character"
                      className="w-auto h-56 xl:h-64 object-contain select-none transition-transform duration-300 hover:scale-[1.02]"
                      loading="eager"
                      width={320}
                      height={360}
                    />
                  </div>

                  {/* Quote Tag underneath avatar: Slim height (py-1), wider (px-5 sm:px-6), single line */}
                  <div className="relative -mt-6 z-20 px-5 sm:px-6 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#E2E6F5] shadow-[0_4px_16px_rgba(79,70,229,0.12)] flex items-center justify-center gap-2 select-none whitespace-nowrap transition-transform hover:scale-105">
                    <span
                      className="text-xs sm:text-[13px] font-semibold text-[#647096] italic tracking-wide"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Same Effort,
                    </span>
                    <span
                      className="text-sm sm:text-base font-bold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent leading-none"
                      style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                    >
                      Higher Future ✨
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust Line - Generously sized with ample breathing room */}
          <div className="relative z-10 pt-4 pb-1 hidden sm:grid sm:grid-cols-3 gap-3 border-t border-[#E2E6F5] text-[#475569]">
            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/50 backdrop-blur-xs border border-[#E2E6F5]/60 shadow-xs">
              <div className="size-7 rounded-lg bg-[#EEECFF] flex items-center justify-center text-[#4F46E5] shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-[#151936]">Secure</span>
                <span className="text-[11px] text-[#647096] font-medium">Authentication</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/50 backdrop-blur-xs border border-[#E2E6F5]/60 shadow-xs">
              <div className="size-7 rounded-lg bg-[#E7F8F0] flex items-center justify-center text-[#16A765] shrink-0">
                <Users className="size-4" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-[#151936]">Academic</span>
                <span className="text-[11px] text-[#647096] font-medium">Integrity</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-white/50 backdrop-blur-xs border border-[#E2E6F5]/60 shadow-xs">
              <div className="size-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0">
                <Zap className="size-4" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-[#151936]">Focused on</span>
                <span className="text-[11px] text-[#647096] font-medium">Real Learning</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT AUTH PANEL: Clean, Professional Login Interface                      */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="login-surface-heading"
          className="w-full md:w-[45%] lg:w-[44%] bg-white p-4 sm:p-7 md:p-8 flex flex-col justify-between items-center relative"
        >
          {/* Top Right: Stylish Inspirational Quote (hidden on extra small screens for maximum form focus) */}
          <div className="w-full hidden sm:flex items-center justify-end select-none pr-1">
            <div className="flex flex-col items-end text-right leading-none pointer-events-none">
              <span
                className="text-[11px] sm:text-xs font-semibold text-[#8E99B8] italic tracking-wide"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Code with purpose,
              </span>
              <span
                className="text-sm sm:text-[15px] font-bold bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent mt-0.5 tracking-tight"
                style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
              >
                Build your future 🚀
              </span>
            </div>
          </div>

          {/* Centered Login Block */}
          <div className="w-full max-w-[340px] sm:max-w-[360px] my-auto py-2 flex flex-col items-center text-center">
            
            <h2
              id="login-surface-heading"
              className="text-xl sm:text-2xl font-black text-[#151936] tracking-tight"
            >
              Welcome to <span className="text-[#4F46E5]">Solvers</span>
            </h2>

            <p className="text-xs text-[#647096] mt-1 font-normal max-w-xs">
              {showAdminForm
                ? "Sign in with your authorized professor account."
                : "Sign in with your GitHub account to continue."}
            </p>

            {/* Error Banner */}
            {(auth.error || failed) && (
              <div
                role="alert"
                className="w-full mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 text-left animate-in fade-in duration-200"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                <p className="font-medium leading-snug">
                  {failed || `Could not reach the server: ${auth.error}`}
                </p>
              </div>
            )}

            {/* Action Buttons OR Admin Form */}
            <div className="w-full mt-4 space-y-2.5">
              {!showAdminForm ? (
                <>
                  {/* Primary GitHub Button */}
                  <button
                    type="button"
                    onClick={startOAuth}
                    disabled={busy}
                    aria-label="Continue with GitHub"
                    className="w-full h-11 sm:h-12 bg-[#151936] hover:bg-[#1E2448] text-white rounded-xl sm:rounded-2xl flex items-center justify-between px-4 sm:px-5 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151936]"
                  >
                    <div className="flex items-center gap-2.5">
                      <GithubMark className="size-4 sm:size-4.5 text-white" />
                      <span className="font-semibold text-xs sm:text-sm">
                        {busy ? "Connecting..." : "Continue with GitHub"}
                      </span>
                    </div>
                    <ArrowRight className="size-3.5 sm:size-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-2.5 my-2" aria-hidden="true">
                    <div className="flex-1 h-px bg-[#E2E6F5]" />
                    <span className="text-[10px] font-semibold text-[#8E99B8] uppercase tracking-wider">
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
                    className="w-full h-10 sm:h-11 bg-white hover:bg-[#F8F8FF] text-[#151936] border border-[#E2E6F5] hover:border-[#CBD5E1] rounded-xl sm:rounded-2xl flex items-center justify-between px-3.5 sm:px-4 transition-all duration-200 disabled:opacity-60 cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4F46E5]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-5 rounded-lg bg-[#F0F2FA] flex items-center justify-center text-[#151936] shrink-0">
                        <Lock className="size-3" />
                      </div>
                      <span className="font-semibold text-xs text-[#151936] truncate">
                        Admin Login (Authorized Professors Only)
                      </span>
                    </div>
                    <ArrowRight className="size-3.5 text-[#8E99B8] group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </>
              ) : (
                /* Admin Credential Form */
                <form onSubmit={handleAdminSignIn} className="w-full space-y-2.5 text-left">
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
                    className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl text-xs transition-all shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
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
                    className="w-full py-1 text-xs font-medium text-[#647096] hover:text-[#151936] text-center transition-colors cursor-pointer"
                  >
                    &larr; Back to Student GitHub Login
                  </button>
                </form>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-[#8E99B8] text-center mt-3 leading-relaxed max-w-xs mx-auto">
              By signing in, you agree to our participation rules and academic integrity policy.
            </p>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="w-full max-w-[340px] sm:max-w-[360px] hidden md:grid grid-cols-3 gap-2 pt-2 border-t border-[#F0F2FA] text-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className="size-6 rounded-lg bg-[#EEECFF] flex items-center justify-center text-[#4F46E5]">
                <ShieldCheck className="size-3" />
              </div>
              <span className="text-[9px] font-semibold text-[#151936] leading-tight">
                Secure
                <br />
                Authentication
              </span>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <div className="size-6 rounded-lg bg-[#EAF8F1] flex items-center justify-center text-[#16A765]">
                <Users className="size-3" />
              </div>
              <span className="text-[9px] font-semibold text-[#151936] leading-tight">
                Academic
                <br />
                Integrity
              </span>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <div className="size-6 rounded-lg bg-[#FEF6E9] flex items-center justify-center text-[#F59E0B]">
                <Zap className="size-3" />
              </div>
              <span className="text-[9px] font-semibold text-[#151936] leading-tight">
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
