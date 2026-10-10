import { Submission, TrackingPolicy, WebhookEvent } from "../models.js";

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function periodStart(period, now = new Date()) {
  const value = startOfDay(now);
  if (period === "day") return value;
  if (period === "month") return new Date(value.getFullYear(), value.getMonth(), 1);
  if (period === "year") return new Date(value.getFullYear(), 0, 1);
  if (period === "week") {
    const day = value.getDay();
    value.setDate(value.getDate() - (day === 0 ? 6 : day - 1));
    return value;
  }
  return null;
}

function keyFor(date, period) {
  const value = new Date(date);
  if (period === "year") return String(value.getFullYear());
  if (period === "month") return value.toISOString().slice(0, 7);
  return value.toISOString().slice(0, 10);
}

/** Builds one cumulative report with optional day/week/month/year window. */
export async function buildProgressReport({ studentId, period = "all" }) {
  const since = periodStart(period);
  const query = { student: studentId };
  if (since) query.firstObservedAt = { $gte: since };
  const pullRequestQuery = { student: studentId, event: "pull_request" };
  if (since) pullRequestQuery.receivedAt = { $gte: since };
  const [submissions, policy, pullRequestEvents] = await Promise.all([
    Submission.find(query).sort({ firstObservedAt: 1 }).lean(),
    TrackingPolicy.findOne({ key: "default" }).lean(),
    WebhookEvent.find(pullRequestQuery).select("pullRequestId deliveryId").lean(),
  ]);
  // A single PR emits multiple events (opened, synchronize, closed). Count
  // unique PRs, while retaining a delivery fallback for legacy events.
  const pullRequests = new Set(pullRequestEvents.map((event) => event.pullRequestId
    ? `pr:${event.pullRequestId}`
    : `delivery:${event.deliveryId}`)).size;
  const dailyMinimum = policy?.dailyMinimum ?? 1;
  const verified = submissions.filter((item) => item.outcome === "VERIFIED" || item.eventType === "NEW_PROBLEM_VERIFIED");
  const review = submissions.filter((item) => ["NEEDS_REVIEW", "CHECK_FAILED", "INGESTION_PENDING"].includes(item.outcome));
  const days = new Map();
  for (const item of submissions) {
    const key = keyFor(item.firstObservedAt, period === "year" ? "month" : period === "all" ? "day" : period);
    const bucket = days.get(key) || { period: key, commits: 0, verified: 0, review: 0, additions: 0, deletions: 0 };
    bucket.commits += 1;
    bucket.additions += item.additions || 0;
    bucket.deletions += item.deletions || 0;
    if (item.eventType === "NEW_PROBLEM_VERIFIED" || item.outcome === "VERIFIED") bucket.verified += 1;
    if (review.includes(item)) bucket.review += 1;
    days.set(key, bucket);
  }
  const series = [...days.values()].sort((a, b) => a.period.localeCompare(b.period));
  const targetDays = series.filter((item) => item.commits >= dailyMinimum).length;
  return {
    period,
    generatedAt: new Date(),
    dailyMinimum,
    totals: {
      commits: submissions.length,
      verified: new Set(verified.filter((item) => item.assignment).map((item) => String(item.assignment))).size,
      review: review.length,
      additions: submissions.reduce((sum, item) => sum + (item.additions || 0), 0),
      deletions: submissions.reduce((sum, item) => sum + (item.deletions || 0), 0),
      targetDays,
      pullRequests,
    },
    series,
    entries: submissions.slice(-100).reverse(),
  };
}
