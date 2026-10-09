import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck } from "lucide-react";
import {
  getReviewQueue,
  recordReview,
  getStudents,
  assignStudentToSubmission,
} from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Field, TextArea, Select } from "../../components/ui/Field.jsx";
import { EvidencePanel } from "../../components/data-display/EvidencePanel.jsx";
import { VerificationBadge } from "../../components/ui/Badge.jsx";
import { useToast } from "../../hooks/useToast.js";

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
      <PageHeader
        title="Review queue"
        description="Submissions requiring instructor review. Inspect commits, diffs, and verification signals before recording a decision."
      />
      {state.items.length === 0 ? (
        <EmptyState title="Nothing to review" body="Flagged, failed, or pending evidence will appear here with its supporting context." />
      ) : (
        <ul className="grid gap-3">
          {state.items.map((s) => {
            const who = s.studentName || s.studentLogin || s.studentId || "Student";
            const what = s.problemTitle || s.assignmentTitle || s.path || s.assignmentId || "Submission";
            return (
              <li key={s.id}>
                <Card className="glass-panel border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <VerificationBadge outcome={s.outcome} />
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{who} · {what}</p>
                  </div>
                  <div className="mt-2"><EvidencePanel submission={s} /></div>
                  <Link to={`/admin/review/${s.id}`} className="mt-3 inline-flex min-h-11 w-full sm:w-auto justify-center items-center rounded-xl border border-white/10 bg-surface/60 px-4 py-2 text-sm font-semibold text-ink hover:border-primary/40 hover:bg-surface transition-all">Open review</Link>
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

  // Student and Assignment re-attribution state for unresolved evidence
  const [students, setStudents] = useState([]);
  const [assignStudentId, setAssignStudentId] = useState("");
  const [assigningStudent, setAssigningStudent] = useState(false);

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

  useEffect(() => {
    if (item && (!item.studentId || item.studentId === "UNKNOWN_STUDENT")) {
      getStudents().then((r) => setStudents(r.data || [])).catch(() => {});
    }
  }, [item]);

  if (loading) return <LoadingState label="Loading evidence…" lines={3} />;
  if (!item) return <EmptyState title="Review item not found" body="It may already have been decided." action={<Button tone="secondary" onClick={() => nav("/admin/review")}>Back to queue</Button>} />;

  const who = item.studentName || item.studentId || "Student";
  const whoLogin = item.studentLogin || "";
  const what = item.problemTitle || item.assignmentTitle || item.path || item.assignmentId || "Submission";

  const handleAssignStudent = async () => {
    if (!assignStudentId) return;
    setAssigningStudent(true);
    try {
      const res = await assignStudentToSubmission(item.id, assignStudentId);
      toast.push({ title: "Student mapped", body: `Assigned submission to student.` });
      setItem((curr) => ({ ...curr, ...res.data }));
    } catch (err) {
      toast.push({ tone: "danger", title: "Mapping failed", body: err.message });
    } finally {
      setAssigningStudent(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await recordReview(item.id, decision, comment);
      toast.push({
        title: decision === "accept" ? "Evidence accepted" : "Sent back for revision",
        body: `Decision recorded and audit log updated for ${item.id}.`,
      });
      nav("/admin/review");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Link to="/admin/review" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft aria-hidden="true" className="size-4" /> Review queue</Link>
      <PageHeader
        title={`Review ${item.id}`}
        description={`${who}${whoLogin ? ` (@${whoLogin})` : ""} · ${what}`}
        actions={<VerificationBadge outcome={item.outcome} />}
      />

      {/* Attribution resolution banner if student or assignment is unresolved */}
      {(!item.studentId || item.studentId === "UNKNOWN_STUDENT") && (
        <Card className="flex flex-col gap-3 border-warning/40 bg-warning-bg/40 sm:flex-row sm:items-end">
          <div className="flex-1">
            <p className="font-semibold text-warning-strong flex items-center gap-1.5"><UserCheck aria-hidden="true" className="size-4" /> Unresolved Student Attribution</p>
            <p className="text-xs text-muted mt-0.5">This commit could not be automatically mapped to a student folder.</p>
            <div className="mt-2">
              <Select id="resolve-student" value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)}>
                <option value="">Select student to attribute…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.displayName} (@{s.githubLogin})</option>
                ))}
              </Select>
            </div>
          </div>
          <Button loading={assigningStudent} disabled={!assignStudentId} onClick={handleAssignStudent} className="w-full sm:w-auto">
            Link Student
          </Button>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3"><EvidencePanel submission={item} /></div>
        <Card className="h-fit xl:col-span-2">
          <h2 className="section-title">Decision</h2>
          <p className="mt-0.5 text-[13px] text-muted">Your review decision is recorded in the permanent audit trail.</p>
          <form onSubmit={submit} className="mt-3 grid gap-3">
            <Field label="Outcome" htmlFor="dec">
              <Select id="dec" value={decision} onChange={(e) => setDecision(e.target.value)}>
                <option value="accept">Accept as verified</option>
                <option value="sendback">Send back — needs revision or more evidence</option>
              </Select>
            </Field>
            <Field label="Reviewer comment" htmlFor="com" hint="Provide feedback or justification.">
              <TextArea id="com" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Notes regarding solution logic, edge cases, or review rationale…" />
            </Field>
            {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
            <Button type="submit" loading={busy} className="w-full sm:w-auto">Record decision</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
