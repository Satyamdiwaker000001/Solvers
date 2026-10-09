import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Check, Code2, FileCode2, GitPullRequest, Hourglass, Search, Trophy } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { getLeaderboard, getStudentAssignments, getStudentOverview, getStudentSubmissions } from "../../services/api.js";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
import { formatDate, shortSha } from "../../lib/format.js";
import { Avatar } from "../../components/ui/Avatar.jsx";

function Metric({ icon: Icon, value, label, detail, tone }) {
  return <div className={`concept-metric ${tone}`}><span className="concept-metric-icon"><Icon aria-hidden="true" /></span><div><strong className="concept-metric-value">{value}</strong><p className="concept-metric-label">{label}</p><p className="concept-metric-detail">{detail}</p></div></div>;
}

function Panel({ title, action, children, className = "" }) {
  return <section className={`concept-panel ${className}`}><div className="concept-panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}

function ProgressChart({ data }) {
  const series = data || [];
  const max = Math.max(1, ...series.map((item) => item.verified + item.progress + item.review));
  if (!series.length) return <p className="concept-empty-note">Progress activity will appear after your first tracked submissions.</p>;
  return <div className="concept-chart" role="img" aria-label="Qualifying activity over the last 14 days"><div className="concept-chart-grid"><span /><span /><span /><span /></div><div className="concept-bars">{series.map((item) => { const values = [item.verified, item.progress, item.review]; return <div className="concept-bar-group" key={item.day} title={`${item.day}: ${values[0]} verified, ${values[1]} in progress, ${values[2]} review`}><div className="concept-bar" style={{ height: `${Math.max(5, ((values.reduce((a, b) => a + b, 0)) / max) * 100)}%` }}><i className="bar-verified" style={{ flex: values[0] }} /><i className="bar-progress" style={{ flex: values[1] }} /><i className="bar-review" style={{ flex: values[2] }} /></div><small>{item.day.replace("Sep ", "").replace("Oct ", "")}</small></div>; })}</div></div>;
}

function AssignmentTable({ assignments }) {
  if (!assignments.length) return <p className="concept-empty-note">No assignments match this filter.</p>;
  return <div className="concept-table-wrap"><table className="concept-table"><thead><tr><th>Assignment</th><th>Due</th><th>Status</th><th>Progress</th></tr></thead><tbody>{assignments.slice(0, 5).map((item, index) => { const verified = item.status === "VERIFIED"; return <tr key={item.id}><td><Link to={`/app/problems/${item.problemId}`} className="concept-problem-link"><span className="concept-row-icon"><Code2 aria-hidden="true" /></span>{item.problem?.title || item.title}</Link></td><td>{formatDate(item.dueAt)}</td><td><span className={`concept-status ${verified ? "done" : index === 0 ? "progress" : "not-started"}`}>{verified ? "Verified" : index === 0 ? "In progress" : "Not started"}</span></td><td><span className="concept-progress-text">{verified ? "1/1" : `0/${index + 4}`}<span className="concept-progress-line"><i style={{ width: verified ? "100%" : `${index === 0 ? 35 : 0}%` }} /></span></span></td></tr>; })}</tbody></table></div>;
}

function DeadlineList({ assignments, now }) {
  const items = [...assignments].filter((item) => item.dueAt && item.status !== "VERIFIED").sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 3);
  if (!items.length) return <p className="concept-empty-note">No upcoming deadlines.</p>;
  return <div className="concept-list">{items.map((item, index) => { const overdue = Date.parse(item.dueAt) < now; return <Link to={`/app/problems/${item.problemId}`} className="concept-deadline" key={item.id}><span className={`concept-date ${overdue ? "overdue" : index === 0 ? "urgent" : ""}`}><b>{new Date(item.dueAt).toLocaleString("en", { month: "short" }).toUpperCase()}</b><strong>{new Date(item.dueAt).getDate()}</strong></span><span className="min-w-0 flex-1"><b className="block truncate">{item.problem?.title || item.title}</b><small>{item.type === "COMMON" ? "Common" : "Individual"}</small></span><span className="concept-pill">{overdue ? "Overdue" : index === 0 ? "Soon" : `${index + 2}d`}</span></Link>; })}</div>;
}

function RecentSubmissions({ submissions }) {
  if (!submissions.length) return <p className="concept-empty-note">No submissions recorded yet.</p>;
  return <div className="concept-list">{submissions.slice(0, 3).map((item) => <Link to="/app/activity" className="concept-submission" key={item.id}><span className="concept-row-icon"><GitPullRequest aria-hidden="true" /></span><span className="min-w-0 flex-1"><b className="block truncate">{item.problemTitle || item.path?.split("/").pop() || "Solution"}</b><small>{shortSha(item.commitSha)} · {item.observedAt ? "Recent submission" : "Pending review"}</small></span><span className={`concept-status ${item.outcome === "VERIFIED" ? "done" : "progress"}`}>{item.outcome === "VERIFIED" ? "Verified" : "Review"}</span></Link>)}</div>;
}

function ProblemDistribution({ assignments }) {
  const counts = new Map();
  assignments.forEach((item) => { const topic = item.problem?.topic; if (topic) counts.set(topic, (counts.get(topic) || 0) + 1); });
  const items = [...counts.entries()].slice(0, 4);
  if (!items.length) return <p className="concept-empty-note">Category data is not available yet.</p>;
  const total = items.reduce((sum, [, count]) => sum + count, 0);
  return <div className="concept-distribution-compact">{items.map(([topic, count], index) => <div key={topic}><span><i className={`distribution-dot dot-${index}`} />{topic}</span><b>{count}</b><small><i style={{ width: `${(count / total) * 100}%` }} /></small></div>)}</div>;
}

function LeaderboardPreview({ entries, studentId }) {
  if (!entries.length) return <p className="concept-empty-note">Leaderboard data is not available yet.</p>;
  return <div className="concept-leaderboard-compact">{entries.slice(0, 3).map((entry) => <div className={entry.studentId === studentId ? "current" : ""} key={entry.studentId}><strong>#{entry.rank}</strong><Avatar src={entry.avatarUrl} name={entry.displayName || entry.studentId} className="concept-avatar object-cover" /><b>{entry.displayName || entry.studentId}</b><em>{entry.verifiedProblems}</em></div>)}</div>;
}

export function StudentDashboardConcept() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, overview: null, assignments: [], submissions: [], leaderboard: [], rank: null });
  const [attempt, setAttempt] = useState(0);
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [now] = useState(() => Date.now());
  useEffect(() => { let active = true; Promise.all([getStudentOverview(user.studentId), getStudentAssignments(user.studentId), getStudentSubmissions(user.studentId), getLeaderboard()]).then(([overview, assignments, submissions, leaderboard]) => { if (!active) return; const entries = leaderboard.data.entries || []; setState({ loading: false, error: null, overview: overview.data, assignments: assignments.data, submissions: submissions.data, leaderboard: entries, rank: entries.find((item) => item.studentId === user.studentId) || null }); }).catch((error) => active && setState((current) => ({ ...current, loading: false, error: error.message }))); return () => { active = false; }; }, [user.studentId, attempt]);
  useEffect(() => { const timer = window.setInterval(() => setAttempt((value) => value + 1), 30000); return () => window.clearInterval(timer); }, []);
  if (state.loading) return <div className="concept-loading"><LoadingState label="Loading your student dashboard…" lines={3} /></div>;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState((current) => ({ ...current, loading: true, error: null })); setAttempt((value) => value + 1); }} />;
  const firstName = (state.overview.student?.displayName || user.displayName || "Student").split(" ")[0];
  const verified = state.overview.verified || 0;
  const activeAssignments = state.assignments.filter((item) => item.status !== "VERIFIED").length;
  const filteredAssignments = state.assignments.filter((item) => { const overdue = item.dueAt && Date.parse(item.dueAt) < now && item.status !== "VERIFIED"; if (assignmentFilter === "completed") return item.status === "VERIFIED"; if (assignmentFilter === "overdue") return overdue; if (assignmentFilter === "upcoming") return item.status !== "VERIFIED" && !overdue; return true; });
  return <div className="concept-dashboard concept-dashboard-minimal"><div className="concept-search"><Search aria-hidden="true" /><span>Search assignments, problems, or submissions…</span><kbd>Ctrl</kbd><kbd>K</kbd></div><div className="concept-welcome"><div><p className="concept-eyebrow">STUDENT CONSOLE</p><h1>Welcome back, {firstName}</h1><p>Small, consistent progress compounds.</p></div><Link className="concept-primary-action" to="/app/problems">Browse problems <ArrowRight aria-hidden="true" /></Link></div><div className="concept-metrics"><Metric icon={Check} value={verified} label="Verified problems" detail="Qualifying solutions" tone="green" /><Metric icon={Hourglass} value={activeAssignments} label="In progress" detail="Still to complete" tone="amber" /><Metric icon={FileCode2} value={state.assignments.length} label="Total assignments" detail="Assigned to you" tone="blue" /><Metric icon={Trophy} value={state.rank ? `#${state.rank.rank}` : "—"} label="Current rank" detail="Official leaderboard" tone="violet" /></div><div className="concept-main-grid"><div className="concept-primary-column"><Panel title="Progress overview" action={<Link to="/app/report" className="concept-view-link">View report <ArrowRight aria-hidden="true" /></Link>}><div className="concept-legend"><span className="verified">Verified</span><span className="progress">In progress</span><span className="not-started">Needs review</span></div><ProgressChart data={state.overview.activitySeries} /></Panel><Panel title="My assignments" action={<Link to="/app/problems" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}><div className="concept-tabs"><button className={assignmentFilter === "all" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("all")}>All <b>({state.assignments.length})</b></button><button className={assignmentFilter === "upcoming" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("upcoming")}>Upcoming</button><button className={assignmentFilter === "overdue" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("overdue")}>Overdue</button><button className={assignmentFilter === "completed" ? "active" : ""} type="button" onClick={() => setAssignmentFilter("completed")}>Completed</button></div><AssignmentTable assignments={filteredAssignments} /></Panel></div><aside className="concept-secondary-column"><Panel title="Upcoming deadlines" action={<Link to="/app/problems" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}><DeadlineList assignments={state.assignments} now={now} /></Panel><Panel title="Recent submissions" action={<Link to="/app/activity" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}><RecentSubmissions submissions={state.submissions} /></Panel><Panel title="Quick links"><div className="concept-quick-links"><Link to="/app/leaderboard"><Trophy aria-hidden="true" />Leaderboard</Link><Link to="/app/activity"><BarChart3 aria-hidden="true" />Progress report</Link><Link to="/app/problems"><FileCode2 aria-hidden="true" />Problem bank</Link></div></Panel></aside></div><div className="concept-support-grid"><Panel title="Problem distribution"><ProblemDistribution assignments={state.assignments} /></Panel><Panel title="Leaderboard" action={<Link to="/app/leaderboard" className="concept-view-link">View all <ArrowRight aria-hidden="true" /></Link>}><LeaderboardPreview entries={state.leaderboard} studentId={user.studentId} /></Panel></div></div>;
}
