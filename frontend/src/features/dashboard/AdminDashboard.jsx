import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Code2,
  FileCode2,
  Flame,
  GitPullRequest,
  Hourglass,
  Inbox,
  LayoutDashboard,
  Plus,
  ScanSearch,
  Server,
  Sparkles,
  Target,
  Trophy,
  Users,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import {
  getAdminOverview,
  getReviewQueue,
  getStudents,
  getAdminAssignments,
  getLeaderboard,
  getProblems,
  getTrackingPolicy,
  updateTrackingPolicy,
} from "../../services/api.js";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";
import { VerificationBadge, Badge } from "../../components/ui/Badge.jsx";
import { formatDate } from "../../lib/format.js";
import { useAuth } from "../../hooks/useAuth.js";

const ActivityChart = lazy(() =>
  import("../../components/data-display/ActivityChart.jsx").then((m) => ({
    default: m.ActivityChart,
  }))
);

export function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [problems, setProblems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [policy, setPolicy] = useState({ dailyMinimum: 1, saving: false, message: "" });
  const [leaderboardTab, setLeaderboardTab] = useState("global");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const adminName = user?.displayName || user?.name || "Professor";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [ovRes, revRes, stuRes, asgRes, probRes, lbRes, polRes] = await Promise.all([
          getAdminOverview().catch(() => ({ data: null })),
          getReviewQueue().catch(() => ({ data: [] })),
          getStudents().catch(() => ({ data: [] })),
          getAdminAssignments().catch(() => ({ data: [] })),
          getProblems().catch(() => ({ data: [] })),
          getLeaderboard().catch(() => ({ data: { entries: [] } })),
          getTrackingPolicy().catch(() => ({ data: { dailyMinimum: 1 } })),
        ]);

        if (!active) return;

        setOverview(ovRes.data);
        setReviewQueue(revRes.data || []);
        setStudents(stuRes.data || []);
        setAssignments(asgRes.data || []);
        setProblems(probRes.data || []);
        setLeaderboard(lbRes.data?.entries || []);
        if (polRes?.data) {
          setPolicy((p) => ({ ...p, dailyMinimum: polRes.data.dailyMinimum ?? 1 }));
        }
        setError(null);
      } catch (err) {
        if (active) setError(err.message || "Failed to load dashboard data");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && !overview) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState label="Loading admin dashboard…" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="py-8">
        <ErrorState body={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Calculated stats based on real data
  const pendingReviews = overview?.needsReview ?? reviewQueue.length;
  const activeStudents = overview?.totalStudents ?? students.length;
  const assignedProblems = overview?.activeAssignments ?? assignments.length;
  const verifiedSubmissions = overview?.verifiedWeek ?? 0;
  const pendingRequests = overview?.pendingRequests ?? 0;

  // Filtered review queue items
  const displayedReviews = reviewQueue
    .filter((item) => {
      if (reviewFilter === "all") return true;
      if (reviewFilter === "flagged") return item.outcome === "NEEDS_REVIEW";
      if (reviewFilter === "failed") return item.outcome === "CHECK_FAILED";
      return true;
    })
  // In-page search calculations
  const cleanQ = searchQuery.trim().toLowerCase();
  const searchResults = cleanQ
    ? {
        students: students.filter((s) => (s.displayName || s.name || s.githubLogin || "").toLowerCase().includes(cleanQ)).slice(0, 4),
        problems: problems.filter((p) => (p.title || p.topic || p.problemCode || "").toLowerCase().includes(cleanQ)).slice(0, 4),
        reviews: reviewQueue.filter((r) => (r.studentName || r.assignmentTitle || r.problemTitle || "").toLowerCase().includes(cleanQ)).slice(0, 4),
      }
    : null;
  const hasSearchResults = searchResults && (searchResults.students.length > 0 || searchResults.problems.length > 0 || searchResults.reviews.length > 0);

  return (
    <div className="flex flex-col gap-6 font-sans antialiased text-[#151936]">
      {/* ============================================================== */}
      {/* 1. TOP WELCOME BANNER & STATS ROW (MOBILE-OPTIMIZED)           */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white bg-[url('/background.png')] bg-cover bg-center border border-[#E2E6F5] p-4 sm:p-6 lg:p-8 shadow-xs">
        {/* Soft background light blooms and text contrast overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent pointer-events-none" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 -left-24 size-80 rounded-full bg-[#E9E7FF]/60 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 right-1/4 size-96 rounded-full bg-[#E0E7FF]/40 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 z-10">
          {/* Left Text Column */}
          <div className="flex-1 max-w-xl">
            <h1 className="text-xl sm:text-3xl lg:text-[34px] font-black tracking-tight text-[#151936] flex items-center gap-1.5 sm:gap-2">
              <span>Welcome back, {adminName}!</span>
              <span className="inline-block animate-wave origin-bottom-right">👋</span>
            </h1>

            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#647096] italic">
              "Consistency today, stronger tomorrow."
            </p>

            <div className="mt-3 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-white/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-[#151936] border border-[#E2E6F5] shadow-2xs">
                <span className="size-2 rounded-full bg-[#4F46E5]" />
                Admin Overview
              </span>
              <span className="text-[11px] sm:text-xs text-[#647096] hidden sm:inline">
                Review submissions, manage assignments, and track student progress.
              </span>
            </div>
          </div>

          {/* Center Mascot Artwork (Responsive on mobile) */}
          <div className="relative flex items-center justify-center lg:w-[320px] h-[120px] sm:h-[180px] lg:h-[190px] shrink-0 my-1 lg:my-0">
            {/* Playful curved quote beside character matching reference */}
            <span
              className="hidden xl:block absolute -left-6 top-3 text-xs font-bold text-[#4F46E5] -rotate-12 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs border border-[#4F46E5]/20 select-none pointer-events-none"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Same Effort, Higher Future!
            </span>

            <img
              src="/mascot.png"
              alt="Solvers 3D Student Character"
              className="h-[120px] sm:h-[180px] lg:h-[210px] object-contain filter drop-shadow-md select-none pointer-events-none z-10"
            />

            {/* Desk books detail matching reference image */}
            <div className="hidden lg:flex flex-col items-center justify-end h-24 -ml-4 z-0 opacity-90 select-none pointer-events-none" aria-hidden="true">
              <div className="w-16 h-3.5 bg-[#4F46E5] text-[7px] text-white font-mono font-bold flex items-center justify-center rounded-xs shadow-xs">
                DSA
              </div>
              <div className="w-18 h-3.5 bg-[#151936] text-[7px] text-white font-mono font-bold flex items-center justify-center rounded-xs shadow-xs mt-0.5">
                Algorithms
              </div>
              <div className="w-20 h-4 bg-[#DC4545] text-[7px] text-white font-mono font-bold flex items-center justify-center rounded-xs shadow-xs mt-0.5">
                Problem Solving
              </div>
            </div>
          </div>

          {/* Right Floating Quick Status Widgets */}
          <div className="flex flex-row lg:flex-col gap-2.5 sm:gap-3 lg:w-[250px] shrink-0">
            {/* Widget 1: Pending Access Requests */}
            <Link
              to="/admin/requests"
              className="flex-1 flex items-center justify-between gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/95 p-2.5 sm:p-3.5 border border-[#E2E6F5] shadow-xs hover:border-[#4F46E5]/40 transition group"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Flame className="size-4 sm:size-5 fill-amber-500 text-amber-500" />
                </div>
                <div className="min-w-0 leading-tight">
                  <span className="text-base sm:text-lg font-black text-[#151936]">{pendingRequests}</span>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#647096] truncate">Access Requests</p>
                </div>
              </div>
              <ChevronRight className="size-3.5 sm:size-4 text-[#8F9BB3] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition" />
            </Link>

            {/* Widget 2: Motivational Motto Tag */}
            <div className="flex-1 flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-white/95 p-2.5 sm:p-3.5 border border-[#E2E6F5] shadow-xs">
              <div className="flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <Target className="size-4 sm:size-5 text-purple-600" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-[11px] sm:text-xs font-bold text-[#151936] truncate">"Solve. Submit. Grow."</p>
                <p className="text-[9px] sm:text-[10px] text-[#647096] truncate mt-0.5">Empowering engineers! 🚀</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FOUR KPI CARDS (MATCHING REFERENCE EXACT SHAPE & COLORS)    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Pending Reviews */}
        <Link
          to="/admin/review"
          className="group flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4.5 border border-[#E2E6F5] shadow-xs hover:border-[#4F46E5]/50 hover:shadow-sm transition"
        >
          <div className="flex size-9 sm:size-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#E9E7FF] text-[#4F46E5] border border-[#E0E7FF]">
            <ScanSearch className="size-4.5 sm:size-6" />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-2xl font-black text-[#151936]">{pendingReviews}</span>
            <p className="text-xs font-semibold text-[#647096] mt-0.5">Pending Reviews</p>
            <span className="inline-block text-[10px] font-bold text-amber-600 mt-1">
              Requires attention
            </span>
          </div>
        </Link>

        {/* KPI 2: Active Students */}
        <Link
          to="/admin/students"
          className="group flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4.5 border border-[#E2E6F5] shadow-xs hover:border-[#4F46E5]/50 hover:shadow-sm transition"
        >
          <div className="flex size-9 sm:size-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#E9E7FF] text-[#4F46E5] border border-[#E0E7FF]">
            <Users className="size-4.5 sm:size-6" />
          </div>
          <div className="min-w-0 leading-tight w-full flex-1">
            <span className="text-xl sm:text-2xl font-black text-[#151936]">{activeStudents}</span>
            <p className="text-[11px] sm:text-xs font-semibold text-[#647096] mt-0.5 truncate">Active Students</p>
            {/* Progress bar visual matching reference */}
            <div className="w-full bg-[#E2E6F5] h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#4F46E5] h-full rounded-full" style={{ width: "85%" }} />
            </div>
          </div>
        </Link>

        {/* KPI 3: Problems Assigned */}
        <Link
          to="/admin/problems"
          className="group flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4.5 border border-[#E2E6F5] shadow-xs hover:border-[#4F46E5]/50 hover:shadow-sm transition"
        >
          <div className="flex size-9 sm:size-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#E9E7FF] text-[#4F46E5] border border-[#E0E7FF]">
            <BookOpenCheck className="size-4.5 sm:size-6" />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-xl sm:text-2xl font-black text-[#151936]">{assignedProblems}</span>
            <p className="text-[11px] sm:text-xs font-semibold text-[#647096] mt-0.5 truncate">Problems Assigned</p>
            <span className="inline-block text-[9px] sm:text-[10px] font-bold text-[#16A765] mt-1">
              ↑ Active catalog
            </span>
          </div>
        </Link>

        {/* KPI 4: Verified Submissions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl bg-white p-3 sm:p-4.5 border border-[#E2E6F5] shadow-xs">
          <div className="flex size-9 sm:size-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-[#E9E7FF] text-[#4F46E5] border border-[#E0E7FF]">
            <CheckCircle2 className="size-4.5 sm:size-6 text-[#16A765]" />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-xl sm:text-2xl font-black text-[#151936]">{verifiedSubmissions}</span>
            <p className="text-[11px] sm:text-xs font-semibold text-[#647096] mt-0.5 truncate">Verified Submissions</p>
            <span className="inline-block text-[9px] sm:text-[10px] font-bold text-[#16A765] mt-1">
              + {verifiedSubmissions} this week
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* IN-PAGE ADMIN SEARCH TOOLBAR (NOT ON TOPBAR, IN ADMIN BODY)    */}
      {/* ============================================================== */}
      <div className="relative rounded-2xl bg-white p-3.5 sm:p-4 border border-[#E2E6F5] shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F9BB3] pointer-events-none">
              <Search className="size-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students, problems, or review queue..."
              className="w-full rounded-xl border border-[#E2E6F5] bg-[#F8F8FF] py-2.5 pl-10 pr-9 text-xs sm:text-sm text-[#151936] placeholder-[#8F9BB3] focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 shadow-2xs transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9BB3] hover:text-[#151936] p-1 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#647096] px-1 shrink-0">
            <span className="hidden sm:inline font-medium text-[11px]">Direct links:</span>
            <Link
              to="/admin/students"
              className="rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary px-2.5 py-1 text-xs font-semibold text-[#151936] transition"
            >
              Students ({students.length})
            </Link>
            <Link
              to="/admin/problems"
              className="rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary px-2.5 py-1 text-xs font-semibold text-[#151936] transition"
            >
              Problems ({problems.length})
            </Link>
            <Link
              to="/admin/review"
              className="rounded-lg bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 transition"
            >
              Reviews ({reviewQueue.length})
            </Link>
          </div>
        </div>

        {/* Live Search Instant Results Box */}
        {cleanQ && (
          <div className="mt-3 pt-3 border-t border-[#E2E6F5]">
            {!hasSearchResults ? (
              <p className="py-2 text-center text-xs text-[#647096]">
                No students, problems, or submissions matched <strong className="text-[#151936]">"{searchQuery}"</strong>.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Matched Students */}
                {searchResults.students.length > 0 && (
                  <div className="rounded-xl bg-[#F8F8FF] p-2.5 border border-[#E2E6F5]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#647096] mb-1.5 block">
                      Students ({searchResults.students.length})
                    </span>
                    <div className="flex flex-col gap-1">
                      {searchResults.students.map((s) => (
                        <Link
                          key={s.id}
                          to={`/admin/students/${s.id}`}
                          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white text-xs text-[#151936] font-semibold transition"
                        >
                          <Avatar src={s.avatarUrl} name={s.displayName || s.githubLogin} className="size-5 rounded-full" />
                          <span className="truncate">{s.displayName || s.githubLogin}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Problems */}
                {searchResults.problems.length > 0 && (
                  <div className="rounded-xl bg-[#F8F8FF] p-2.5 border border-[#E2E6F5]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#647096] mb-1.5 block">
                      Problems ({searchResults.problems.length})
                    </span>
                    <div className="flex flex-col gap-1">
                      {searchResults.problems.map((p) => (
                        <Link
                          key={p.id}
                          to="/admin/problems"
                          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white text-xs text-[#151936] font-semibold transition truncate"
                        >
                          <Code2 className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">{p.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Review Queue */}
                {searchResults.reviews.length > 0 && (
                  <div className="rounded-xl bg-[#F8F8FF] p-2.5 border border-[#E2E6F5]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#647096] mb-1.5 block">
                      Review Submissions ({searchResults.reviews.length})
                    </span>
                    <div className="flex flex-col gap-1">
                      {searchResults.reviews.map((r) => (
                        <Link
                          key={r.id}
                          to="/admin/review"
                          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white text-xs text-[#151936] font-semibold transition truncate"
                        >
                          <GitPullRequest className="size-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{r.studentName} — {r.assignmentTitle || r.problemTitle}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. MIDDLE THREE-PANEL ROW (MATCHING REFERENCE EXACT 3-PANEL)   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Panel 1 (Left): Class Progress & Target (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Class Progress</h2>
            <Link
              to="/admin/leaderboard"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {/* Donut progress visual matching backend stats */}
          {(() => {
            const totalWork = (verifiedSubmissions || 0) + (pendingReviews || 0) + (assignedProblems || 0);
            const pct = totalWork > 0 ? Math.round(((verifiedSubmissions || 0) / totalWork) * 100) : 0;
            return (
              <div className="flex items-center gap-5 my-auto py-2">
                <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#4F46E5] via-[#818CF8] to-[#C7D2FE] p-2.5 shadow-inner">
                  <div className="flex size-full items-center justify-center rounded-full bg-white flex-col leading-none">
                    <span className="text-xl font-black text-[#151936]">{pct}%</span>
                    <span className="text-[9px] text-[#647096] mt-0.5">verified</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#151936] font-medium">
                      <span className="size-2 rounded-full bg-[#16A765]" />
                      Verified
                    </span>
                    <span className="font-bold text-[#151936]">{verifiedSubmissions}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#151936] font-medium">
                      <span className="size-2 rounded-full bg-[#F59E0B]" />
                      Needs Review
                    </span>
                    <span className="font-bold text-[#151936]">{pendingReviews}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-[#151936] font-medium">
                      <span className="size-2 rounded-full bg-[#4F46E5]" />
                      In Progress
                    </span>
                    <span className="font-bold text-[#151936]">{assignedProblems}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Tracking Policy Target inline tool */}
          <div className="mt-4 pt-4 border-t border-[#E2E6F5] flex items-center justify-between gap-3">
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-bold text-[#151936]">Daily Student Target</p>
              <p className="text-[10px] text-[#647096]">Min verified problems / day</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="50"
                value={policy.dailyMinimum}
                onChange={(e) => setPolicy((p) => ({ ...p, dailyMinimum: Number(e.target.value) }))}
                className="w-14 rounded-lg border border-[#E2E6F5] px-2 py-1 text-center text-xs font-bold text-[#151936]"
              />
              <button
                type="button"
                disabled={policy.saving}
                onClick={async () => {
                  setPolicy((p) => ({ ...p, saving: true, message: "" }));
                  try {
                    await updateTrackingPolicy(policy.dailyMinimum);
                    setPolicy((p) => ({ ...p, saving: false, message: "Saved" }));
                    setTimeout(() => setPolicy((p) => ({ ...p, message: "" })), 2000);
                  } catch (err) {
                    setPolicy((p) => ({ ...p, saving: false, message: err.message }));
                  }
                }}
                className="rounded-lg bg-[#4F46E5] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#4338CA] transition cursor-pointer"
              >
                {policy.saving ? "..." : policy.message || "Set"}
              </button>
            </div>
          </div>
        </div>

        {/* Panel 2 (Center): Submission Review Queue (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Review Queue</h2>
            <Link
              to="/admin/review"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {displayedReviews.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#647096]">
              <CheckCircle2 className="size-8 text-[#16A765] mb-2" />
              <p className="text-xs font-bold text-[#151936]">All caught up!</p>
              <p className="text-[11px] text-[#647096]">No submissions currently flagged for review.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 flex-1">
              {displayedReviews.map((item) => {
                const isApproved = item.outcome === "VERIFIED";
                const isRejected = item.outcome === "CHECK_FAILED";
                const studentName = item.studentName || item.studentLogin || "Student";
                const problemTitle = item.problemTitle || item.assignmentTitle || "Code submission";

                return (
                  <li key={item.id}>
                    <Link
                      to={`/admin/review/${item.id}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-[#E2E6F5] p-2.5 hover:border-[#4F46E5]/40 hover:bg-[#F8F9FF] transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-[#E9E7FF] text-[#4F46E5]">
                          <FileCode2 className="size-4" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="truncate text-xs font-bold text-[#151936] group-hover:text-[#4F46E5] transition">
                            {problemTitle}
                          </p>
                          <p className="truncate text-[10px] text-[#647096]">
                            {studentName} · {formatDate(item.observedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isApproved
                              ? "bg-emerald-50 text-[#16A765] border border-emerald-200"
                              : isRejected
                              ? "bg-rose-50 text-[#DC4545] border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isApproved ? "Accepted" : isRejected ? "Wrong Answer" : "Needs Review"}
                        </span>
                        <ChevronRight className="size-3 text-[#8F9BB3]" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Panel 3 (Right): Assignments & Deadlines (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Assignments</h2>
            <Link
              to="/admin/problems"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {assignments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#647096]">
              <BookOpenCheck className="size-8 text-[#4F46E5] mb-2" />
              <p className="text-xs font-bold text-[#151936]">No active assignments</p>
              <p className="text-[11px] text-[#647096]">Create an assignment from the problems panel.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 flex-1">
              {assignments.slice(0, 4).map((asg) => (
                <li key={asg.id}>
                  <Link
                    to="/admin/problems"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E6F5] p-2.5 hover:border-[#4F46E5]/40 hover:bg-[#F8F9FF] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                        <BookOpenCheck className="size-4" />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-xs font-bold text-[#151936]">{asg.title}</p>
                        <p className="truncate text-[10px] text-[#647096] flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" /> Due: {formatDate(asg.dueAt)}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5] border border-blue-200 shrink-0">
                      Active
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. BOTTOM ROW: LEADERBOARD + PROBLEMS + WEEKLY ACTIVITY        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Leaderboard Card (4 cols on lg) */}
        <div className="lg:col-span-4 rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Leaderboard</h2>
            {/* Pill tabs matching reference */}
            <div className="flex items-center rounded-xl bg-[#F0F2FD] p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLeaderboardTab("global")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  leaderboardTab === "global" ? "bg-[#4F46E5] text-white shadow-2xs" : "text-[#647096]"
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setLeaderboardTab("month")}
                className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                  leaderboardTab === "month" ? "bg-[#4F46E5] text-white shadow-2xs" : "text-[#647096]"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#647096]">
              <Trophy className="size-7 text-amber-500 mb-1" />
              <p className="text-xs">No leaderboard ranks available yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {leaderboard.slice(0, 5).map((entry, index) => {
                const medal =
                  index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${entry.rank || index + 1}`;

                return (
                  <div
                    key={entry.studentId || index}
                    className="flex items-center justify-between gap-3 rounded-xl p-2 hover:bg-[#F8F9FF] transition border border-transparent hover:border-[#E2E6F5]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-center text-xs font-bold text-[#647096]">{medal}</span>
                      <Avatar
                        src={entry.avatarUrl}
                        name={entry.displayName || entry.studentId}
                        className="size-7 shrink-0 rounded-full border border-[#E2E6F5] object-cover"
                      />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-xs font-bold text-[#151936]">
                          {entry.displayName || entry.studentId}
                        </p>
                        <p className="text-[10px] text-[#647096]">{entry.verifiedProblems || 0} solved</p>
                      </div>
                    </div>

                    <div className="text-right leading-tight shrink-0">
                      <span className="text-xs font-black text-[#4F46E5]">{entry.score || 0}</span>
                      <p className="text-[9px] text-[#647096]">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Center Column: Problem Bank Catalog (5 cols on lg) */}
        <div className="lg:col-span-5 rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Problem Bank</h2>
            <Link
              to="/admin/problems"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {problems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#647096]">
              <Code2 className="size-7 text-[#4F46E5] mb-1" />
              <p className="text-xs">No problems published yet.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 flex-1">
              {problems.slice(0, 3).map((prob) => {
                const difficultyColor =
                  prob.difficulty === "Easy"
                    ? "bg-emerald-50 text-[#16A765] border-emerald-200"
                    : prob.difficulty === "Medium"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-[#DC4545] border-rose-200";

                return (
                  <li key={prob.id}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E6F5] p-3 hover:border-[#4F46E5]/40 hover:bg-[#F8F9FF] transition">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#151936] truncate">{prob.title}</p>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${difficultyColor}`}
                          >
                            {prob.difficulty || "Easy"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647096] truncate mt-1">
                          {prob.statement || "Algorithm problem statement..."}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="rounded-md bg-[#F0F2FD] px-2 py-0.5 text-[9px] font-medium text-[#647096]">
                            {prob.topic || "Algorithm"}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/admin/problems`}
                        className="rounded-xl bg-[#4F46E5] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#4338CA] transition shrink-0 shadow-2xs"
                      >
                        Manage
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right Column: Weekly Activity & Quick Actions (3 cols on lg) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Weekly Activity mini chart card */}
          <div className="rounded-2xl bg-white p-4.5 border border-[#E2E6F5] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-[#151936]">Weekly Activity</h2>
              <span className="text-[10px] font-bold text-[#16A765]">
                {verifiedSubmissions} Verified
              </span>
            </div>

            {/* Micro bar chart representation based on real activity series */}
            {(() => {
              const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const series = overview?.activitySeries || [];
              const maxVal = Math.max(1, ...series.map((s) => s.verified || 0));
              
              return (
                <div className="h-28 flex items-end justify-between gap-1.5 pt-4">
                  {daysOfWeek.map((day, idx) => {
                    const matched = series[idx];
                    const count = matched?.verified ?? 0;
                    const h = count > 0 ? Math.max(15, (count / maxVal) * 100) : 6;
                    const isHighlight = count > 0;

                    return (
                      <div key={day} className="flex flex-col items-center gap-1 flex-1 h-full justify-end" title={`${day}: ${count} verified`}>
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            isHighlight ? "bg-[#34D399]" : "bg-[#E2E6F5]"
                          }`}
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[9px] text-[#8F9BB3] font-medium">{day}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Quick Actions Card matching reference */}
          <div className="rounded-2xl bg-white p-4.5 border border-[#E2E6F5] shadow-xs flex flex-col gap-2.5">
            <h2 className="text-xs font-bold text-[#151936]">Quick Actions</h2>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/admin/problems/new"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E2E6F5] bg-[#F8F9FF] hover:border-[#4F46E5]/40 hover:bg-white text-center transition group"
              >
                <Plus className="size-4 text-[#4F46E5] mb-1 group-hover:scale-110 transition" />
                <span className="text-[10px] font-bold text-[#151936]">New Problem</span>
              </Link>

              <Link
                to="/admin/requests"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E2E6F5] bg-[#F8F9FF] hover:border-[#4F46E5]/40 hover:bg-white text-center transition group"
              >
                <Inbox className="size-4 text-[#4F46E5] mb-1 group-hover:scale-110 transition" />
                <span className="text-[10px] font-bold text-[#151936]">Requests</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
