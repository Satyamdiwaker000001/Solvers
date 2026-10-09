import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, BookOpenCheck, ScanSearch, GitCommitHorizontal, ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { getStudentOverview, getStudentAssignments, getLeaderboard } from "../../services/api.js";
import { PageHeader, StatCard, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
const ActivityChart = lazy(() => import("../../components/data-display/ActivityChart.jsx").then((m) => ({ default: m.ActivityChart })));
import { problemById } from "../../mocks/data.js";
import { formatDate } from "../../lib/format.js";

export function StudentDashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, overview: null, assignments: [], rank: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [ov, asg, lb] = await Promise.all([
          getStudentOverview(user.studentId), getStudentAssignments(user.studentId), getLeaderboard(),
        ]);
        if (!live) return;
        const me = lb.data.entries.find((e) => e.studentId === user.studentId);
        setState({ loading: false, error: null, overview: ov.data, assignments: asg.data, rank: me ?? null });
      } catch (e) { if (live) setState((s) => ({ ...s, loading: false, error: e.message })); }
    })();
    return () => { live = false; };
  }, [user.studentId, attempt]);

  if (state.loading) return (<div className="grid gap-4"><LoadingState label="Loading your dashboard…" lines={4} /></div>);
  if (state.error) {
    return (
      <ErrorState
        body={state.error}
        onRetry={() => {
          setState({ loading: true, error: null, overview: null, assignments: [], rank: null });
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  const { overview, assignments } = state;
  const todo = assignments.filter((a) => a.status !== "VERIFIED").slice(0, 4);

  return (
    <div className="grid gap-5">
      <PageHeader
        title={`Good to see you, ${overview.student.displayName.split(" ")[0]}`}
        description={`Folder ${overview.student.folder} · tracking GitHub evidence on the class repository. Commit count is never shown as solved problems.`}
        actions={<Link to="/app/report" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong">View my report <ArrowRight aria-hidden="true" className="size-4" /></Link>}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Verified problems" value={overview.verified} sub="Distinct problems, verified evidence" icon={BookOpenCheck} tone="text-success" />
        <StatCard label="To finish" value={overview.pending} sub="Assigned, not yet verified" icon={GitCommitHorizontal} />
        <StatCard label="Needs review" value={overview.needsReview} sub="Waiting on professor" icon={ScanSearch} tone="text-warning" />
        <StatCard label="Leaderboard" value={state.rank ? `#${state.rank.rank}` : "—"} sub={state.rank ? `${state.rank.score} pts · ${state.rank.verifiedProblems} verified` : "Not ranked yet"} icon={Flame} tone="text-warning" />
      </div>
      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <h2 className="section-title">Activity trend</h2>
          <p className="mb-3 text-[13px] text-muted">Qualifying GitHub evidence per day. Raw commits are excluded by policy (FR-PROG-02).</p>
          <Suspense fallback={<LoadingState label="Loading chart…" lines={2} />}>
            <ActivityChart data={overview.activitySeries} />
          </Suspense>
        </Card>
        <Card className="xl:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="section-title">Up next</h2>
            <Link to="/app/problems" className="text-sm font-semibold text-primary">All problems</Link>
          </div>
          {todo.length === 0 ? (
            <p className="rounded-xl bg-success-bg p-3 text-sm text-success">All assigned problems verified. Nice consistency — ask a professor for stretch work.</p>
          ) : (
            <ul className="grid gap-2">
              {todo.map((a) => {
                const p = a.problem ?? problemById(a.problemId);
                return (
                  <li key={a.id}>
                    <Link to={`/app/problems/${a.problemId}`} className="block min-w-0 rounded-xl border border-border p-3 transition hover:border-primary/50 hover:bg-primary-subtle/40">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={a.type === "COMMON" ? "info" : "neutral"}>{a.type === "COMMON" ? "Common" : "Individual"}</Badge>
                        <Badge tone={a.status === "NEEDS_REVIEW" ? "warning" : a.status === "IN_PROGRESS" ? "info" : "neutral"}>
                          {a.status === "VERIFIED" ? "Verified" : a.status === "NEEDS_REVIEW" ? "Needs review" : a.status === "IN_PROGRESS" ? "In progress" : "Not started"}
                        </Badge>
                        <span className="tnum ml-auto text-xs text-muted">due {formatDate(a.dueAt)}</span>
                      </div>
                      <p className="mt-1 truncate font-semibold">{p?.title ?? a.title ?? "Assignment"}</p>
                      <p className="truncate text-[13px] text-muted">{a.title}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
