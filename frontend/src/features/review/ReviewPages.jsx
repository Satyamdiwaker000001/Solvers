import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getReviewQueue, recordReview } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Field, TextArea, Select } from "../../components/ui/Field.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { VerificationBadge } from "../../components/ui/Badge.jsx";
import { useToast } from "../../hooks/useToast.js";
import { studentById, assignmentById, problemById } from "../../mocks/data.js";

export function ReviewQueuePage() {
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getReviewQueue()
      .then((r) => live && setState({ loading: false, error: null, items: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [] }));
    return () => { live = false; };
  }, [attempt]);

  if (state.loading) return <LoadingState label="Loading review queue…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, items: [] }); setAttempt((a) => a + 1); }} />;

  return (
    <div className="grid gap-4">
      <PageHeader title="Review queue" description="Ambiguous evidence waits for a human here. Similarity signals are supporting context — they never prove misconduct (BR-08). Confirm only after inspecting the evidence." />
      {state.items.length === 0 ? (
        <EmptyState title="Nothing to review" body="Flagged, failed, or pending evidence will appear here with its supporting context." />
      ) : (
        <ul className="grid gap-3">
          {state.items.map((s) => {
            const st = studentById(s.studentId);
            const a = assignmentById(s.assignmentId);
            const p = a ? problemById(a.problemId) : null;
            const who = s.studentName || st?.displayName || s.studentId;
            const what = s.problemTitle || p?.title || s.assignmentTitle || s.assignmentId;
            return (
              <li key={s.id}>
                <Card>
                  <div className="flex flex-wrap items-center gap-2">
                    <VerificationBadge outcome={s.outcome} />
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{who} · {what}</p>
                  </div>
                  <div className="mt-2"><EvidencePanel submission={s} /></div>
                  <Link to={`/admin/review/${s.id}`} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-canvas">Open review</Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ReviewDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState("accept");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getReviewQueue()
      .then((r) => {
        if (!cancelled) setItem(r.data.find((s) => s.id === id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingState label="Loading evidence…" lines={3} />;
  if (!item) return <EmptyState title="Review item not found" body="It may already have been decided." action={<Button tone="secondary" onClick={() => nav("/admin/review")}>Back to queue</Button>} />;

  const st = studentById(item.studentId);
  const a = assignmentById(item.assignmentId);
  const p = a ? problemById(a.problemId) : null;
  const who = item.studentName || st?.displayName || item.studentId;
  const whoLogin = item.studentLogin || st?.githubLogin || "";
  const what = item.problemTitle || p?.title || item.assignmentTitle || a?.title || item.assignmentId;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await recordReview(item.id, decision, comment);
      toast.push({ title: decision === "accept" ? "Evidence accepted" : "Sent back for more evidence", body: `${item.id} decided and audit-logged.` });
      nav("/admin/review");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4">
      <Link to="/admin/review" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft aria-hidden="true" className="size-4" /> Review queue</Link>
      <PageHeader title={`Review ${item.id}`} description={`${who} (@${whoLogin}) · ${what}`} actions={<VerificationBadge outcome={item.outcome} />} />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3"><EvidencePanel submission={item} /></div>
        <Card className="h-fit xl:col-span-2">
          <h2 className="section-title">Decision</h2>
          <p className="mt-0.5 text-[13px] text-muted">Your decision is recorded in the audit log with your identity and timestamp.</p>
          <form onSubmit={submit} className="mt-3 grid gap-3">
            <Field label="Outcome" htmlFor="dec">
              <Select id="dec" value={decision} onChange={(e) => setDecision(e.target.value)}>
                <option value="accept">Accept as verified</option>
                <option value="sendback">Send back — needs more evidence</option>
              </Select>
            </Field>
            <Field label="Reviewer comment" htmlFor="com" hint="Explain what you saw in the evidence.">
              <TextArea id="com" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Pivot logic matches class boilerplate but includes independent edge-case handling…" />
            </Field>
            {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
            <Button type="submit" loading={busy}>Record decision</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
