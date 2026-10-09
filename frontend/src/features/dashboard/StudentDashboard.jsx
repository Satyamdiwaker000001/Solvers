import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  BookOpenCheck,
  ScanSearch,
  GitCommitHorizontal,
  ArrowRight,
  Clock,
  CheckCircle2,
  Code2,
  FolderGit2,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  getStudentOverview,
  getStudentAssignments,
  getStudentSubmissions,
  getLeaderboard,
} from "../../services/api.js";
import { StatCard, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
import { formatDate, formatDateTime, shortSha, timeUntil } from "../../lib/format.js";

const ActivityChart = lazy(() =>
  import("../../components/data-display/ActivityChart.jsx").then((m) => ({ default: m.ActivityChart })),
);

function MountainAtmosphereIllustration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl select-none" aria-hidden="true">
      {/* Background radial gradient glows */}
      <div
        className="absolute -top-24 right-1/4 size-[400px] rounded-full blur-[90px] opacity-25"
        style={{ background: "radial-gradient(circle, #DDF4E5 0%, transparent 60%, transparent 100%)" }}
      />
      <div
        className="absolute -top-20 right-8 size-[320px] rounded-full blur-[80px] opacity-20"
        style={{ background: "radial-gradient(circle, #EEF2F0 0%, transparent 60%, transparent 100%)" }}
      />

      {/* Mountain silhouette vector geometry */}
      <svg
        className="absolute bottom-0 right-0 h-44 w-full max-w-2xl text-surface/80"
        viewBox="0 0 800 200"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="backMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DDF4E5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#F6F8F7" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="frontMountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F6F8F7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F6F8F7" stopOpacity="0.98" />
          </linearGradient>
        </defs>

        {/* Distant mountain ridge */}
        <path
          d="M0 200 L0 145 L80 120 L160 140 L260 90 L360 125 L460 75 L560 115 L660 70 L740 105 L800 65 L800 200 Z"
          fill="url(#backMountainGrad)"
        />
        {/* Fore mountain ridge with crisp peaks */}
        <path
          d="M0 200 L0 165 L110 135 L200 155 L310 110 L410 145 L520 95 L630 130 L720 90 L800 120 L800 200 Z"
          fill="url(#frontMountainGrad)"
          stroke="#DCE5DF"
          strokeWidth="1.2"
        />

        {/* Ambient constellation stars */}
        <circle cx="280" cy="40" r="1.5" fill="#DDF4E5" opacity="0.6" />
        <circle cx="480" cy="30" r="2" fill="#DDF4E5" opacity="0.7" />
        <circle cx="620" cy="45" r="1.5" fill="#16803C" opacity="0.8" />
        <circle cx="710" cy="25" r="1.5" fill="#DDF4E5" opacity="0.5" />
      </svg>
    </div>
  );
}

function WelcomeBanner({ student }) {
  const firstName = (student?.displayName || student?.name || "Student").split(" ")[0];
  const folder = student?.folder || `students/${student?.studentId || "unknown"}`;

  return (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-surface via-canvas to-surface p-4 shadow-sm sm:p-6 md:p-7">
      <MountainAtmosphereIllustration />
      <div className="relative z-10 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <Sparkles aria-hidden="true" className="size-3.5" /> DSA Continuous Sprint
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-muted">
            Batch 2027
          </span>
        </div>

        <h1 className="page-title mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
          Welcome back, {firstName}
        </h1>

        <p className="mt-2 text-sm text-muted leading-relaxed max-w-xl">
          Your solutions are tracked and verified from commits in repository folder{" "}
          <strong className="mono text-ink bg-white/5 px-1.5 py-0.5 rounded border border-white/10 break-all">{folder}</strong>.
          Every verified solution contributes directly to your class ranking.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <Link
            to="/app/problems"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-ink shadow-sm hover:bg-primary-strong transition-all"
          >
            <Code2 aria-hidden="true" className="size-4" /> Continue Practicing
          </Link>
          <Link
            to="/app/report"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface/70 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface hover:border-primary/30 transition-all"
          >
            View Full Report <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function TopicProgressSection({ assignments }) {
  // Aggregate verified vs total problems per DSA topic
  const topicMap = new Map();
  for (const a of assignments) {
    const topic = a.problem?.topic || "General DSA";
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { topic, total: 0, verified: 0 });
    }
    const stat = topicMap.get(topic);
    stat.total += 1;
    if (a.status === "VERIFIED") stat.verified += 1;
  }

  // Ensure default core topics are represented even if empty
  const defaultTopics = ["Arrays & Hashing", "Two Pointers & Binary Search", "Stacks & Queues", "Trees & Graphs", "Dynamic Programming"];
  for (const t of defaultTopics) {
    if (!topicMap.has(t)) topicMap.set(t, { topic: t, total: 0, verified: 0 });
  }

  const topics = Array.from(topicMap.values()).slice(0, 5);

  return (
    <Card className="glass-panel border-white/10">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="section-title">Topic Progress</h2>
          <p className="text-xs text-muted">Verified problem completion across core DSA domains.</p>
        </div>
        <Link to="/app/problems" className="text-xs font-semibold text-primary hover:underline">
          Catalog →
        </Link>
      </div>

      <div className="space-y-3.5">
        {topics.map((t) => {
          const pct = t.total > 0 ? Math.round((t.verified / t.total) * 100) : 0;
          return (
            <div key={t.topic} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-ink truncate max-w-[130px] sm:max-w-[200px]">{t.topic}</span>
                <span className="tnum text-muted shrink-0">
                  <strong className="text-primary font-bold">{t.verified}</strong> / {t.total} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-canvas/80 border border-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-strong transition-all duration-500"
                  style={{ width: `${Math.max(pct, t.verified > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NextDeadlineCard({ assignments }) {
  const upcoming = assignments
    .filter((a) => a.dueAt && a.status !== "VERIFIED")
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];

  return (
    <Card className="glass-panel border-white/10">
      <div className="flex items-center gap-2 text-warning">
        <Clock aria-hidden="true" className="size-4" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Next Deadline</h3>
      </div>

      {upcoming ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-bold text-ink leading-snug truncate">
            {upcoming.problem?.title || upcoming.title}
          </p>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Due {formatDate(upcoming.dueAt)}</span>
            <span className="font-mono text-warning font-semibold">
              {timeUntil(upcoming.dueAt)}
            </span>
          </div>
          <Link
            to={`/app/problems/${upcoming.problemId}`}
            className="mt-2 block w-full rounded-lg border border-warning/30 bg-warning-bg/40 px-3 py-1.5 text-center text-xs font-semibold text-warning hover:bg-warning-bg/70 transition-all"
          >
            Solve Problem
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">
          No urgent pending deadlines. You are fully caught up on scheduled milestones!
        </p>
      )}
    </Card>
  );
}

function RecentSubmissionsPanel({ submissions }) {
  const recent = (submissions || []).slice(0, 4);

  return (
    <Card className="glass-panel border-white/10">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FolderGit2 aria-hidden="true" className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Recent Submissions</h3>
        </div>
        <Link to="/app/activity" className="text-xs font-semibold text-primary hover:underline">
          All →
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-muted py-2">
          No submissions recorded yet. Push your solution code to your assigned repository folder to trigger verification.
        </p>
      ) : (
        <div className="space-y-2.5">
          {recent.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-white/5 bg-canvas/60 p-2.5 text-xs transition hover:border-primary/20"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-[11px] text-primary font-semibold truncate max-w-[100px] sm:max-w-[140px] shrink-0">
                  {shortSha(s.commitSha)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    s.eventType === "NEW_PROBLEM_VERIFIED"
                      ? "bg-success-bg text-success border border-success/30"
                      : s.outcome === "NEEDS_REVIEW"
                      ? "bg-warning-bg text-warning border border-warning/30"
                      : "bg-white/5 text-muted border border-white/10"
                  }`}
                >
                  {s.eventType === "NEW_PROBLEM_VERIFIED" ? "Verified" : s.outcome === "NEEDS_REVIEW" ? "In Review" : "Processed"}
                </span>
              </div>
              <p className="mt-1 font-medium text-ink truncate break-all">
                {s.problemTitle || s.path || "Solution commit"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                {formatDateTime(s.observedAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function StudentDashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({
    loading: true,
    error: null,
    overview: null,
    assignments: [],
    submissions: [],
    rank: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [ov, asg, subs, lb] = await Promise.all([
          getStudentOverview(user.studentId),
          getStudentAssignments(user.studentId),
          getStudentSubmissions(user.studentId),
          getLeaderboard(),
        ]);
        if (!live) return;
        const me = lb.data.entries.find((e) => e.studentId === user.studentId);
        setState({
          loading: false,
          error: null,
          overview: ov.data,
          assignments: asg.data,
          submissions: subs.data,
          rank: me ?? null,
        });
      } catch (e) {
        if (live) setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    })();
    return () => {
      live = false;
    };
  }, [user.studentId, attempt]);

  if (state.loading) {
    return (
      <div className="grid gap-4">
        <LoadingState label="Loading your student dashboard…" lines={4} />
      </div>
    );
  }

  if (state.error) {
    return (
      <ErrorState
        body={state.error}
        onRetry={() => {
          setState({
            loading: true,
            error: null,
            overview: null,
            assignments: [],
            submissions: [],
            rank: null,
          });
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  const { overview, assignments, submissions, rank } = state;
  const todo = assignments.filter((a) => a.status !== "VERIFIED").slice(0, 4);
  const availablePractice = assignments.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Cinematic Welcome Banner */}
      <WelcomeBanner student={overview.student} />

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Verified Problems"
          value={overview.verified}
          sub="Faculty-verified solutions"
          icon={BookOpenCheck}
          tone="text-primary"
        />
        <StatCard
          label="Pending Work"
          value={overview.pending}
          sub="Assigned problems to solve"
          icon={GitCommitHorizontal}
        />
        <StatCard
          label="Awaiting Review"
          value={overview.needsReview}
          sub="Submissions pending check"
          icon={ScanSearch}
          tone="text-warning"
        />
        <StatCard
          label="Class Rank"
          value={rank ? `#${rank.rank}` : "—"}
          sub={rank ? `${rank.score} pts · ${rank.verifiedProblems} solved` : "Unranked"}
          icon={Flame}
          tone="text-warning"
        />
      </div>

      {/* 3. Main Dashboard Grid (Left 3 cols, Right 2 cols) */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Main Content Area */}
        <div className="space-y-6 xl:col-span-3">
          {/* Current Assignments Glass Panel */}
          <Card className="glass-panel border-white/10">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="section-title">Current Assignments</h2>
                <p className="text-xs text-muted">Batch milestones and assigned individual exercises.</p>
              </div>
              <Link to="/app/problems" className="text-xs font-semibold text-primary hover:underline">
                View all ({assignments.length}) →
              </Link>
            </div>

            {todo.length === 0 ? (
              <div className="rounded-xl border border-success/30 bg-success-bg/80 p-4 text-sm text-success flex items-center gap-3">
                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
                <span>All currently assigned problems have been completed and verified. Great job!</span>
              </div>
            ) : (
              <ul className="grid gap-2.5">
                {todo.map((a) => {
                  const problemTitle = a.problem?.title || a.title || "Assignment";
                  const problemTopic = a.problem?.topic ? `${a.problem.topic} · ${a.problem.difficulty || ""}` : a.title;
                  return (
                    <li key={a.id}>
                      <Link
                        to={`/app/problems/${a.problemId}`}
                        className="block rounded-xl border border-white/10 bg-canvas/50 p-3.5 transition hover:border-primary/40 hover:bg-surface/90"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={a.type === "COMMON" ? "info" : "neutral"}>
                            {a.type === "COMMON" ? "Class" : "Individual"}
                          </Badge>
                          <Badge
                            tone={
                              a.status === "NEEDS_REVIEW"
                                ? "warning"
                                : a.status === "IN_PROGRESS"
                                ? "info"
                                : "neutral"
                            }
                          >
                            {a.status === "VERIFIED"
                              ? "Verified"
                              : a.status === "NEEDS_REVIEW"
                              ? "Needs review"
                              : a.status === "IN_PROGRESS"
                              ? "In progress"
                              : "Not started"}
                          </Badge>
                          {a.dueAt && (
                            <span className="tnum ml-auto text-xs text-muted flex items-center gap-1">
                              <Calendar aria-hidden="true" className="size-3" /> Due {formatDate(a.dueAt)}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 truncate font-semibold text-ink">{problemTitle}</p>
                        {problemTopic && <p className="truncate text-xs text-muted mt-0.5">{problemTopic}</p>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Submission Activity Chart */}
          <Card className="glass-panel border-white/10">
            <h2 className="section-title">Submission Activity</h2>
            <p className="mb-4 text-xs text-muted">Daily qualifying code solutions submitted to the repository.</p>
            <Suspense fallback={<LoadingState label="Loading activity chart…" lines={2} />}>
              <ActivityChart data={overview.activitySeries} />
            </Suspense>
          </Card>

          {/* Topic Mastery Progress */}
          <TopicProgressSection assignments={assignments} />
        </div>

        {/* Right-Side Contextual Panels */}
        <div className="space-y-6 xl:col-span-2">
          {/* Next Applicable Deadline */}
          <NextDeadlineCard assignments={assignments} />

          {/* Recent Submissions Feed */}
          <RecentSubmissionsPanel submissions={submissions} />

          {/* Practice Problems Quick Jump */}
          <Card className="glass-panel border-white/10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Available Problems</h3>
              <Link to="/app/problems" className="text-xs font-semibold text-primary hover:underline">
                Explore →
              </Link>
            </div>
            <div className="space-y-2">
              {availablePractice.map((a) => (
                <Link
                  key={a.id}
                  to={`/app/problems/${a.problemId}`}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-canvas/40 p-2.5 text-xs hover:border-primary/30 hover:bg-surface transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-ink truncate">{a.problem?.title || a.title}</p>
                    <p className="text-[11px] text-muted truncate">{a.problem?.topic || "Algorithm"}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 border border-white/10 bg-white/5 text-primary">
                    {a.problem?.difficulty || "Medium"}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
