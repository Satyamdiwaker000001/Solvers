import { useEffect, useState } from "react";
import { TriangleAlert, CheckCircle2, History } from "lucide-react";
import { getIntegrationStatus, getAuditLog } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { formatDateTime } from "../../lib/format.js";

export function IntegrationPage() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getIntegrationStatus()
      .then((r) => live && setState({ loading: false, error: null, data: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, data: null }));
    return () => { live = false; };
  }, [attempt]);

  if (state.loading) return <LoadingState label="Checking integration health…" lines={3} />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, data: null }); setAttempt((a) => a + 1); }} />;

  const d = state.data;
  return (
    <div className="grid gap-4">
      <PageHeader title="GitHub integration" description="Central repository configuration, webhook health, and worker status. Failures surface here — never as fake verified success." />
      <Card className={`flex gap-2.5 text-sm ${d.status === "HEALTHY" ? "border-success/30 bg-success-bg/40" : "border-warning/30 bg-warning-bg/50"}`} role="status">
        {d.status === "HEALTHY" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" /> : <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />}
        <div><p className="font-bold">{d.status === "HEALTHY" ? "All systems normal" : "Degraded — see details"}</p><p className="text-muted">{d.message}</p></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="section-title">Repository</h2>
          <dl className="mt-2 grid gap-1.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted">Full name</dt><dd className="mono">{d.repo.fullName}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Branch</dt><dd className="mono">{d.repo.branch}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Folder root</dt><dd className="mono">{d.repo.folderRoot}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Last sync</dt><dd className="tnum">{formatDateTime(d.lastSync)}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="section-title">Worker queue</h2>
          <dl className="mt-2 grid gap-1.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted">Depth</dt><dd className="tnum font-bold">{d.queue.depth} jobs</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Oldest job age</dt><dd className="tnum">{d.queue.oldestAgeSec}s</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Dead-letter</dt><dd className="tnum">{d.queue.deadLetter}</dd></div>
          </dl>
          <p className="mt-2 text-[13px] text-muted">Pending evidence shows <Badge tone="info">Analysis pending</Badge> — never verified.</p>
        </Card>
      </div>
    </div>
  );
}

export function AuditPage() {
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getAuditLog()
      .then((r) => live && setState({ loading: false, error: null, items: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, items: [] }));
    return () => { live = false; };
  }, [attempt]);

  if (state.loading) return <LoadingState label="Loading audit log…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, items: [] }); setAttempt((a) => a + 1); }} />;

  return (
    <div className="grid gap-4">
      <PageHeader title="Audit log" description="Approval, assignment, and review decisions with actor, action, target, and timestamp (FR-AUD-02). Students cannot modify these records." />
      {state.items.length === 0 ? (
        <EmptyState title="No audit records" body="Admin actions will be recorded here." icon={History} />
      ) : (
        <Card className="p-0">
          <div className="table-scroll">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Detail</th>
              </tr></thead>
              <tbody>
                {state.items.map((a) => (
                  <tr key={a.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="tnum whitespace-nowrap px-4 py-3 text-muted">{formatDateTime(a.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{a.actor}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{a.action}</Badge></td>
                    <td className="mono px-4 py-3 text-xs">{a.targetType}/{a.targetId}</td>
                    <td className="min-w-52 px-4 py-3 text-muted">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
