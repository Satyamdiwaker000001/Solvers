/**
 * Shared formatting helpers. Pure functions only — no API calls here.
 */

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function timeUntil(iso, now = new Date()) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - now.getTime();
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function shortSha(sha) {
  if (!sha) return "—";
  return sha.length > 7 ? sha.slice(0, 7) : sha;
}

export function truncateMiddle(value, max = 48) {
  if (!value || value.length <= max) return value ?? "—";
  const keep = Math.floor((max - 1) / 2);
  return `${value.slice(0, keep)}…${value.slice(value.length - keep)}`;
}

export const difficultyRank = { Easy: 0, Medium: 1, Hard: 2 };

export const VERIFICATION_META = {
  VERIFIED: { label: "Verified", tone: "success", hint: "Configured evidence policy satisfied." },
  NEEDS_REVIEW: { label: "Needs review", tone: "warning", hint: "Ambiguous evidence — professor review required. Not a misconduct finding." },
  INCOMPLETE: { label: "Incomplete", tone: "neutral", hint: "Insufficient evidence or expected files missing." },
  CHECK_FAILED: { label: "Check failed", tone: "danger", hint: "Configured technical checks failed." },
  INGESTION_PENDING: { label: "Analysis pending", tone: "info", hint: "Evidence received; analysis not complete. Never treat as verified." },
  ANALYSIS_FAILED: { label: "Analysis failed", tone: "danger", hint: "Pipeline error. Retry or reconcile — do not report as success." },
};

export const ACCOUNT_STATUS_META = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "neutral" },
};
