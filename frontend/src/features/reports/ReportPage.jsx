import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { getStudentOverview, getStudentSubmissions } from "../../services/api.js";
import { PageHeader, StatCard, Card } from "../../components/ui/Card.jsx";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
import { VerificationBadge } from "../../components/ui/Badge.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { BookOpenCheck, GitCommitHorizontal, ScanSearch, Clock } from "lucide-react";

export function ReportPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, overview: null, items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([getStudentOverview(user.studentId), getStudentSubmissions(user.studentId)])
      .then(([o, s]) => live && setState({ loading: false, error: null, overview: o.data, items: s.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, overview: null, items: [] }));
    return () => { live = false; };
  }, [user.studentId, attempt]);

  if (state.loading) return <LoadingState label="Compiling your progress report…" lines={5} />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, overview: null, items: [] }); setAttempt((a) => a + 1); }} />;

  const groups = ["VERIFIED", "NEEDS_REVIEW", "INCOMPLETE", "CHECK_FAILED", "INGESTION_PENDING"]
    .map((o) => ({ outcome: o, items: state.items.filter((s) => s.outcome === o) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="My progress report"
        description="Comprehensive summary of verified problems, submissions awaiting review, and automated check signals."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Verified problems" value={state.overview.verified} sub="Distinct verified" icon={BookOpenCheck} tone="text-success" />
        <StatCard label="GitHub activity" value={state.overview.totalCommitsEvidence} sub={`${state.overview.report?.totals?.pullRequests ?? 0} pull requests`} icon={GitCommitHorizontal} />
        <StatCard label="Needs review" value={state.overview.needsReview} sub="Awaiting instructor" icon={ScanSearch} tone="text-warning" />
        <StatCard label="Pending work" value={state.overview.pending ?? 0} sub="Incomplete assignments" icon={Clock} />
      </div>
      {state.overview.report && <Card className="border-primary/20 bg-primary-subtle/30"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Rolling report</p><p className="mt-1 text-sm text-muted">One cumulative report that grows after every tracked commit.</p></div><div className="flex gap-4 text-right"><div><b className="tnum block text-xl">{state.overview.report.totals.targetDays}</b><span className="text-xs text-muted">target days</span></div><div><b className="tnum block text-xl">{state.overview.report.dailyMinimum}</b><span className="text-xs text-muted">daily target</span></div></div></div><div className="mt-4 grid gap-2">{state.overview.report.series.slice(-7).map((item) => <div key={item.period} className="flex items-center gap-3 text-xs"><span className="tnum w-24 text-muted">{item.period}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><i className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (item.commits / Math.max(1, state.overview.report.dailyMinimum)) * 100)}%` }} /></span><b className="tnum w-16 text-right">{item.commits} commits</b></div>)}</div></Card>}
      {groups.map((g) => (
        <section key={g.outcome} aria-label={`${g.outcome} evidence`}>
          <div className="mb-2 flex items-center gap-2">
            <VerificationBadge outcome={g.outcome} />
            <span className="tnum text-sm text-muted">{g.items.length} item(s)</span>
          </div>
          <ul className="grid gap-3">
            {g.items.map((s) => {
              const title = s.problemTitle || s.assignmentTitle || s.path || s.assignmentId || "Submission";
              const subtitle = s.assignmentTitle && s.problemTitle !== s.assignmentTitle ? s.assignmentTitle : "";
              return (
                <li key={s.id}>
                  <Card>
                    <p className="font-bold break-all">{title} {subtitle && <span className="font-normal text-muted">· {subtitle}</span>}</p>
                    <div className="mt-2"><EvidencePanel submission={s} /></div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
