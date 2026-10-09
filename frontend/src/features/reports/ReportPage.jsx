import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentOverview, getStudentSubmissions } from "../../services/api.js";
import { PageHeader, StatCard, Card } from "../../components/ui/Card.jsx";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
import { VerificationBadge } from "../../components/ui/Badge.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { assignmentById, problemById } from "../../mocks/data.js";
import { BookOpenCheck, GitCommitHorizontal, ScanSearch, ShieldCheck } from "lucide-react";

export function ReportPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, overview: null, items: [] });

  useEffect(() => {
    let live = true;
    Promise.all([getStudentOverview(user.studentId), getStudentSubmissions(user.studentId)])
      .then(([o, s]) => live && setState({ loading: false, error: null, overview: o.data, items: s.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, overview: null, items: [] }));
    return () => { live = false; };
  }, [user.studentId]);

  if (state.loading) return <LoadingState label="Compiling your progress report…" lines={5} />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => window.location.reload()} />;

  const groups = ["VERIFIED", "NEEDS_REVIEW", "INCOMPLETE", "CHECK_FAILED", "INGESTION_PENDING"]
    .map((o) => ({ outcome: o, items: state.items.filter((s) => s.outcome === o) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="My progress report"
        description="Generated from repository evidence. Reports distinguish verified, pending review, failed checks, and insufficient evidence (FR-PROG-07). Similarity flags are review signals — never accusations (NFR-FAIR-01)."
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Verified problems" value={state.overview.verified} sub="Distinct, verified" icon={BookOpenCheck} tone="text-success" />
        <StatCard label="Evidence commits" value={state.overview.totalCommitsEvidence} sub="Not a solved count" icon={GitCommitHorizontal} />
        <StatCard label="Needs review" value={state.overview.needsReview} sub="Awaiting professor" icon={ScanSearch} tone="text-warning" />
        <StatCard label="Policy" value="Strict" sub="Commit ≠ solved (BR-06)" icon={ShieldCheck} />
      </div>
      {groups.map((g) => (
        <section key={g.outcome} aria-label={`${g.outcome} evidence`}>
          <div className="mb-2 flex items-center gap-2">
            <VerificationBadge outcome={g.outcome} />
            <span className="tnum text-sm text-muted">{g.items.length} item(s)</span>
          </div>
          <ul className="grid gap-3">
            {g.items.map((s) => {
              const a = assignmentById(s.assignmentId);
              const p = a ? problemById(a.problemId) : null;
              return (
                <li key={s.id}>
                  <Card>
                    <p className="font-bold">{p?.title ?? s.assignmentId} <span className="font-normal text-muted">· {a?.title}</span></p>
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
