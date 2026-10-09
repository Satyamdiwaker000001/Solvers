import { cn } from "./cn.js";

export function Card({ className, children, ...props }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(23,32,51,0.05)] sm:p-5", className)} {...props}>
      {children}
    </section>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = "text-primary" }) {
  return (
    <Card className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
        {Icon && <Icon aria-hidden="true" className={cn("size-4 shrink-0", tone)} />}
      </div>
      <p className="tnum text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="text-[13px] leading-snug text-muted">{sub}</p>}
    </Card>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
