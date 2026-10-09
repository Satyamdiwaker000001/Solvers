import { FileCode2 } from "lucide-react";
import { formatDateTime, shortSha } from "../../lib/format.js";
import { VerificationBadge } from "../ui/Badge.jsx";

/**
 * Evidence panel keeps raw GitHub evidence visually distinct from the
 * system's interpretation (NFR-FAIR-01). Long paths/hashes wrap.
 */
export function EvidencePanel({ submission, compact }) {
  if (!submission) return null;
  return (
    <div className="min-w-0 rounded-xl border border-border bg-canvas/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge outcome={submission.outcome} />
        <span className="tnum text-[13px] text-muted">{formatDateTime(submission.observedAt)}</span>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-semibold text-muted">File path</dt>
          <dd className="mono long-path flex items-center gap-1.5">
            <FileCode2 aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
            {submission.path}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold text-muted">Commit</dt>
          <dd className="mono" title={submission.commitSha}>{shortSha(submission.commitSha)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Change</dt>
          <dd className="tnum text-[13px]">+{submission.additions} / −{submission.deletions} · {submission.filesChanged} file(s)</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted">Observed (server time)</dt>
          <dd className="tnum text-[13px]">{formatDateTime(submission.observedAt)}</dd>
        </div>
      </dl>
      {!compact && submission.note && (
        <p className="mt-2 border-t border-border pt-2 text-[13px] text-muted">
          <span className="font-semibold text-ink">Finding: </span>{submission.note}
        </p>
      )}
      {!compact && submission.similarity && (
        <div className="mt-2 rounded-lg border border-warning/30 bg-warning-bg/60 p-2.5 text-[13px]">
          <p className="font-semibold">Similarity signal {(submission.similarity.score * 100).toFixed(0)}% — review required, not a verdict</p>
          <p className="mt-0.5 text-muted">{submission.similarity.detail}</p>
          <p className="mono long-path mt-1">vs {submission.similarity.against}</p>
        </div>
      )}
      {!compact && submission.checkFailure && (
        <div className="mt-2 rounded-lg border border-danger/25 bg-danger-bg/50 p-2.5 text-[13px]">
          <p className="font-semibold">Technical check failed</p>
          <p className="mt-0.5 text-muted">{submission.checkFailure}</p>
        </div>
      )}
    </div>
  );
}
