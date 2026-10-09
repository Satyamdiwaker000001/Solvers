import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentSubmissions } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { VerificationBadge } from "../../components/ui/Badge.jsx";
import { CENTRAL_REPO, assignmentById, problemById } from "../../mocks/data.js";
import { formatDateTime } from "../../lib/format.js";

const OUTCOMES = ["ALL", "VERIFIED", "NEEDS_REVIEW", "INCOMPLETE", "CHECK_FAILED", "INGESTION_PENDING"];

export function ActivityPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [filter, setFilter] = useState("ALL");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getStudentSubmissions(user.studentId)
      .then((r) => live && setState({ loading: false, error: null, items: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [] }));
    return () => { live = false; };
  }, [user.studentId, attempt]);

  if (state.loading) return <LoadingState label="Loading GitHub activity…" lines={4} />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, items: [] }); setAttempt((a) => a + 1); }} />;

  const items = state.items.filter((s) => filter === "ALL" || s.outcome === filter);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="GitHub activity"
        description={`Evidence observed in ${CENTRAL_REPO.fullName} for your folder. The repository is evidence, not infallible proof — verification maps each change to a known problem before it counts.`}
      />
      <Card>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by verification outcome">
          {OUTCOMES.map((o) => (
            <button key={o} type="button" onClick={() => setFilter(o)}
              aria-pressed={filter === o}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === o ? "border-primary bg-primary-subtle text-primary" : "border-border text-muted hover:bg-canvas"}`}>
              {o === "ALL" ? "All" : o.replace("_", " ").toLowerCase()}
            </button>
          ))}
        </div>
      </Card>
      {items.length === 0 ? (
        <EmptyState title={filter === "ALL" ? "No activity yet" : "Nothing with this outcome"}
          body={filter === "ALL" ? "Push a solution to your folder on the central repository and it will appear here after ingestion." : "Try a different outcome filter."} />
      ) : (
        <ol className="relative grid gap-3 border-l-2 border-border pl-4 sm:pl-6">
          {items.map((s) => {
            const a = assignmentById(s.assignmentId);
            const p = a ? problemById(a.problemId) : null;
            return (
              <li key={s.id} className="relative">
                <span aria-hidden="true" className="absolute -left-[21px] top-4 size-3 rounded-full border-2 border-surface bg-primary sm:-left-[29px]" />
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <VerificationBadge outcome={s.outcome} />
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{p?.title ?? s.assignmentId}</p>
                    <span className="tnum text-xs text-muted">{formatDateTime(s.observedAt)}</span>
                  </div>
                  <div className="mt-2"><EvidencePanel submission={s} /></div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
