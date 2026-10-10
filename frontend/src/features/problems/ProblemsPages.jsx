import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink, FolderGit2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { getStudentAssignments, getProblems } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Badge, VerificationBadge } from "../../components/ui/Badge.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { Field, Select, TextInput } from "../../components/ui/Field.jsx";
import { formatDate } from "../../lib/format.js";

const DEFAULT_REPO_NAME = "Satyamdiwaker000001/DSA_Batch_2027";
const DEFAULT_REPO_BRANCH = "main";

function statusBadge(status) {
  if (status === "VERIFIED") return <VerificationBadge outcome="VERIFIED" />;
  if (status === "NEEDS_REVIEW") return <VerificationBadge outcome="NEEDS_REVIEW" />;
  if (status === "IN_PROGRESS") return <Badge tone="info">In progress</Badge>;
  return <Badge tone="neutral">Not started</Badge>;
}

export function ProblemsPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getStudentAssignments(user.studentId)
      .then((r) => live && setState({ loading: false, error: null, items: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [] }));
    return () => { live = false; };
  }, [user.studentId, attempt]);

  const items = useMemo(() => state.items.filter((a) => {
    const p = a.problem || { title: a.title, topic: a.topic || "Practice" };
    const q = query.trim().toLowerCase();
    const matchQ = !q || (p?.title || "").toLowerCase().includes(q) || (p?.topic || "").toLowerCase().includes(q);
    const matchF = filter === "ALL" || (filter === "TODO" ? a.status !== "VERIFIED" : filter === "DONE" ? a.status === "VERIFIED" : a.type === filter);
    return matchQ && matchF;
  }), [state.items, query, filter]);

  if (state.loading) return <LoadingState label="Loading assigned problems…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, items: [] }); setAttempt((a) => a + 1); }} />;

  return (
    <div className="grid gap-4">
      <PageHeader title="Assigned problems" description="Class work and individual problem assignments." />
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Field label="Search" htmlFor="q"><TextInput id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or topic…" /></Field>
        </div>
        <div className="w-full sm:w-52">
          <Field label="Show" htmlFor="f">
            <Select id="f" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">Everything</option>
              <option value="TODO">To finish</option>
              <option value="DONE">Verified</option>
              <option value="COMMON">Common only</option>
              <option value="INDIVIDUAL">Individual only</option>
            </Select>
          </Field>
        </div>
      </Card>
      {items.length === 0 ? (
        <EmptyState title="No problems match" body="Try adjusting your search or filters." />
      ) : (
        <>
          {/* Cards on narrow, table on wide */}
          <ul className="grid gap-3 lg:hidden">
            {items.map((a) => {
              const p = a.problem || { title: a.title || "Problem", topic: "Practice", difficulty: "Standard" };
              return (
                <li key={a.id}>
                  <Link to={`/app/problems/${a.problemId || a.id}`} className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/50 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={a.type === "COMMON" ? "info" : "neutral"}>{a.type === "COMMON" ? "Common" : "Individual"}</Badge>
                      {statusBadge(a.status)}
                    </div>
                    <p className="mt-1.5 font-bold truncate">{p?.problemCode && <span className="mono mr-1.5 text-xs text-primary">{p.problemCode}</span>}{p?.title ?? "Problem"}</p>
                    <p className="mono mt-1 truncate text-[11px] text-muted">File: students/{user.studentId}/{String(p?.topic || "topic").toLowerCase().replace(/[^a-z0-9]+/g, "-")}/{p?.problemCode || "problem"}-solution.ext</p>
                    <p className="text-[13px] text-muted truncate">{p?.topic} · {p?.difficulty} · due {formatDate(a.dueAt)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Card className="hidden p-0 lg:block">
            <div className="table-scroll">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Problem</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => {
                    const p = a.problem || { title: a.title || "Problem", topic: "Practice", difficulty: "Standard" };
                    return (
                      <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-canvas/60">
                        <td className="px-4 py-3">
                          <Link to={`/app/problems/${a.problemId || a.id}`} className="font-semibold text-primary hover:underline">{p?.problemCode && <span className="mono mr-1.5 text-xs">{p.problemCode}</span>}{p?.title ?? "Problem"}</Link>
                          <p className="text-[13px] text-muted">{p?.topic} · {p?.difficulty}</p>
                        </td>
                        <td className="px-4 py-3"><Badge tone={a.type === "COMMON" ? "info" : "neutral"}>{a.type}</Badge></td>
                        <td className="px-4 py-3">{statusBadge(a.status)}</td>
                        <td className="tnum px-4 py-3 text-muted">{formatDate(a.dueAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export function ProblemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, items: [], catalog: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([getStudentAssignments(user.studentId), getProblems()])
      .then(([a, c]) => live && setState({ loading: false, error: null, items: a.data, catalog: c.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [], catalog: [] }));
    return () => { live = false; };
  }, [user.studentId, attempt]);

  if (state.loading) return <LoadingState label="Loading problem…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, items: [], catalog: [] }); setAttempt((a) => a + 1); }} />;

  const problem = state.catalog.find((p) => p.id === id)
    ?? state.items.find((a) => a.problemId === id || a.id === id)?.problem
    ?? null;

  if (!problem) return <EmptyState title="Problem not found" body="The problem could not be found or has not been assigned." />;
  const assignment = state.items.find((a) => a.problemId === id || a.id === id);

  return (
    <div className="grid gap-4">
      <Link to="/app/problems" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft aria-hidden="true" className="size-4" /> All problems</Link>
      <PageHeader
        title={problem.title}
        description={`${problem.topic || "DSA"} · ${problem.difficulty || "Standard"} · ${problem.id || id}`}
        actions={assignment ? statusBadge(assignment.status) : <Badge tone="neutral">Not assigned</Badge>}
      />
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <h2 className="section-title">Statement</h2>
          <p className="mt-1 text-[15px] leading-relaxed">{problem.statement || "No statement text provided."}</p>
          {problem.examples?.length > 0 && (
            <><h3 className="mt-4 text-sm font-bold">Examples</h3>
            <ul className="mt-1 grid gap-1.5">{problem.examples.map((e, i) => <li key={i} className="mono rounded-lg bg-canvas p-2.5 break-all">{e}</li>)}</ul></>
          )}
          {problem.constraints?.length > 0 && (
            <><h3 className="mt-4 text-sm font-bold">Constraints</h3>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted">{problem.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul></>
          )}
          {problem.sourceUrl && <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">Source reference <ExternalLink aria-hidden="true" className="size-3.5" /></a>}
        </Card>
        <div className="grid content-start gap-4 xl:col-span-2">
          <Card>
            <h2 className="section-title">How to submit</h2>
            <ol className="mt-2 grid gap-2 text-sm text-muted">
              <li className="flex gap-2"><FolderGit2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><span>Push to <span className="mono break-all">{DEFAULT_REPO_NAME}/{user.folder || (user.studentId ? `students/${user.studentId}` : "students/…")}</span> on branch <span className="mono">{DEFAULT_REPO_BRANCH}</span>.</span></li>
              <li className="flex gap-2"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><span>{assignment ? `Due ${formatDate(assignment.dueAt)} · ${assignment.title}` : "No active assignment for this problem."}</span></li>
            </ol>
            <p className="mt-2 text-[13px] text-muted">Verification runs automatically against automated test suites and validation rubrics.</p>
          </Card>
          <Card>
            <h2 className="section-title">Your evidence</h2>
            {!assignment || assignment.submissions.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No commits recorded for this problem yet.</p>
            ) : (
              <ul className="mt-2 grid gap-2">{assignment.submissions.map((s) => <li key={s.id}><EvidencePanel submission={s} /></li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
