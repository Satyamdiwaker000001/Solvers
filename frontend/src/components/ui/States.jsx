import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./Button.jsx";
import { cn } from "./cn.js";

export function LoadingState({ label = "Loading…", lines = 3 }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" /> {label}
      </p>
      <div className="grid gap-2" aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={cn("h-9 animate-pulse rounded-lg bg-canvas", i === lines - 1 && "w-2/3")} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="rounded-full bg-primary-subtle p-3 text-primary">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <h2 className="text-base font-bold">{title}</h2>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl border border-danger/25 bg-danger-bg/40 px-6 py-10 text-center">
      <AlertCircle aria-hidden="true" className="size-7 text-danger" />
      <h2 className="text-base font-bold">{title}</h2>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {onRetry && (
        <Button tone="secondary" onClick={onRetry} className="mt-2">
          <RefreshCw aria-hidden="true" className="size-4" /> Try again
        </Button>
      )}
    </div>
  );
}
