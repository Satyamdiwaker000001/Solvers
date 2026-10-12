import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  GitBranch,
  User,
  ShieldAlert,
  ArrowRight,
  Send,
  Timer,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { SolversLogo } from "../../components/ui/SolversLogo.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";
import { getMe, getMyRequest, submitAccessRequest } from "../../services/api.js";
import { formatDateTime, timeUntil } from "../../lib/format.js";

/**
 * Live countdown hook for the 24-hour rejection lock.
 * Ticks every second so the user sees live HH:MM:SS remaining.
 */
function useLiveCountdown(targetDate) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;

  const target = new Date(targetDate).getTime();
  const diffMs = Math.max(0, target - now);
  const totalSec = Math.floor(diffMs / 1000);
  const isExpired = totalSec <= 0;

  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    isExpired,
    totalSec,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    formatted: hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`,
  };
}

export function AccessStatusPage() {
  const { user, loading: authLoading, updateUser, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  // Reapply countdown from latest rejection
  const countdown = useLiveCountdown(request?.reapplyAfter);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/sign-in", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Silent polling to check admin decision without toggling global authLoading spinner
  const syncStatus = async (isManual = false) => {
    if (isManual) setChecking(true);
    setError(null);
    try {
      // 1. Fetch current user session directly to prevent global app unmounting
      const userRes = await getMe();
      const currentUser = userRes?.data?.user;

      if (currentUser) {
        // Update user state in auth context seamlessly
        updateUser(currentUser);

        // CASE 1: Admin approved / role is admin -> redirect immediately
        if (currentUser.role === "admin") {
          toast.push({ tone: "success", title: "Admin Access Active", body: "Opening Faculty Dashboard…" });
          navigate("/admin/dashboard", { replace: true });
          return;
        }

        if (currentUser.accessState === "APPROVED") {
          toast.push({ tone: "success", title: "Enrollment Approved", body: "Your access request has been approved. Redirecting to your student dashboard…" });
          navigate("/app/dashboard", { replace: true });
          return;
        }
      }

      // 2. Fetch request details (status, reapplyAfter, etc.)
      let reqRes = await getMyRequest().catch(() => null);

      // If pending user has no AccessRequest record yet, auto-submit one so admin sees it in queue
      if (!reqRes?.data && (currentUser?.accessState === "PENDING" || user?.accessState === "PENDING")) {
        try {
          const autoSub = await submitAccessRequest("Initial onboarding request");
          reqRes = { data: autoSub.data || autoSub };
        } catch {
          // ignore duplicate conflict
        }
      }

      if (reqRes?.data) {
        setRequest(reqRes.data);
      }
      setLastSynced(new Date());

      if (isManual) {
        toast.push({
          title: "Verification Queue Status",
          body: currentUser?.accessState === "PENDING"
            ? "Your request is currently awaiting faculty review in the admin queue."
            : `Current verification status: ${currentUser?.accessState || "PENDING"}`,
        });
      }
    } catch (e) {
      if (isManual) {
        setError(e.message || "Failed to synchronize status with server.");
      }
    } finally {
      if (isManual) setChecking(false);
      setInitialLoading(false);
    }
  };

  // Mount + polling loop every 5 seconds
  useEffect(() => {
    syncStatus(false);
    const interval = setInterval(() => {
      syncStatus(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReapply = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitAccessRequest("Reapplied after rejection cooldown");
      setRequest(res.data || res);
      toast.push({
        tone: "success",
        title: "Application Re-submitted",
        body: "Your request has been delivered to the faculty review queue.",
      });
      await syncStatus(false);
    } catch (e) {
      setError(e.message || "Unable to submit a new request. Please wait until the restriction timer expires.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate("/sign-in", { replace: true });
  };

  const currentState = user?.accessState || (request?.status ? request.status.toUpperCase() : "PENDING");
  const isPending = currentState === "PENDING";
  const isRejected = currentState === "REJECTED";
  const isApproved = currentState === "APPROVED";

  return (
    <main className="min-h-svh w-screen bg-[#F3F4FF] text-[#151936] flex items-center justify-center p-3 sm:p-6 lg:p-8 relative selection:bg-[#4F46E5]/20 selection:text-[#4F46E5] overflow-x-hidden">
      {/* Background ambient soft glows */}
      <div
        className="absolute top-0 right-0 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-br from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-[#E9E7FF]/70 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"
        aria-hidden="true"
      />

      {/* Main Container Card matching LoginPage theme */}
      <div className="w-full max-w-full sm:max-w-xl md:max-w-[840px] lg:max-w-[1020px] bg-white border border-[#E2E6F5] rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_-10px_rgba(79,70,229,0.08)] overflow-hidden relative z-10 flex flex-col md:flex-row my-auto">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: 3D Mascot & Character Showcase                                */}
        {/* ========================================================================= */}
        <section
          aria-label="Solvers Student Character"
          className="w-full md:w-[48%] lg:w-[46%] relative p-4 sm:p-6 md:p-8 flex flex-col justify-between overflow-hidden bg-[#F8F8FF] bg-[url('/background.png')] bg-cover bg-center bg-no-repeat shrink-0 border-b md:border-b-0 md:border-r border-[#E2E6F5]"
        >
          {/* Contrast overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-[#F8F8FF]/95 via-[#F8F8FF]/85 to-[#F8F8FF]/50 pointer-events-none"
            aria-hidden="true"
          />

          {/* Top Wordmark */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <SolversLogo size="default" />
            <span className="text-[11px] font-bold text-[#4F46E5] bg-[#EEECFF] px-2.5 py-0.5 rounded-full border border-[#4F46E5]/20 select-none">
              DSA 2027
            </span>
          </div>

          {/* 3D Mascot Showcase Area */}
          <div className="relative z-10 my-auto py-2 flex flex-col items-center text-center">
            {/* Circular ambient aura */}
            <div
              className={`w-44 h-44 sm:w-56 sm:h-56 rounded-full absolute z-0 blur-[1px] transition-colors duration-500 ${
                isRejected
                  ? "bg-gradient-to-tr from-rose-100 to-rose-200/80"
                  : isApproved
                  ? "bg-gradient-to-tr from-emerald-100 to-teal-100"
                  : "bg-gradient-to-tr from-[#E9E7FF]/90 to-[#F1EFFF]/80"
              }`}
              aria-hidden="true"
            />

            {/* Doodle rays above mascot head */}
            <div className="absolute -top-2 left-1/2 -translate-x-6 z-0 opacity-80" aria-hidden="true">
              <svg width="36" height="22" viewBox="0 0 40 24" fill="none">
                <path d="M6 18L14 8" stroke={isRejected ? "#E11D48" : "#4F46E5"} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M20 16V4" stroke={isRejected ? "#E11D48" : "#4F46E5"} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M34 18L26 8" stroke={isRejected ? "#E11D48" : "#4F46E5"} strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Mascot Image */}
            <div className="relative z-10 flex items-center justify-center">
              <img
                src="/mascot.png"
                alt="Solvers 3D Student Character"
                className={`w-auto h-44 sm:h-52 md:h-60 object-contain select-none transition-all duration-300 ${
                  isRejected ? "filter grayscale-[25%]" : "hover:scale-[1.02]"
                }`}
                loading="eager"
                width={280}
                height={320}
              />
            </div>

            {/* Floating state badge below mascot */}
            <div
              className={`relative mt-2 z-20 px-3 py-1 rounded-full border shadow-xs select-none flex items-center gap-1.5 transition-all ${
                isRejected
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : isApproved
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white/95 border-[#E2E6F5] text-[#4F46E5]"
              }`}
            >
              {isRejected ? (
                <>
                  <AlertCircle className="size-3.5 text-rose-600 shrink-0" />
                  <span className="text-[11px] font-bold tracking-tight">Access Request Denied</span>
                </>
              ) : isApproved ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-bold tracking-tight">Approved &amp; Ready</span>
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span className="text-[11px] font-bold tracking-tight">Waiting for Admin Response</span>
                </>
              )}
            </div>
          </div>

          {/* Bottom Security Highlights */}
          <div className="relative z-10 pt-3 hidden sm:flex items-center justify-between gap-2 border-t border-[#E2E6F5]/80 text-[10px] font-semibold text-[#647096]">
            <div className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-[#4F46E5]" />
              <span>Real-time Sync</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock3 className="size-3.5 text-amber-500" />
              <span>Faculty Moderation</span>
            </div>
            <div className="flex items-center gap-1">
              <GitBranch className="size-3.5 text-emerald-600" />
              <span>GitHub Verified</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Live Status Details, Guidance & Action Area                  */}
        {/* ========================================================================= */}
        <section className="w-full md:w-[52%] lg:w-[54%] p-5 sm:p-7 md:p-8 flex flex-col justify-between bg-white">
          <div className="space-y-5">
            {/* Student Profile Identity Card */}
            {user && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FD] border border-[#E2E6F5]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={user.avatarUrl}
                    name={user.displayName || user.githubLogin}
                    className="size-9 rounded-full ring-2 ring-[#4F46E5]/20 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#151936] truncate">
                      {user.displayName || user.githubLogin}
                    </p>
                    <p className="text-[11px] font-mono text-[#647096] truncate">
                      @{user.githubLogin}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide shrink-0 ${
                    isRejected
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : isApproved
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isRejected ? "bg-rose-500" : isApproved ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  {currentState}
                </span>
              </div>
            )}

            {/* ================================================================= */}
            {/* STATE 1: PENDING (Waiting for Faculty Verification)                */}
            {/* ================================================================= */}
            {isPending && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <Clock3 className="size-4 text-amber-600 animate-pulse" />
                    <span>Verification Request Submitted</span>
                  </div>

                  <h1 className="mt-2 text-lg sm:text-xl font-black text-[#151936] tracking-tight leading-snug">
                    Request Sent — Awaiting Faculty Approval
                  </h1>

                  <p className="mt-2 text-xs sm:text-[13px] text-[#475569] leading-relaxed">
                    Your student enrollment request has been delivered to the course professor's review queue.
                    <span className="font-semibold text-[#151936]"> Upon approval</span>, your account will be activated immediately and your student practice dashboard will unlock automatically.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-amber-200/60 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span>Real-time verification listener active — no manual page refresh required.</span>
                  </div>
                </div>

                {/* Queue details breakdown */}
                <div className="rounded-xl border border-[#E2E6F5] bg-[#FAFAFF] p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1.5 text-[#647096]">
                      <GitBranch className="size-3.5 text-[#4F46E5]" /> Target Batch
                    </span>
                    <span className="font-semibold text-[#151936]">DSA Batch 2027</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#E2E6F5]/60 pt-2 text-muted">
                    <span className="flex items-center gap-1.5 text-[#647096]">
                      <Send className="size-3.5 text-amber-600" /> Queue Status
                    </span>
                    <span className="font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                      Pending Faculty Review
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#E2E6F5]/60 pt-2 text-muted">
                    <span className="flex items-center gap-1.5 text-[#647096]">
                      <RefreshCw className={`size-3.5 text-[#4F46E5] ${checking ? "animate-spin" : ""}`} /> Auto-Sync
                    </span>
                    <span className="text-[11px] text-[#647096]">
                      {lastSynced ? `Last synchronized: ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "Synchronizing live every 5s"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* STATE 2: REJECTED (With Countdown and Reapplication Timer)         */}
            {/* ================================================================= */}
            {isRejected && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700">
                    <AlertCircle className="size-4 text-rose-600" />
                    <span>Application Status</span>
                  </div>

                  <h1 className="mt-2 text-lg sm:text-xl font-black text-[#151936] tracking-tight leading-snug">
                    Access Request Declined
                  </h1>

                  <p className="mt-2 text-xs sm:text-[13px] text-[#475569] leading-relaxed">
                    Your access request could not be approved by the faculty administration at this time.
                    In accordance with course security policies, reapplication is locked until the server cooldown timer expires.
                  </p>
                </div>

                {/* Cooldown Timer Box with live countdown */}
                <div className="rounded-xl border border-rose-200/90 bg-rose-50/50 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-800 mb-2">
                    <Timer className="size-4 text-rose-600" />
                    <span>Reapplication Cooldown Active</span>
                  </div>

                  {countdown && !countdown.isExpired ? (
                    <div>
                      {/* Live Ticking HH:MM:SS Countdown Display */}
                      <div className="flex items-center justify-center gap-2 my-2 font-mono">
                        <div className="bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 shadow-xs">
                          <span className="text-lg font-black text-rose-700">{countdown.hours}</span>
                          <span className="block text-[9px] text-[#647096] uppercase font-sans font-bold">Hours</span>
                        </div>
                        <span className="text-rose-400 font-bold text-lg">:</span>
                        <div className="bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 shadow-xs">
                          <span className="text-lg font-black text-rose-700">{countdown.minutes}</span>
                          <span className="block text-[9px] text-[#647096] uppercase font-sans font-bold">Mins</span>
                        </div>
                        <span className="text-rose-400 font-bold text-lg">:</span>
                        <div className="bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 shadow-xs">
                          <span className="text-lg font-black text-rose-700">{countdown.seconds}</span>
                          <span className="block text-[9px] text-[#647096] uppercase font-sans font-bold">Secs</span>
                        </div>
                      </div>

                      <p className="mt-2 text-[11px] text-rose-800">
                        You may submit a new access request in <strong>{countdown.formatted}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="py-1">
                      <p className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        Cooldown complete. You are now eligible to reapply.
                      </p>
                    </div>
                  )}
                </div>

                {/* Reapply Button when restriction expired */}
                {(!countdown || countdown.isExpired) && (
                  <Button
                    loading={submitting}
                    onClick={handleReapply}
                    className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA] font-bold text-xs py-2.5 shadow-md shadow-[#4F46E5]/20"
                  >
                    <Send className="size-3.5" /> Submit New Verification Request
                  </Button>
                )}
              </div>
            )}

            {/* ================================================================= */}
            {/* STATE 3: APPROVED (Success Transition)                            */}
            {/* ================================================================= */}
            {isApproved && (
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 text-center">
                <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200 mb-3">
                  <CheckCircle2 className="size-6" />
                </div>
                <h1 className="text-xl font-black text-[#151936]">
                  Access Approved! 🎉
                </h1>
                <p className="mt-1 text-xs text-[#647096]">
                  Your student credentials have been confirmed. Initializing student dashboard…
                </p>
                <Button
                  onClick={() => navigate("/app/dashboard", { replace: true })}
                  className="mt-4 w-full bg-[#16A765] text-white hover:bg-[#138e55] font-bold text-xs py-2.5"
                >
                  Open Student Dashboard <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
                {error}
              </p>
            )}
          </div>

          {/* Action Bar at Bottom */}
          <div className="pt-5 mt-4 border-t border-[#E2E6F5] space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                loading={checking}
                onClick={() => syncStatus(true)}
                className="flex-1 text-xs font-bold bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm"
              >
                <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} /> Check Verification Status
              </Button>

              <Button
                tone="secondary"
                onClick={handleSignOut}
                className="text-xs border-[#E2E6F5] text-[#647096] hover:bg-[#F8F8FF]"
              >
                <LogOut className="size-3.5" /> Sign Out / Switch Account
              </Button>
            </div>

            {/* Quick Admin Faculty Link */}
            <div className="flex items-center justify-between text-[11px] text-[#647096] bg-[#F8F9FD] p-2.5 rounded-lg border border-[#E2E6F5]/80">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-amber-500" />
                Are you a Course Professor?
              </span>
              <Link
                to="/admin-login"
                className="font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
              >
                Admin Login <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
