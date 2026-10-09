import { cn } from "./cn.js";

const tones = {
  primary: "bg-primary text-surface font-bold hover:bg-primary-strong disabled:bg-primary/40 shadow-xs",
  secondary: "bg-surface text-ink border border-border hover:bg-canvas hover:border-primary/30 disabled:text-muted",
  amber: "bg-primary text-surface font-bold hover:bg-primary-strong disabled:opacity-50 shadow-xs",
  destructive: "bg-danger text-white hover:brightness-110 disabled:opacity-50",
  ghost: "text-primary hover:bg-primary-subtle disabled:text-muted",
};

export function Button({ tone = "primary", className, loading, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition",
        "disabled:cursor-not-allowed",
        tones[tone],
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && (
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {props.children}
    </button>
  );
}
