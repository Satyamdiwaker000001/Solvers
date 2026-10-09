import { CheckCircle2, AlertTriangle, XCircle, Info, MinusCircle } from "lucide-react";
import { cn } from "./cn.js";

const toneStyles = {
  success: "bg-success-bg text-success border-success/25",
  warning: "bg-warning-bg text-warning border-warning/30",
  danger: "bg-danger-bg text-danger border-danger/25",
  info: "bg-info-bg text-info border-info/25",
  neutral: "bg-canvas text-muted border-border",
};

const toneIcons = {
  success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info, neutral: MinusCircle,
};

/** Status is never color-only: always an icon + text label. */
export function Badge({ tone = "neutral", icon: Icon, children, className }) {
  const Glyph = Icon ?? toneIcons[tone] ?? MinusCircle;
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", toneStyles[tone], className)}>
      <Glyph aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function VerificationBadge({ outcome }) {
  const map = {
    VERIFIED: { tone: "success", label: "Verified" },
    NEEDS_REVIEW: { tone: "warning", label: "Needs review" },
    INCOMPLETE: { tone: "neutral", label: "Incomplete" },
    CHECK_FAILED: { tone: "danger", label: "Check failed" },
    INGESTION_PENDING: { tone: "info", label: "Analysis pending" },
    ANALYSIS_FAILED: { tone: "danger", label: "Analysis failed" },
    IN_PROGRESS: { tone: "info", label: "In progress" },
    NOT_STARTED: { tone: "neutral", label: "Not started" },
  };
  const meta = map[outcome] ?? { tone: "neutral", label: outcome };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
