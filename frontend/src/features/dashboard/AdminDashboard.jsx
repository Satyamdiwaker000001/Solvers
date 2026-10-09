import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, ScanSearch, BookOpenCheck, Users, ArrowRight, TriangleAlert } from "lucide-react";
import { getAdminOverview } from "../../services/api.js";
import { PageHeader, StatCard, Card } from "../../components/ui/Card.jsx";
import { Badge } from "../../components/ui/Badge.jsx";
import { LoadingState, ErrorState } from "../../components/ui/States.jsx";
const ActivityChart = lazy(() => import("../../components/data-display/ActivityChart.jsx").then((m) => ({ default: m.ActivityChart })));
import { formatDateTime } from "../../lib/format.js";

export function AdminDashboard() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let live = true;
    getAdminOverview()
      .then((r) => live && setState({ loading: false, error: null, data: r.data }))
      .catch((e) => live && setState({ loading: false, error: e.message, data: null }));
    return () => { live = false; };
  }, []);

  if (state.loading) return <LoadingState label="Loading class overview…" lines={4} />;
  if (state.error) return <ErrorState body={state.error} onRetry={() => window.location.reload()} />;

  const d = state.data;
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Class overview"
        description="Access queue, verification health, and class activity at a glance. Every admin action here is audit-logged (FR-AUD-01)."
        actions={<Link to="/admin/requests" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong">Review requests <ArrowRight aria-hidden="true" className="size-4" /></Link>}
      />
      {d.integration.status !== "HEALTHY" && (
        <Card className="flex gap-2.5 border-warning/30 bg-warning-bg/50 text-sm" role="status">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          <p><strong>GitHub integration degraded:</strong> {d.integration.message} <span className="tnum text-muted">Last sync {formatDateTime(d.integration.lastSync)}.</span></p>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Pending requests" value={d.pendingRequests} sub="Need a decision" icon={Inbox} tone="text-warning" />
        <StatCard label="Needs review" value={d.needsReview} sub="Flagged evidence" icon={ScanSearch} tone="text-warning" />
        <StatCard label="Verified (all time)" value={d.verifiedWeek} sub="Qualifying events" icon={BookOpenCheck} tone="text-success" />
        <StatCard label="Students · assignments" value={`${d.totalStudents} · ${d.activeAssignments}`} sub="Approved · active" icon={Users} />
      </div>
      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <h2 className="section-title">Class activity</h2>
          <p className="mb-3 text-[13px] text-muted">Qualifying evidence per day across all students.</p>
          <Suspense fallback={<LoadingState label="Loading chart…" lines={2} />}>
            <ActivityChart data={d.activitySeries} />
          </Suspense>
        </Card>
        <Card className="xl:col-span-2">
          <h2 className="section-title">Needs attention</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            <li><Link to="/admin/requests" className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 hover:bg-canvas/60"><span className="flex items-center gap-2 font-semibold"><Inbox aria-hidden="true" className="size-4 text-warning" /> Access queue</span><Badge tone="warning">{d.pendingRequests} pending</Badge></Link></li>
            <li><Link to="/admin/review" className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 hover:bg-canvas/60"><span className="flex items-center gap-2 font-semibold"><ScanSearch aria-hidden="true" className="size-4 text-warning" /> Review queue</span><Badge tone="warning">{d.needsReview} flagged</Badge></Link></li>
            <li><Link to="/admin/integration" className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 hover:bg-canvas/60"><span className="font-semibold">Integration health</span><Badge tone="warning">Degraded</Badge></Link></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
