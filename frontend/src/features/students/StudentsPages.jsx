import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getStudents, getStudentReport } from "../../services/api.js";
import { PageHeader, Card, StatCard } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Field, TextInput } from "../../components/ui/Field.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { VerificationBadge } from "../../components/ui/Badge.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";

export function StudentsPage() {
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [q, setQ] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getStudents()
      .then((r) => live && setState({ loading: false, error: null, items: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [] }));
    return () => { live = false; };
  }, [attempt]);

  if (state.loading) return <LoadingState label="Loading students…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, items: [] }); setAttempt((a) => a + 1); }} />;

  const query = q.trim().toLowerCase();
  const items = state.items.filter((s) => !query || s.displayName.toLowerCase().includes(query) || s.githubLogin.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));

  return (
    <div className="grid gap-4">
      <PageHeader title="Students" description="Approved students mapped to verified GitHub identities and central repository folders." />
      <Card><Field label="Search students" htmlFor="sq"><TextInput id="sq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, @login, or STU-ID…" /></Field></Card>
      {items.length === 0 ? (
        <EmptyState title="No students match" body="Try a different search." />
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2 xl:hidden">
            {items.map((s) => (
              <li key={s.id}>
                <Link to={`/admin/students/${s.id}`} className="block rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/50 min-w-0">
                  <div className="flex items-center gap-2"><Avatar src={s.avatarUrl} name={s.displayName} className="size-9 shrink-0 rounded-full border border-border object-cover text-center text-xs font-bold leading-9 text-primary" /><p className="font-bold truncate">{s.displayName}</p></div>
                  <p className="mono text-xs text-muted truncate">@{s.githubLogin} · {s.studentId || s.id}</p>
                  <p className="tnum mt-1 text-[13px] text-muted">{s.verified} verified · {s.evidence} evidence · {s.flags} flags</p>
                </Link>
              </li>
            ))}
          </ul>
          <Card className="hidden p-0 xl:block">
            <div className="table-scroll">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Student</th><th className="px-4 py-3">Mapping</th>
                  <th className="px-4 py-3 text-right">Verified</th><th className="px-4 py-3 text-right">Evidence</th><th className="px-4 py-3 text-right">Flags</th>
                </tr></thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-canvas/60">
                      <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar src={s.avatarUrl} name={s.displayName} className="size-8 shrink-0 rounded-full border border-border object-cover text-center text-xs font-bold leading-8 text-primary" /><div><Link to={`/admin/students/${s.id}`} className="font-semibold text-primary hover:underline">{s.displayName}</Link><p className="text-[13px] text-muted">{s.streakDays != null ? `${s.streakDays}-day streak` : "Active days n/a"}</p></div></div></td>
                      <td className="px-4 py-3"><p className="mono text-xs">@{s.githubLogin}</p><p className="mono text-xs text-muted">{s.studentId || s.id} · {s.folder}</p></td>
                      <td className="tnum px-4 py-3 text-right font-bold">{s.verified}</td>
                      <td className="tnum px-4 py-3 text-right">{s.evidence}</td>
                      <td className="tnum px-4 py-3 text-right">{s.flags > 0 ? <Badge tone="warning">{s.flags} to review</Badge> : <span className="text-muted">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export function StudentDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getStudentReport(id)
      .then((r) => live && setState({ loading: false, error: null, data: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, data: null }));
    return () => { live = false; };
  }, [id, attempt]);

  if (state.loading) return <LoadingState label="Loading student report…" lines={4} />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, data: null }); setAttempt((a) => a + 1); }} />;
  if (!state.data?.student) return <EmptyState title="Student not found" body="Could not find student record with the specified ID." />;

  const { student, submissions, report } = state.data;
  const verified = new Set(submissions.filter((s) => s.eventType === "NEW_PROBLEM_VERIFIED").map((s) => s.assignmentId)).size;

  return (
    <div className="grid gap-4">
      <Link to="/admin/students" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft aria-hidden="true" className="size-4" /> Students</Link>
      <div className="flex items-center gap-3"><Avatar src={student.avatarUrl} name={student.displayName} className="size-14 shrink-0 rounded-full border-2 border-primary-subtle object-cover text-center text-lg font-bold leading-[52px] text-primary" /><PageHeader title={student.displayName} description={`@${student.githubLogin} · ${student.studentId || student.id} · ${student.folder || "Unassigned folder"}`} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Verified" value={verified} sub="Distinct problems" />
        <StatCard label="Evidence" value={submissions.length} sub={`${report?.totals?.pullRequests ?? 0} pull requests`} />
        <StatCard label="Flags" value={submissions.filter((s) => s.outcome === "NEEDS_REVIEW").length} sub="Needs review" />
        <StatCard label="Streak" value={student.streakDays != null ? `${student.streakDays}d` : "—"} sub="Active days" />
      </div>
      {report && <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Rolling progress report</h2><p className="mt-1 text-sm text-muted">Cumulative activity from every tracked commit and pull request.</p></div><div className="text-right"><b className="tnum block text-xl text-primary">{report.totals.targetDays}</b><span className="text-xs text-muted">target days met</span></div></div><div className="mt-4 grid gap-2">{report.series.slice(-7).map((item) => <div key={item.period} className="flex items-center gap-3 text-xs"><span className="tnum w-24 text-muted">{item.period}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><i className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.commits * 25)}%` }} /></span><b className="tnum w-20 text-right">{item.commits} commits</b></div>)}</div></Card>}
      <section className="grid gap-3">
        <h2 className="section-title">Evidence history</h2>
        {submissions.length === 0 ? <EmptyState title="No evidence yet" body="No submissions recorded for this student." /> : (
          <ul className="grid gap-3">
            {submissions.map((s) => {
              const title = s.problemTitle || s.assignmentTitle || s.path || s.assignmentId || "Submission";
              return (
                <li key={s.id}>
                  <Card>
                    <div className="flex flex-wrap items-center gap-2">
                      <VerificationBadge outcome={s.outcome} />
                      <p className="min-w-0 flex-1 truncate text-sm font-bold">{title}</p>
                    </div>
                    <div className="mt-2"><EvidencePanel submission={s} /></div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
