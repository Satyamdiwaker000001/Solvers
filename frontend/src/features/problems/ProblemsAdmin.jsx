import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { getProblems, saveProblem, getAdminAssignments, createAssignment, getStudents, isLiveMode } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Field, TextInput, TextArea, Select } from "../../components/ui/Field.jsx";
import { Dialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../hooks/useToast.js";
import { formatDate } from "../../lib/format.js";

const TOPICS = ["Arrays", "Binary Search", "Stacks", "Sliding Window", "Linked List", "Graphs", "Dynamic Programming", "Trees"];

export function ProblemsAdminPage() {
  const [state, setState] = useState({ loading: true, error: null, items: [], linked: [] });
  const [assignOpen, setAssignOpen] = useState(null);
  const toast = useToast();

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([getProblems(), getAdminAssignments()])
      .then(([p, a]) => live && setState({ loading: false, error: null, items: p.data, linked: a.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [], linked: [] }));
    return () => { live = false; };
  }, [attempt]);

  const reload = () => {
    setState({ loading: true, error: null, items: [], linked: [] });
    setAttempt((a) => a + 1);
  };

  if (state.loading) return <LoadingState label="Loading problem catalog…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={reload} />;

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
            const linked = state.linked.filter((a) => a.problemId === p.id);
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
          onDone={(msg) => { setAssignOpen(null); toast.push({ title: "Assignment recorded", body: msg }); reload(); }} />
      )}
    </div>
  );
}

function AssignDialog({ problem, onClose, onDone }) {
  const [scope, setScope] = useState("COMMON");
  const [due, setDue] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selected, setSelected] = useState([]);
  const [students, setStudents] = useState({ loading: true, error: null, items: [] });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const live = isLiveMode();

  useEffect(() => {
    let cancelled = false;
    getStudents()
      .then((r) => {
        if (!cancelled) setStudents({ loading: false, error: null, items: r.data });
      })
      .catch((e) => {
        if (!cancelled) setStudents({ loading: false, error: e.message, items: [] });
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = (dbId) => {
    setSelected((s) => (s.includes(dbId) ? s.filter((x) => x !== dbId) : [...s, dbId]));
  };

  const confirm = async () => {
    if (scope === "INDIVIDUAL" && selected.length === 0) {
      setFailed("Select at least one approved student for an individual assignment.");
      return;
    }
    if (instructions.length > 5000) {
      setFailed("Instructions are too long (max 5000 characters).");
      return;
    }
    let dueAt = null;
    if (due) {
      const parsed = new Date(`${due}T23:59:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        setFailed("The due date is not a valid calendar date.");
        return;
      }
      dueAt = parsed.toISOString();
    }
    setBusy(true);
    setFailed(null);
    try {
      const created = await createAssignment({
        problemId: problem.id,
        type: scope,
        title: "",
        dueAt,
        instructions,
        studentIds: scope === "INDIVIDUAL" ? selected : [],
      });
      const count = created.data?.targetCount ?? selected.length;
      onDone(`${problem.title} → ${scope} (${count} student${count === 1 ? "" : "s"})${dueAt ? `, due ${formatDate(dueAt)}` : ""}`);
    } catch (err) {
      setFailed(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Assign “${problem.title}”`} description="Common reaches every approved student. Individual targets one or more selected students." onClose={onClose}>
      <div className="grid gap-3">
        <Field label="Scope" htmlFor="scope">
          <Select id="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="COMMON">Common — whole class</option>
            <option value="INDIVIDUAL">Individual — selected students</option>
          </Select>
        </Field>
        {scope === "COMMON" && (
          <p className="rounded-xl bg-canvas p-3 text-[13px] text-muted" role="status">
            {students.loading
              ? "Counting approved students…"
              : `Will reach all ${students.items.length} approved student${students.items.length === 1 ? "" : "s"}.`}
          </p>
        )}
        {scope === "INDIVIDUAL" && (
          <Field label="Students" htmlFor="student-pick-0" required hint="Only approved students can be assigned work.">
            {students.loading ? (
              <LoadingState label="Loading students…" lines={2} />
            ) : students.items.length === 0 ? (
              <EmptyState title="No approved students" body={students.error || "Approve students before creating individual assignments."} />
            ) : (
              <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-border p-2">
                {students.items.map((s, i) => {
                  const dbId = s.dbId || s.id;
                  const checked = selected.includes(dbId);
                  return (
                    <li key={dbId}>
                      <label htmlFor={`student-pick-${i}`} className="flex cursor-pointer items-center gap-2.5 rounded-lg p-2 hover:bg-canvas">
                        <input
                          id={`student-pick-${i}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(dbId)}
                          className="size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{s.displayName}</span>
                          <span className="mono block truncate text-xs text-muted">@{s.githubLogin} · {s.studentId || s.id}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Field>
        )}
        <Field label="Due date (optional)" htmlFor="due"><TextInput id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <Field label="Instructions (optional)" htmlFor="instr" hint="Shown to the assigned students alongside the problem.">
          <TextArea id="instr" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Push your solution under arrays/ in your folder." />
        </Field>
        {!live && (
          <p className="rounded-xl bg-canvas p-3 text-[13px] text-muted">Demo only: assignments are acknowledged locally. Connect the backend to persist them.</p>
        )}
        {failed && <p role="alert" className="rounded-xl bg-danger-bg/60 p-3 text-sm font-medium text-danger">{failed}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button tone="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button loading={busy} onClick={confirm}>Confirm assignment</Button>
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
    let cancelled = false;
    getProblems().then((r) => {
      if (cancelled) return;
      const p = r.data.find((x) => x.id === id);
      if (p) setForm({ ...emptyForm, ...p, examples: (p.examples ?? []).join("\n"), constraints: (p.constraints ?? []).join("\n") });
      setLoaded(true);
    });
    return () => { cancelled = true; };
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
      toast.push({ title: isNew ? "Problem created" : "Problem updated", body: `${saved.data.title} is saved${isLiveMode() ? " on the server" : " locally for this session"}.` });
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
