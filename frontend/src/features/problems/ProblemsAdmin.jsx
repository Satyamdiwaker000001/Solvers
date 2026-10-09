import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { getProblems, saveProblem } from "../../services/api.js";
import { assignments } from "../../mocks/data.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Field, TextInput, TextArea, Select } from "../../components/ui/Field.jsx";
import { Dialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { formatDate } from "../../lib/format.js";

const TOPICS = ["Arrays", "Binary Search", "Stacks", "Sliding Window", "Linked List", "Graphs", "Dynamic Programming", "Trees"];

export function ProblemsAdminPage() {
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [assignOpen, setAssignOpen] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let live = true;
    getProblems()
      .then((r) => live && setState({ loading: false, error: null, items: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [] }));
    return () => { live = false; };
  }, []);

  if (state.loading) return <LoadingState label="Loading problem catalog…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => window.location.reload()} />;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Problems"
        description="Create, publish, and assign problem statements. Common assignments reach the whole class; individual ones stay visible only to their targets (BR-05)."
        actions={<Link to="/admin/problems/new" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong"><Plus aria-hidden="true" className="size-4" /> New problem</Link>}
      />
      {state.items.length === 0 ? (
        <EmptyState title="No problems yet" body="Create the first problem statement to start the class catalog."
          action={<Link to="/admin/problems/new" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Create problem</Link>} />
      ) : (
        <ul className="grid gap-3">
          {state.items.map((p) => {
            const linked = assignments.filter((a) => a.problemId === p.id);
            return (
              <li key={p.id}>
                <Card>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={p.status === "PUBLISHED" ? "success" : "neutral"}>{p.status}</Badge>
                    <Badge tone="info">{p.topic}</Badge>
                    <Badge tone={p.difficulty === "Hard" ? "danger" : p.difficulty === "Medium" ? "warning" : "success"}>{p.difficulty}</Badge>
                    <span className="tnum ml-auto text-xs text-muted">{p.id}</span>
                  </div>
                  <p className="mt-1.5 font-bold">{p.title}</p>
                  <p className="line-clamp-2 text-sm text-muted">{p.statement}</p>
                  <p className="tnum mt-1 text-xs text-muted">
                    {linked.length === 0 ? "Not assigned yet" : linked.map((a) => `${a.id} · ${a.type} · due ${formatDate(a.dueAt)}`).join("  ·  ")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/admin/problems/${p.id}/edit`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-canvas"><Pencil aria-hidden="true" className="size-4" /> Edit</Link>
                    <Button tone="secondary" onClick={() => { setAssignOpen(p); }}>Assign…</Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {assignOpen && (
        <AssignDialog problem={assignOpen} onClose={() => setAssignOpen(null)}
          onDone={(msg) => { setAssignOpen(null); toast.push({ title: "Assignment recorded (demo)", body: msg }); }} />
      )}
    </div>
  );
}

function AssignDialog({ problem, onClose, onDone }) {
  const [scope, setScope] = useState("COMMON");
  const [due, setDue] = useState("2026-10-20");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={`Assign “${problem.title}”`} description="Common reaches every approved student. Individual targets one or more selected students." onClose={onClose}>
      <div className="grid gap-3">
        <Field label="Scope" htmlFor="scope">
          <Select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="COMMON">Common — whole class</option>
            <option value="INDIVIDUAL">Individual — selected students</option>
          </Select>
        </Field>
        <Field label="Due date" htmlFor="due"><TextInput id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <p className="rounded-xl bg-canvas p-3 text-[13px] text-muted">Demo only: assignment is acknowledged in a toast and audit-logged locally. Real targeting rules (FR-PS-05) will be enforced by the backend.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button loading={busy} onClick={() => { setBusy(true); setTimeout(() => onDone(`${problem.id} → ${scope}, due ${due}`), 500); }}>Confirm assignment</Button>
        </div>
      </div>
    </Dialog>
  );
}

const emptyForm = { title: "", topic: "Arrays", difficulty: "Easy", statement: "", examples: "", constraints: "", sourceUrl: "", status: "DRAFT" };

export function ProblemFormPage() {
  const { id } = useParams();
  const isNew = !id || id === undefined;
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loaded, setLoaded] = useState(isNew);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);

  useEffect(() => {
    if (isNew) return;
    getProblems().then((r) => {
      const p = r.data.find((x) => x.id === id);
      if (p) setForm({ ...emptyForm, ...p, examples: (p.examples ?? []).join("\n"), constraints: (p.constraints ?? []).join("\n") });
      setLoaded(true);
    });
  }, [id, isNew]);

  if (!loaded) return <LoadingState label="Loading problem…" lines={2} />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.title.trim().length < 4) errs.title = "Give the problem a clear title (min 4 characters).";
    if (form.statement.trim().length < 20) errs.statement = "The statement needs enough detail for students (min 20 characters).";
    if (form.sourceUrl && !/^https?:\/\//.test(form.sourceUrl)) errs.sourceUrl = "Source URL must start with http(s)://.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setFailed("Please fix the highlighted fields."); return; }
    setBusy(true); setFailed(null);
    try {
      const payload = { ...form, examples: form.examples.split("\n").map((s) => s.trim()).filter(Boolean), constraints: form.constraints.split("\n").map((s) => s.trim()).filter(Boolean) };
      const saved = await saveProblem(payload, isNew ? undefined : id);
      toast.push({ title: isNew ? "Problem created (demo)" : "Problem updated (demo)", body: `${saved.data.id} saved locally for this session.` });
      nav("/admin/problems");
    } catch (err) {
      setFailed(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4">
      <Link to="/admin/problems" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary"><ArrowLeft aria-hidden="true" className="size-4" /> Problems</Link>
      <PageHeader title={isNew ? "New problem" : `Edit ${form.id ?? ""}`} description="Title and statement are required. Publishing rules for assignments with existing submissions are still an open decision — editing here never rewrites history silently." />
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Card className="grid gap-4">
          {failed && <p role="alert" className="rounded-xl bg-danger-bg/60 p-3 text-sm font-medium text-danger">{failed}</p>}
          <Field label="Title" htmlFor="t" required error={errors.title}>
            <TextInput id="t" value={form.title} onChange={set("title")} placeholder="e.g. Two Sum" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Topic" htmlFor="topic"><Select id="topic" value={form.topic} onChange={set("topic")}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Difficulty" htmlFor="dif"><Select id="dif" value={form.difficulty} onChange={set("difficulty")}><option>Easy</option><option>Medium</option><option>Hard</option></Select></Field>
            <Field label="Status" htmlFor="st"><Select id="st" value={form.status} onChange={set("status")}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></Select></Field>
          </div>
          <Field label="Problem statement" htmlFor="ps" required error={errors.statement} hint="Full text students will read.">
            <TextArea id="ps" value={form.statement} onChange={set("statement")} placeholder="Describe the task, input/output, and edge cases…" />
          </Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Examples (one per line)" htmlFor="ex"><TextArea id="ex" rows={3} value={form.examples} onChange={set("examples")} placeholder="Input: … → Output: …" /></Field>
            <Field label="Constraints (one per line)" htmlFor="co"><TextArea id="co" rows={3} value={form.constraints} onChange={set("constraints")} /></Field>
          </div>
          <Field label="Source URL (optional)" htmlFor="url" error={errors.sourceUrl}><TextInput id="url" value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://…" inputMode="url" /></Field>
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="secondary" type="button" onClick={() => nav("/admin/problems")}>Cancel</Button>
          <Button type="submit" loading={busy}>{isNew ? "Create problem" : "Save changes"}</Button>
        </div>
      </form>
    </div>
  );
}
