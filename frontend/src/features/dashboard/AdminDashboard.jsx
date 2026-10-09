import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Inbox, ScanSearch, Server, Target, TriangleAlert, Users } from "lucide-react";
import { getAdminOverview, getTrackingPolicy, updateTrackingPolicy } from "../../services/api.js";
import { LoadingState, ErrorState, EmptyState } from "../../components/ui/States.jsx";
import { formatDateTime } from "../../lib/format.js";

// Responsive metric grid: grid-cols-1 sm:grid-cols-2 xl:grid-cols-4.

const ActivityChart = lazy(() => import("../../components/data-display/ActivityChart.jsx").then((module) => ({ default: module.ActivityChart })));

function AdminMetric({ icon: Icon, value, label, detail, tone = "amber" }) {
  return <div className={`admin-metric ${tone}`}><span><Icon aria-hidden="true" /></span><div><strong>{value}</strong><b>{label}</b><small>{detail}</small></div></div>;
}

function AdminPanel({ title, action, children, className = "" }) {
  return <section className={`admin-panel ${className}`}><header><h2>{title}</h2>{action}</header>{children}</section>;
}

export function AdminDashboard() {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [attempt, setAttempt] = useState(0);
  const [policy, setPolicy] = useState({ dailyMinimum: 1, saving: false, message: "" });
  useEffect(() => { let active = true; getAdminOverview().then((response) => active && setState({ loading: false, error: null, data: response.data })).catch((error) => active && setState({ loading: false, error: error.message, data: null })); return () => { active = false; }; }, [attempt]);
  useEffect(() => { const timer = window.setInterval(() => setAttempt((value) => value + 1), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { getTrackingPolicy().then((response) => setPolicy((current) => ({ ...current, dailyMinimum: response.data.dailyMinimum }))).catch(() => {}); }, []);
  if (state.loading) return <div className="admin-loading"><LoadingState label="Loading class overview…" lines={3} /></div>;
  if (state.error) return <ErrorState body={state.error} onRetry={() => { setState({ loading: true, error: null, data: null }); setAttempt((value) => value + 1); }} />;
  const data = state.data;
  const healthy = data.integration.status === "HEALTHY";
  return <div className="admin-dashboard"><div className="admin-heading"><div><p className="admin-eyebrow">ADMIN CONSOLE</p><h1>Class overview</h1><p>Monitor access, verification, and student progress from one focused workspace.</p></div><Link to="/admin/requests" className="admin-primary-action">Review requests <ArrowRight aria-hidden="true" /></Link></div>{!healthy && <div className="admin-alert" role="status"><TriangleAlert aria-hidden="true" /><p><b>GitHub integration needs attention.</b> {data.integration.message} <small>Last sync {formatDateTime(data.integration.lastSync)}.</small></p></div>}<div className="admin-metrics"><AdminMetric icon={Inbox} value={data.pendingRequests} label="Pending requests" detail="Need a decision" tone="peach" /><AdminMetric icon={ScanSearch} value={data.needsReview} label="Needs review" detail="Evidence flagged" tone="scarlet" /><AdminMetric icon={BookOpenCheck} value={data.verifiedWeek} label="Verified problems" detail="Qualifying events" tone="amber" /><AdminMetric icon={Users} value={data.totalStudents} label="Students" detail={`${data.activeAssignments} active assignments`} tone="blue" /></div>{data.overdueAssignments > 0 && <div className="admin-alert" role="status"><TriangleAlert aria-hidden="true" /><p><b>{data.overdueAssignments} student assignment{data.overdueAssignments === 1 ? " is" : "s are"} overdue.</b> The count is derived from due dates and unfinished targets.</p></div>}<div className="admin-grid"><AdminPanel title="Daily tracking target"><div className="admin-policy"><Target aria-hidden="true" /><div><b>Minimum verified problems per day</b><small>Used by every student’s rolling report.</small></div><input aria-label="Minimum verified problems per day" type="number" min="0" max="100" value={policy.dailyMinimum} onChange={(event) => setPolicy((current) => ({ ...current, dailyMinimum: Number(event.target.value) }))} /><button type="button" disabled={policy.saving} onClick={async () => { setPolicy((current) => ({ ...current, saving: true, message: "" })); try { await updateTrackingPolicy(policy.dailyMinimum); setPolicy((current) => ({ ...current, saving: false, message: "Saved" })); } catch (error) { setPolicy((current) => ({ ...current, saving: false, message: error.message })); } }}>Save</button>{policy.message && <em>{policy.message}</em>}</div></AdminPanel><AdminPanel title="Class activity" action={<span className="admin-panel-note">Verified evidence per day</span>}><div className="admin-chart">{data.activitySeries.length === 0 ? <EmptyState title="No activity yet" body="Daily class activity will appear here when qualifying evidence is recorded." /> : <Suspense fallback={<LoadingState label="Loading chart…" lines={2} />}><ActivityChart data={data.activitySeries} /></Suspense>}</div></AdminPanel><AdminPanel title="Needs attention"><div className="admin-queue"><Link to="/admin/requests"><span><Inbox aria-hidden="true" /><b>Access queue</b></span><strong>{data.pendingRequests}</strong><ArrowRight aria-hidden="true" /></Link><Link to="/admin/review"><span><ScanSearch aria-hidden="true" /><b>Review queue</b></span><strong>{data.needsReview}</strong><ArrowRight aria-hidden="true" /></Link><Link to="/admin/integration"><span><Server aria-hidden="true" /><b>Integration health</b></span><em className={healthy ? "healthy" : "degraded"}>{healthy ? "Healthy" : "Degraded"}</em><ArrowRight aria-hidden="true" /></Link></div></AdminPanel></div></div>;
}
