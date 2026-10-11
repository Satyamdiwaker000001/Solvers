import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Check, Code2, FileCode2, GitPullRequest, Hourglass, Trophy, Flame, Target } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { getLeaderboard, getStudentAssignments, getStudentOverview, getStudentSubmissions } from "../../services/api.js";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
import { formatDate, shortSha } from "../../lib/format.js";
import { Avatar } from "../../components/ui/Avatar.jsx";

function Metric({ icon: Icon, value, label, detail, tone }) {
  return (
    <div className={`concept-metric ${tone}`}>
      <span className="concept-metric-icon"><Icon aria-hidden="true" /></span>
      <div>
        <strong className="concept-metric-value">{value}</strong>
        <p className="concept-metric-label">{label}</p>
        <p className="concept-metric-detail">{detail}</p>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`concept-panel ${className}`}>
      <div className="concept-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProgressChart({ data }) {
  const series = data || [];
  const max = Math.max(1, ...series.map((item) => item.verified + item.progress + item.review));
  if (!series.length) return <p className="concept-empty-note">Progress activity will appear after your first tracked submissions.</p>;
  return (
    <div className="concept-chart" role="img" aria-label="Qualifying activity over the last 14 days">
      <div className="concept-chart-grid"><span /><span /><span /><span /></div>
      <div className="concept-bars">
        {series.map((item) => {
          const values = [item.verified, item.progress, item.review];
          return (
            <div className="concept-bar-group" key={item.day} title={`${item.day}: ${values[0]} verified, ${values[1]} in progress, ${values[2]} review`}>
              <div className="concept-bar" style={{ height: `${Math.max(5, ((values.reduce((a, b) => a + b, 0)) / max) * 100)}%` }}>
                <i className="bar-verified" style={{ flex: values[0] }} />
                <i className="bar-progress" style={{ flex: values[1] }} />
                <i className="bar-review" style={{ flex: values[2] }} />
              </div>
              <small>{item.day.replace("Sep ", "").replace("Oct ", "")}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssignmentTable({ assignments }) {
  if (!assignments.length) return <p className="concept-empty-note">No assignments match this filter.</p>;
  return (
    <div className="concept-table-wrap">
      <table className="concept-table">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Due</th>
            <th>Status</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {assignments.slice(0, 5).map((item, index) => {
            const verified = item.status === "VERIFIED";
            return (
              <tr key={item.id}>
                <td>
                  <Link to={`/app/problems/${item.problemId}`} className="concept-problem-link">
                    <span className="concept-row-icon"><Code2 aria-hidden="true" /></span>
                    {item.problem?.title || item.title}
                  </Link>
                </td>
                <td>{formatDate(item.dueAt)}</td>
                <td>
                  <span className={`concept-status ${verified ? "done" : index === 0 ? "progress" : "not-started"}`}>
                    {verified ? "Verified" : index === 0 ? "In progress" : "Not started"}
                  </span>
                </td>
                <td>
                  <span className="concept-progress-text">
                    {verified ? "1/1" : `0/${index + 4}`}
                    <span className="concept-progress-line"><i style={{ width: verified ? "100%" : `${index === 0 ? 35 : 0}%` }} /></span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeadlineList({ assignments, now }) {
  const items = [...assignments].filter((item) => item.dueAt && item.status !== "VERIFIED").sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 3);
  if (!items.length) return <p className="concept-empty-note">No upcoming deadlines.</p>;
  return (
    <div className="concept-list">
      {items.map((item, index) => {
        const overdue = Date.parse(item.dueAt) < now;
        return (
          <Link to={`/app/problems/${item.problemId}`} className="concept-deadline" key={item.id}>
            <span className={`concept-date ${overdue ? "overdue" : index === 0 ? "urgent" : ""}`}>
              <b>{new Date(item.dueAt).toLocaleString("en", { month: "short" }).toUpperCase()}</b>
              <strong>{new Date(item.dueAt).getDate()}</strong>
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate">{item.problem?.title || item.title}</b>
              <small>{item.type === "COMMON" ? "Common" : "Individual"}</small>
            </span>
            <span className="concept-pill">{overdue ? "Overdue" : index === 0 ? "Soon" : `${index + 2}d`}</span>
          </Link>
        );
      })}
    </div>
  );
}

function RecentSubmissions({ submissions }) {
  if (!submissions.length) return <p className="concept-empty-note">No submissions recorded yet.</p>;
  return (
    <div className="concept-list">
      {submissions.slice(0, 3).map((item) => (
        <Link to="/app/activity" className="concept-submission" key={item.id}>
          <span className="concept-row-icon"><GitPullRequest aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <b className="block truncate">{item.problemTitle || item.path?.split("/").pop() || "Solution"}</b>
            <small>{shortSha(item.commitSha)} · {item.observedAt ? "Recent submission" : "Pending review"}</small>
          </span>
          <span className={`concept-status ${item.outcome === "VERIFIED" ? "done" : "progress"}`}>
            {item.outcome === "VERIFIED" ? "Verified" : "Review"}
          </span>
        </Link>
      ))}
    </div>
  );
}

function ProblemDistribution({ assignments }) {
  if (!assignments || assignments.length === 0) return <p className="concept-empty-note">No problems assigned yet.</p>;

  const counts = new Map();
  assignments.forEach((item) => { 
    let topic = "Uncategorized";
    if (item.problem && typeof item.problem === 'object') {
      topic = item.problem.topic || item.problem.difficulty || "Uncategorized";
    }
    counts.set(topic, (counts.get(topic) || 0) + 1); 
  });

  const items = [...counts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 4);
  const total = items.reduce((sum, [, count]) => sum + count, 0);
  
  const colors = ["var(--color-primary)", "var(--color-success)", "var(--color-warning)", "var(--color-secondary)"];
  let gradientStops = [];
  let currentPercent = 0;
  items.forEach(([_, count], index) => {
    const percent = (count / total) * 100;
    gradientStops.push(`${colors[index]} ${currentPercent}% ${currentPercent + percent}%`);
    currentPercent += percent;
  });
  const gradient = `conic-gradient(${gradientStops.join(', ')})`;

  return (
    <div className="concept-lower-grid items-center">
      <div className="concept-donut relative" style={{ background: gradient }}>
        <span>{total}<small>total</small></span>
      </div>
      <div className="concept-distribution">
        {items.map(([topic, count], index) => (
          <div key={topic} style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
             <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-muted)' }}>
               <i style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[index] }} /> <span className="truncate max-w-[90px] inline-block">{topic}</span>
             </span>
             <b style={{ marginLeft: 'auto', color: 'var(--color-ink)' }}>{count}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardPreview({ entries, studentId }) {
  if (!entries.length) return <p className="concept-empty-note">Leaderboard data is not available yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      {entries.slice(0, 3).map((entry) => (
        <div key={entry.studentId} className={`flex items-center gap-3 rounded-xl border p-2 transition-colors ${entry.studentId === studentId ? 'bg-primary-subtle/30 border-primary' : 'bg-surface border-border hover:bg-canvas'}`}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-canvas text-[11px] font-bold text-primary shadow-xs border border-border">#{entry.rank}</div>
          <Avatar src={entry.avatarUrl} name={entry.displayName || entry.studentId} className="size-8 shrink-0 rounded-full object-cover border border-border" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-tight font-bold text-ink">{entry.displayName || entry.studentId}</p>
            <p className="text-[10px] text-muted leading-tight mt-0.5">{entry.verifiedProblems} verified</p>
          </div>
          <div className="text-right leading-none pr-1">
            <p className="text-[13px] font-extrabold text-primary">{entry.score}</p>
            <p className="text-[9px] font-bold text-muted uppercase tracking-wider mt-1">pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}

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

  // Collect unique dates where student submitted code
  const activeDateSet = new Set(
    submissions
      .filter((s) => s.observedAt)
      .map((s) => new Date(s.observedAt).toISOString().slice(0, 10))
  );

  // 1. Calculate active day streak backwards from today (or yesterday if today not submitted yet)
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  
  let streak = 0;
  let checkDate = new Date();

  // If today has no submission, check if yesterday had a submission to preserve ongoing streak
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

  // 2. Compute last 7 days activity dots (from 6 days ago up to today)
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
  const [state, setState] = useState({ loading: true, error: null, overview: null, assignments: [], submissions: [], leaderboard: [], rank: null });
  const [attempt, setAttempt] = useState(0);
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    Promise.all([
      getStudentOverview(user.studentId),
      getStudentAssignments(user.studentId),
      getStudentSubmissions(user.studentId),
      getLeaderboard()
    ])
      .then(([overview, assignments, submissions, leaderboard]) => {
        if (!active) return;
        const entries = leaderboard.data.entries || [];
        setState({
          loading: false,
          error: null,
          overview: overview.data,
          assignments: assignments.data,
          submissions: submissions.data,
          leaderboard: entries,
          rank: entries.find((item) => item.studentId === user.studentId) || null,
        });
      })
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error: error.message })));
    return () => { active = false; };
  }, [user.studentId, attempt]);

  useEffect(() => {
    const timer = window.setInterval(() => setAttempt((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Compute live actual streak based on student's real submissions
  const streakData = useMemo(() => {
    return calculateStreakAndWeeklyActivity(state.submissions);
  }, [state.submissions]);

  if (state.loading) return <div className="concept-loading"><LoadingState label="Loading your student dashboard…" lines={3} /></div>;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState((current) => ({ ...current, loading: true, error: null })); setAttempt((value) => value + 1); }} />;

  const firstName = (state.overview.student?.displayName || user.displayName || "Student").split(" ")[0];
  const verified = state.overview.verified || 0;
  const activeAssignments = state.assignments.filter((item) => item.status !== "VERIFIED").length;
  const filteredAssignments = state.assignments.filter((item) => {
    const overdue = item.dueAt && Date.parse(item.dueAt) < now && item.status !== "VERIFIED";
    if (assignmentFilter === "completed") return item.status === "VERIFIED";
    if (assignmentFilter === "overdue") return overdue;
    if (assignmentFilter === "upcoming") return item.status !== "VERIFIED" && !overdue;
    return true;
  });

  return (
    <div className="concept-dashboard concept-dashboard-minimal">
      {/* Welcome banner matching reference image with background.png applied to mascot section */}
      <div className="relative overflow-hidden rounded-3xl bg-white bg-[url('/background.png')] bg-cover bg-center border border-[#E2E6F5] p-5 sm:p-6 lg:p-8 shadow-xs">
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent pointer-events-none" aria-hidden="true" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 z-10">
          <div className="flex-1 max-w-xl">
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black tracking-tight text-[#151936] flex items-center gap-2">
              Welcome back,
              <span>{firstName}!</span>
              <span className="inline-block animate-wave origin-bottom-right">👋</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#647096] italic">
              "Consistency today, stronger tomorrow."
            </p>
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#151936] border border-[#E2E6F5] shadow-2xs">
                <span className="size-2 rounded-full bg-[#4F46E5]" />
                Keep solving, keep growing!
              </span>
            </div>
          </div>

          {/* Mascot in banner */}
          <div className="relative flex items-center justify-center lg:w-[320px] h-[140px] sm:h-[180px] lg:h-[190px] shrink-0 my-2 lg:my-0">
            <span
              className="hidden xl:block absolute -left-6 top-3 text-xs font-bold text-[#4F46E5] -rotate-12 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs border border-[#4F46E5]/20 select-none pointer-events-none"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Same Effort, Higher Future!
            </span>
            <img
              src="/mascot.png"
              alt="Solvers 3D Student Character"
              className="h-[150px] sm:h-[190px] lg:h-[210px] object-contain filter drop-shadow-xl select-none pointer-events-none -mb-2 sm:-mb-3 z-10"
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

          {/* Right quick stats / Live Streak Card */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-[250px] shrink-0">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/95 p-3.5 border border-[#E2E6F5] shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Flame className="size-5 fill-amber-500 text-amber-500" />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-black text-[#151936]">{streakData.streak}</span>
                    <span className="text-xs sm:text-[13px] font-bold text-[#151936]">Day Streak</span>
                  </div>
                  {/* Dynamic Real 7-day activity dots based on actual commits */}
                  <div className="flex items-center gap-1.5 mt-1.5" title={`${streakData.streak} days active streak`}>
                    {streakData.weeklyDots.map((isActive, idx) => (
                      <span
                        key={idx}
                        className={`size-2 rounded-full transition-colors ${
                          isActive ? "bg-amber-500 ring-1 ring-amber-400" : "bg-gray-200"
                        }`}
                        title={isActive ? "Active submission day" : "No submission"}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/95 p-3.5 border border-[#E2E6F5] shadow-xs">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <Target className="size-5 text-purple-600" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-[#151936]">"Solve. Submit. Grow."</p>
                <p className="text-[10px] text-[#647096] mt-0.5">
                  {streakData.activeDaysCount > 0 ? `${streakData.activeDaysCount} active practice days 🚀` : "Start your streak today! 🚀"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="concept-metrics">
        <Metric icon={Check} value={verified} label="Verified problems" detail="Qualifying solutions" tone="green" />
        <Metric icon={Hourglass} value={activeAssignments} label="In progress" detail="Still to complete" tone="amber" />
        <Metric icon={FileCode2} value={state.assignments.length} label="Total assignments" detail="Assigned to you" tone="blue" />
        <Metric icon={Trophy} value={state.rank ? `#${state.rank.rank}` : "—"} label="Current rank" detail="Official leaderboard" tone="violet" />
      </div>

      {/* Main Grid: Progress Chart & Assignments */}
      <div className="concept-main-grid">
        <div className="concept-primary-column">
          <Panel title="Progress overview" action={<Link to="/app/report" className="concept-view-link">View report <ArrowRight aria-hidden="true" /></Link>}>
            <div className="concept-legend">
              <span className="verified">Verified</span>
              <span className="progress">In progress</span>
              <span className="not-started">Needs review</span>
            </div>
            <ProgressChart data={state.overview.activitySeries} />
          </Panel>

          <Panel title="My assignments" action={<Link to="/app/problems" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}>
            <div className="concept-tabs">
              <button className={assignmentFilter === "all" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("all")}>All <b>({state.assignments.length})</b></button>
              <button className={assignmentFilter === "upcoming" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("upcoming")}>Upcoming</button>
              <button className={assignmentFilter === "overdue" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("overdue")}>Overdue</button>
              <button className={assignmentFilter === "completed" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("completed")}>Completed</button>
            </div>
            <AssignmentTable assignments={filteredAssignments} />
          </Panel>
        </div>

        <aside className="concept-secondary-column">
          <Panel title="Upcoming deadlines" action={<Link to="/app/problems" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}>
            <DeadlineList assignments={state.assignments} now={now} />
          </Panel>
          <Panel title="Recent submissions" action={<Link to="/app/activity" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}>
            <RecentSubmissions submissions={state.submissions} />
          </Panel>
          <Panel title="Quick links">
            <div className="concept-quick-links">
              <Link to="/app/leaderboard"><Trophy aria-hidden="true" />Leaderboard</Link>
              <Link to="/app/activity"><BarChart3 aria-hidden="true" />Progress report</Link>
              <Link to="/app/problems"><FileCode2 aria-hidden="true" />Problem bank</Link>
            </div>
          </Panel>
        </aside>
      </div>

      <div className="concept-support-grid">
        <Panel title="Problem distribution">
          <ProblemDistribution assignments={state.assignments} />
        </Panel>
        <Panel title="Leaderboard" action={<Link to="/app/leaderboard" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}>
          <LeaderboardPreview entries={state.leaderboard} studentId={user.studentId} />
        </Panel>
      </div>
    </div>
  );
}
