import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { getAccessRequests, decideAccessRequest } from "../../services/api.js";
import { PageHeader, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { Dialog } from "../../components/ui/Dialog.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { formatDateTime } from "../../lib/format.js";

export function AccessQueuePage() {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: null, items: [] });
  const [confirm, setConfirm] = useState(null); // {item, decision}
  const [busy, setBusy] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getAccessRequests()
      .then((r) => setState({ loading: false, error: null, items: r.data }))
      .catch((e) => setState({ loading: false, error: e.message, items: [] }));
  };
  useEffect(load, []);

  const decide = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const r = await decideAccessRequest(confirm.item.id, confirm.decision);
      setState((s) => ({ ...s, items: s.items.map((x) => (x.id === r.data.id ? r.data : x)) }));
      toast.push({
        title: confirm.decision === "approve" ? "Request approved" : "Request rejected",
        body: confirm.decision === "approve" ? `@${r.data.githubLogin} can now access the program (demo).` : `Rejection starts a 24-hour reapply lock (demo).`,
      });
      setConfirm(null);
    } catch (e) {
      toast.push({ tone: "danger", title: "Decision failed", body: e.message });
    } finally { setBusy(false); }
  };

  if (state.loading) return <LoadingState label="Loading access requests…" />;
  if (state.error) return <ErrorState body={state.error} onRetry={load} />;

  const pending = state.items.filter((r) => r.status === "PENDING");
  const decided = state.items.filter((r) => r.status !== "PENDING");

  return (
    <div className="grid gap-4">
      <PageHeader title="Access requests" description="Approve or reject student access. Rejection starts a 24-hour reapply lock from server-recorded time (FR-AUTH-06). Decisions are audit-logged." />
      {pending.length === 0 ? (
        <EmptyState title="Queue is clear" body="No pending access requests. New GitHub sign-ins that request access will appear here." />
      ) : (
        <ul className="grid gap-3">
          {pending.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mono text-sm font-bold">@{r.githubLogin}</p>
                  <Badge tone="warning">Pending</Badge>
                  <span className="tnum ml-auto text-xs text-muted">submitted {formatDateTime(r.submittedAt)}</span>
                </div>
                {r.note && <p className="mt-1 text-sm text-muted">{r.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => setConfirm({ item: r, decision: "approve" })}><Check aria-hidden="true" className="size-4" /> Approve</Button>
                  <Button tone="secondary" onClick={() => setConfirm({ item: r, decision: "reject" })}><X aria-hidden="true" className="size-4" /> Reject</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {decided.length > 0 && (
        <Card className="p-0">
          <h2 className="section-title px-4 pt-4 sm:px-5">Recently decided</h2>
          <div className="table-scroll mt-2">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead><tr className="border-y border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Applicant</th><th className="px-4 py-2.5">Decision</th><th className="px-4 py-2.5">Decided</th><th className="px-4 py-2.5">By</th>
              </tr></thead>
              <tbody>
                {decided.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="mono px-4 py-2.5">@{r.githubLogin}</td>
                    <td className="px-4 py-2.5"><Badge tone={r.status === "APPROVED" ? "success" : "danger"}>{r.status}</Badge></td>
                    <td className="tnum px-4 py-2.5 text-muted">{formatDateTime(r.decidedAt)}</td>
                    <td className="px-4 py-2.5 text-muted">{r.decidedBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {confirm && (
        <Dialog
          title={confirm.decision === "approve" ? "Approve access?" : "Reject access?"}
          description={confirm.decision === "approve"
            ? `@${confirm.item.githubLogin} will join official tracking and the leaderboard.`
            : "Rejection locks reapplication for 24 hours from now (server time). The applicant sees the retry time."}
          onClose={() => !busy && setConfirm(null)}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <Button tone="secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
            <Button tone={confirm.decision === "approve" ? "primary" : "destructive"} loading={busy} onClick={decide}>
              {confirm.decision === "approve" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
