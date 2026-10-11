import { useEffect, useState } from "react";
import { TriangleAlert, CheckCircle2, History, Copy, Check, ExternalLink, Globe, Webhook, ShieldCheck } from "lucide-react";
import { getIntegrationStatus, getAuditLog } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { formatDateTime } from "../../lib/format.js";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-canvas/60 px-2.5 py-1.5 text-xs text-ink">
        <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 p-1 rounded hover:bg-surface text-muted hover:text-ink transition cursor-pointer"
          title="Copy to clipboard"
        >
          {copied ? <Check className="size-3.5 text-success stroke-[3]" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

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
  const isProd = window.location.hostname !== "localhost";
  const apiBase = isProd ? "https://solvers-backend.onrender.com" : "http://localhost:5000";
  const appBase = isProd ? "https://solvers-app.onrender.com" : window.location.origin;

  return (
    <div className="grid gap-5">
      <PageHeader title="GitHub integration" description="Central repository configuration, webhook health, and worker status. Failures surface here — never as fake verified success." />
      
      <Card className={`flex gap-2.5 text-sm ${d.status === "HEALTHY" ? "border-success/30 bg-success-bg/40" : "border-warning/30 bg-warning-bg/50"}`} role="status">
        {d.status === "HEALTHY" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" /> : <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />}
        <div>
          <p className="font-bold">{d.status === "HEALTHY" ? "All systems normal" : "Degraded — see details"}</p>
          <p className="text-muted">{d.message}</p>
        </div>
      </Card>

      {/* GitHub URL Configuration Reference Guide */}
      <Card className="flex flex-col gap-4 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            <h2 className="section-title !mb-0 font-bold">GitHub App & Webhook URLs Setup</h2>
          </div>
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md">
            Integration Guide
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* GitHub OAuth App Settings */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-ink flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" /> 1. GitHub OAuth App Settings
              </span>
              <a
                href="https://github.com/settings/developers"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Open Dev Settings <ExternalLink className="size-3" />
              </a>
            </div>
            <p className="text-xs text-muted">
              Configure in GitHub Developer Settings &gt; OAuth Apps when creating or editing your OAuth App:
            </p>
            <CopyField label="Homepage URL (Website URL)" value={appBase} />
            <CopyField label="Authorization callback URL" value={`${apiBase}/api/v1/auth/github/callback`} />
          </div>

          {/* Repository Webhook Settings */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-ink flex items-center gap-1.5">
                <Webhook className="size-4 text-primary" /> 2. Repository Webhook Settings
              </span>
              <a
                href={`https://github.com/${d.repo?.fullName || "Satyamdiwaker000001/DSA_Batch_2027"}/settings/hooks`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Repo Webhooks <ExternalLink className="size-3" />
              </a>
            </div>
            <p className="text-xs text-muted">
              In repository Settings &gt; Webhooks &gt; Add Webhook (set Content type to application/json):
            </p>
            <CopyField label="Payload URL" value={`${apiBase}/api/v1/integrations/github/webhook`} />
            <CopyField label="Content type" value="application/json" />
            <div className="text-[11px] text-muted">
              <strong>Events:</strong> Check <em>Pushes</em> and <em>Pull requests</em>.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="section-title">Central Repository Status</h2>
          <dl className="mt-2 grid gap-2 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 min-w-0"><dt className="text-muted shrink-0">Full name</dt><dd className="mono break-all text-ink">{d.repo.fullName}</dd></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 min-w-0"><dt className="text-muted shrink-0">Branch</dt><dd className="mono break-all text-ink">{d.repo.branch}</dd></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 min-w-0"><dt className="text-muted shrink-0">Folder root</dt><dd className="mono break-all text-ink">{d.repo.folderRoot}</dd></div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 min-w-0"><dt className="text-muted shrink-0">Last sync</dt><dd className="tnum text-ink">{formatDateTime(d.lastSync)}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="section-title">Worker Queue</h2>
          <dl className="mt-2 grid gap-1.5 text-sm">
            <div className="flex justify-between gap-2 min-w-0"><dt className="text-muted">Depth</dt><dd className="tnum font-bold text-ink">{d.queue.depth} jobs</dd></div>
            <div className="flex justify-between gap-2 min-w-0"><dt className="text-muted">Oldest job age</dt><dd className="tnum text-ink">{d.queue.oldestAgeSec != null ? `${d.queue.oldestAgeSec}s` : "—"}</dd></div>
            <div className="flex justify-between gap-2 min-w-0"><dt className="text-muted">Dead-letter</dt><dd className="tnum text-ink">{d.queue.deadLetter ?? "—"}</dd></div>
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
      <PageHeader title="Audit log" description="Approval, assignment, and review decisions with actor, action, target, and timestamp." />
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
