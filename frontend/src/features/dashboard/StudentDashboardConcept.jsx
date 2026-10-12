import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FileCode2,
  Flame,
  GitPullRequest,
  Sparkles,
  Target,
  Trophy,
  Check,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  getLeaderboard,
  getStudentAssignments,
  getStudentOverview,
  getStudentSubmissions,
} from "../../services/api.js";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
import { StudentDashboardSkeleton } from "./DashboardSkeleton.jsx";
import { formatDate, shortSha } from "../../lib/format.js";
import { Avatar } from "../../components/ui/Avatar.jsx";

/**
 * Calculates current streak and 7-day activity based on actual student submissions
 */
function calculateStreakAndWeeklyActivity(submissions) {
  if (!submissions || submissions.length === 0) {
    return {
      streak: 0,
      activeDaysCount: 0,
      weeklyDots: Array(7).fill(false),
    };
  }

  const activeDateSet = new Set(
    submissions
      .filter((s) => s.observedAt)
      .map((s) => new Date(s.observedAt).toISOString().slice(0, 10))
  );

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let streak = 0;
  let checkDate = new Date();

  // If today has no submission yet, start checking from yesterday so ongoing streak doesn't reset prematurely
  if (!activeDateSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    if (activeDateSet.has(dateKey)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 7 days activity dots (6 days ago to today)
  const weeklyDots = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    weeklyDots.push(activeDateSet.has(key));
  }

  return {
    streak,
    activeDaysCount: activeDateSet.size,
    weeklyDots,
  };
}

export function StudentDashboardConcept() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    overview: null,
    assignments: [],
    submissions: [],
    leaderboard: [],
    rank: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const studentId = user?.studentId;
    if (!studentId) {
      // If user profile is still hydrating or has no studentId yet
      if (user) {
        setState((c) => ({ ...c, loading: false, overview: {} }));
      }
      return;
    }

    Promise.all([
      getStudentOverview(studentId).catch(() => ({ data: {} })),
      getStudentAssignments(studentId).catch(() => ({ data: [] })),
      getStudentSubmissions(studentId).catch(() => ({ data: [] })),
      getLeaderboard().catch(() => ({ data: { entries: [] } })),
    ])
      .then(([overview, assignments, submissions, leaderboard]) => {
        if (!active) return;
        const entries = leaderboard.data?.entries || [];
        setState({
          loading: false,
          error: null,
          overview: overview.data || {},
          assignments: assignments.data || [],
          submissions: submissions.data || [],
          leaderboard: entries,
          rank: entries.find((item) => item.studentId === studentId) || null,
        });
      })
      .catch((err) => {
        if (active) setState((c) => ({ ...c, loading: false, error: err.message }));
      });
    return () => {
      active = false;
    };
  }, [user?.studentId, user, attempt]);

  // Periodic refresh
  useEffect(() => {
    const timer = window.setInterval(() => setAttempt((v) => v + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Compute live actual streak
  const streakData = useMemo(() => {
    return calculateStreakAndWeeklyActivity(state.submissions);
  }, [state.submissions]);

  // Practice topics breakdown for "Today's Progress" dynamically derived from assignments or submissions
  const topicBreakdown = useMemo(() => {
    if (!state.assignments || state.assignments.length === 0) return [];
    // Aggregate by problem topic or title
    const map = new Map();
    for (const asg of state.assignments) {
      const topic = asg.problem?.topic || asg.title || "General";
      const existing = map.get(topic) || { name: topic, solved: 0, total: 0 };
      existing.total += 1;
      if (asg.myStatus === "verified" || asg.myStatus === "VERIFIED") {
        existing.solved += 1;
      }
      map.set(topic, existing);
    }
    return Array.from(map.values()).map((t) => ({
      ...t,
      done: t.solved >= t.total && t.total > 0,
    }));
  }, [state.assignments]);

  // Topic Progress items for "Assignment Progress" purely derived from real assignments
  const topicProgress = useMemo(() => {
    if (!state.assignments || state.assignments.length === 0) return [];
    const colors = ["bg-[#4F46E5]", "bg-[#F59E0B]", "bg-[#16A765]", "bg-[#E11D48]"];
    return state.assignments.slice(0, 4).map((asg, idx) => {
      const isVerified = asg.myStatus === "verified" || asg.myStatus === "VERIFIED";
      return {
        title: asg.title || asg.problem?.title || `Assignment ${idx + 1}`,
        completed: isVerified ? 1 : 0,
        total: 1,
        color: colors[idx % colors.length],
      };
    });
  }, [state.assignments]);

  if (state.loading && !state.overview) {
    return <StudentDashboardSkeleton />;
  }

  if (state.error && !state.overview) {
    return (
      <div className="py-8">
        <ErrorState
          body={state.error}
          onRetry={() => {
            setState((c) => ({ ...c, loading: true, error: null }));
            setAttempt((v) => v + 1);
          }}
        />
      </div>
    );
  }

  const firstName = (
    state.overview?.student?.displayName ||
    user?.displayName ||
    user?.name ||
    "Student"
  ).split(" ")[0];

  const verifiedCount =
    state.overview?.verified ??
    state.submissions.filter(
      (s) => s.outcome === "VERIFIED" || s.eventType === "NEW_PROBLEM_VERIFIED"
    ).length;

  // Daily goal calculation
  const dailyGoal = 5;
  const todayKey = new Date().toISOString().slice(0, 10);
  const solvedToday = state.submissions.filter(
    (s) =>
      s.observedAt &&
      s.observedAt.slice(0, 10) === todayKey &&
      (s.outcome === "VERIFIED" || s.eventType === "NEW_PROBLEM_VERIFIED")
  ).length;
  const goalPercent = Math.min(100, Math.round((solvedToday / dailyGoal) * 100));

  const currentRankNumber = state.rank?.rank || (state.leaderboard.length > 0 ? "1" : "—");

  return (
    <div className="flex flex-col gap-5 sm:gap-6 font-sans antialiased text-[#151936] w-full max-w-[1400px] mx-auto min-w-0">
      {/* ============================================================== */}
      {/* 1. TOP WELCOME BANNER (TABLET & DESKTOP HARMONIOUS LAYOUT)      */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-white bg-[url('/background.png')] bg-cover bg-center border border-[#E2E6F5] p-5 sm:p-6 lg:p-7 shadow-xs">
        {/* Soft contrast overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left Text */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black tracking-tight text-[#151936] flex items-center gap-2">
              Welcome back,
              <span>{firstName}!</span>
              <span className="inline-block animate-wave origin-bottom-right">👋</span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-[#647096] italic">
              "Consistency today, stronger tomorrow."
            </p>

            <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#151936] border border-[#E2E6F5] shadow-2xs">
                <span className="size-2 rounded-full bg-[#4F46E5]" />
                Solvers Student Platform
              </span>
              <span className="text-xs text-[#647096] hidden sm:inline">
                Practice daily, verify on GitHub, and build competitive strength.
              </span>
            </div>
          </div>

          {/* Right Mascot with laptop matching reference & circular half-in half-out effect */}
          <div className="relative flex items-end justify-end shrink-0 h-[155px] sm:h-[185px] my-1 md:my-0 overflow-hidden sm:overflow-visible">
            {/* Circular backdrop: avatar is positioned half inside, half rising out */}
            <div
              className="absolute bottom-0 right-4 sm:right-6 size-28 sm:size-36 lg:size-40 rounded-full bg-gradient-to-tr from-[#E9E7FF] via-[#EEECFF] to-[#F5F3FF] border border-[#E0E7FF] shadow-inner z-0"
              aria-hidden="true"
            />

            <img
              src="/mascot.png"
              alt="Solvers Student Character"
              className="h-[150px] sm:h-[190px] object-contain filter drop-shadow-xl select-none pointer-events-none relative z-10 translate-y-1 sm:translate-y-0"
            />
            {/* Playful quote */}
            <span
              className="hidden lg:block absolute -left-12 top-2 text-xs font-bold text-[#4F46E5] -rotate-12 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs border border-[#4F46E5]/20 select-none pointer-events-none"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Keep Solving Keep Growing!
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FOUR KPI CARDS (ROW ON TABLET & DESKTOP, 2X2 OR 1-COL MOBILE)*/}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: Real Dynamic Streak */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 border border-[#E2E6F5] shadow-xs hover:border-amber-300 transition">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 border border-amber-100">
            <Flame className="size-5.5 fill-amber-500" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#151936]">
                {streakData.streak}
              </span>
              <span className="text-xs font-bold text-[#151936]">Day Streak</span>
            </div>
            {/* Dynamic 7-day activity dots */}
            <div className="flex items-center gap-1.5 mt-1.5" title="Last 7 days activity">
              {streakData.weeklyDots.map((isActive, idx) => (
                <span
                  key={idx}
                  className={`size-2 rounded-full transition-colors ${
                    isActive ? "bg-amber-500 ring-1 ring-amber-400" : "bg-gray-200"
                  }`}
                  title={isActive ? "Active submission" : "No commit"}
                />
              ))}
            </div>
          </div>
        </div>

        {/* KPI 2: Problems Solved */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 border border-[#E2E6F5] shadow-xs hover:border-emerald-300 transition">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16A765] border border-emerald-100">
            <CheckCircle2 className="size-5.5" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#151936]">
                {verifiedCount}
              </span>
              <span className="text-xs font-bold text-[#151936]">Problems Solved</span>
            </div>
            <p className="text-[11px] font-semibold text-[#16A765] mt-1.5 flex items-center gap-1">
              <TrendingUp className="size-3" />
              <span>↑ {verifiedCount} verified</span>
            </p>
          </div>
        </div>

        {/* KPI 3: Daily Goal */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 border border-[#E2E6F5] shadow-xs hover:border-purple-300 transition">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Target className="size-5.5" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#151936]">
                {solvedToday}/{dailyGoal}
              </span>
              <span className="text-xs font-bold text-[#151936]">Daily Goal</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#E2E6F5] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Practice Submissions */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 border border-[#E2E6F5] shadow-xs hover:border-blue-300 transition">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4F46E5] border border-indigo-100">
            <Clock className="size-5.5" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-[#151936]">
                {state.submissions.length}
              </span>
              <span className="text-xs font-bold text-[#151936]">Submissions Logged</span>
            </div>
            <p className="text-[11px] font-semibold text-[#4F46E5] mt-1.5 flex items-center gap-1">
              <Sparkles className="size-3" />
              <span>GitHub tracked</span>
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MIDDLE 2-COLUMN ROW: TODAY'S PROGRESS + GLOBAL RANK          */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
        {/* Card 1: Today's Progress */}
        <div className="rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Today's Progress</h2>
            <span className="text-xs font-semibold text-[#647096]">
              {solvedToday} / {dailyGoal} problems
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto py-2">
            {/* Donut progress visual */}
            <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#4F46E5] via-[#818CF8] to-[#C7D2FE] p-2.5 shadow-inner">
              <div className="flex size-full items-center justify-center rounded-full bg-white flex-col leading-none">
                <span className="text-2xl font-black text-[#151936]">{goalPercent}%</span>
                <span className="text-[9px] font-semibold text-[#647096] mt-0.5">completed</span>
              </div>
            </div>

            {/* Checklist items */}
            {topicBreakdown.length === 0 ? (
              <div className="flex-1 text-center py-2 text-xs text-[#647096]">
                <p className="font-semibold text-[#151936]">No topic targets yet</p>
                <p className="text-[10px] mt-0.5">Solve assigned problems to track topic progress.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
                {topicBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                        item.done
                          ? "bg-[#16A765] text-white"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span className="text-[#151936] font-medium truncate">
                      {item.name} ({item.solved}/{item.total})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Global Rank Card */}
        <div className="rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[#151936]">Global Rank</h2>
            <Link
              to="/app/leaderboard"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              Leaderboard <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4 my-auto py-2">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-[#151936] tracking-tight">
                #{currentRankNumber}
              </span>
              <p className="text-[11px] font-semibold text-[#16A765] mt-1.5 flex items-center gap-1">
                <TrendingUp className="size-3" />
                <span>Active contender</span>
              </p>
            </div>

            {/* Micro bar chart representation */}
            <div className="flex items-end gap-1.5 h-16 w-32 sm:w-40 justify-end">
              {[35, 55, 40, 75, 60, 90, 85].map((height, i) => (
                <div
                  key={i}
                  className={`w-3 sm:w-3.5 rounded-t-md transition-all ${
                    i >= 5 ? "bg-[#4F46E5]" : "bg-[#E2E6F5]"
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. BOTTOM 2-COLUMN ROW: RECENT SUBMISSIONS + ASSIGNMENT PROGRESS */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
        {/* Left: Recent Submissions */}
        <div className="rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Recent Submissions</h2>
            <Link
              to="/app/activity"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {state.submissions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#647096]">
              <GitPullRequest className="size-8 text-[#8F9BB3] mb-2" />
              <p className="text-xs font-semibold text-[#151936]">No submissions recorded yet.</p>
              <p className="text-[11px] text-[#647096] mt-0.5">
                Commit your code on GitHub to verify your solutions.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5 flex-1">
              {state.submissions.slice(0, 4).map((sub) => {
                const isVerified =
                  sub.outcome === "VERIFIED" || sub.eventType === "NEW_PROBLEM_VERIFIED";
                const title =
                  sub.problemTitle ||
                  sub.path?.split("/").pop()?.replace(/\.[^/.]+$/, "") ||
                  "Algorithm solution";

                return (
                  <li key={sub.id}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E6F5] p-3 hover:border-[#4F46E5]/40 hover:bg-[#F8F9FF] transition group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E9E7FF] text-[#4F46E5]">
                          <FileCode2 className="size-4" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <p className="truncate text-xs font-bold text-[#151936] group-hover:text-[#4F46E5] transition">
                            {title}
                          </p>
                          <p className="truncate text-[10px] text-[#647096] mt-0.5">
                            {isVerified ? "Accepted" : "Needs review"} ·{" "}
                            {sub.observedAt ? formatDate(sub.observedAt) : "Recently"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isVerified
                              ? "bg-emerald-50 text-[#16A765] border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isVerified ? "Accepted" : "Review"}
                        </span>
                        <Bookmark className="size-3.5 text-[#8F9BB3]" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: Assignment Progress */}
        <div className="rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#151936]">Assignment Progress</h2>
            <Link
              to="/app/problems"
              className="text-xs font-bold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="flex flex-col gap-3 flex-1 justify-around">
            {topicProgress.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#647096]">
                <BookOpenCheck className="size-8 text-[#8F9BB3] mb-2" />
                <p className="text-xs font-semibold text-[#151936]">No assignments active yet.</p>
                <p className="text-[11px] text-[#647096] mt-0.5">
                  Problems assigned by the professor will appear here.
                </p>
              </div>
            ) : (
              topicProgress.map((item) => {
                const pct = Math.round((item.completed / item.total) * 100);
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#E2E6F5] p-3 hover:border-[#4F46E5]/40 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#151936] truncate">{item.title}</span>
                      <span className="text-[11px] font-semibold text-[#647096]">
                        {item.completed}/{item.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E6F5] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${item.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
