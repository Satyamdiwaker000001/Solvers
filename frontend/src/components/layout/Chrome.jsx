import { Link } from "react-router-dom";
import { GraduationCap, Menu, X, ShieldCheck, FlaskConical } from "lucide-react";
import { GithubMark } from "../ui/GithubMark.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { cn } from "../ui/cn.js";

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="DSA Practice Tracker home">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white">
        <GraduationCap aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-extrabold tracking-tight">DSA Practice Tracker</span>
        <span className="block text-xs text-muted">Academic practice console</span>
      </span>
    </Link>
  );
}

export function Sidebar({ nav, onNavigate, badges }) {
  const { user, signOut } = useAuth();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4"><Brand /></div>
      <nav aria-label="Primary" className="scroll-region min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="grid gap-1">
          {nav.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} onNavigate={onNavigate} badge={item.badgeKey ? badges?.[item.badgeKey] : null} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border p-3">
        <DemoBadge />
        {user && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-canvas p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
              {user.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.role === "admin" ? "Professor admin" : `@${user.githubLogin}`}</p>
            </div>
            <Link to="/sign-in" onClick={signOut} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-subtle">
              Switch
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import { NavLink } from "react-router-dom";
function SidebarLink({ item, onNavigate, badge }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to} end={item.end} onClick={onNavigate}
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        isActive ? "bg-primary-subtle text-primary" : "text-ink/80 hover:bg-canvas",
      )}
    >
      <Icon aria-hidden="true" className="size-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="tnum grid min-w-6 place-items-center rounded-full bg-warning-bg px-1.5 py-0.5 text-xs font-bold text-warning">{badge}</span>
      )}
    </NavLink>
  );
}

export function DemoBadge() {
  return (
    <p className="flex items-start gap-1.5 rounded-xl border border-dashed border-border bg-canvas/70 p-2.5 text-xs leading-snug text-muted">
      <FlaskConical aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span><strong className="text-ink">Demo mode.</strong> Sign-in &amp; data are mocked — no real auth or persistence.</span>
    </p>
  );
}

export function Topbar({ title, onMenu, menuExpanded, right }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <button type="button" onClick={onMenu} aria-label="Open navigation menu" aria-expanded={Boolean(menuExpanded)} aria-controls="mobile-nav" className="rounded-lg p-2 text-ink hover:bg-canvas lg:hidden">
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0 flex-1 lg:hidden"><Brand /></div>
        <p className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-muted lg:block">{title}</p>
        <div className="flex items-center gap-2">
          {right}
          <span className="hidden items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted sm:inline-flex">
            {title?.includes("Admin") ? <ShieldCheck aria-hidden="true" className="size-3.5" /> : <GithubMark className="size-3.5" />}
            {title?.includes("Admin") ? "Admin console" : "Student console"}
          </span>
        </div>
      </div>
    </header>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useToast();
  const tones = { success: "border-success/30", danger: "border-danger/30", info: "border-info/30" };
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-stretch gap-2 p-4 sm:items-end">
      {toasts.map((t) => (
        <div key={t.id} role={t.tone === "danger" ? "alert" : "status"}
          className={cn("pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border bg-surface p-3 shadow-lg", tones[t.tone] ?? tones.success)}>
          <p className="min-w-0 flex-1 text-sm"><strong>{t.title}</strong>{t.body && <span className="block text-muted">{t.body}</span>}</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="rounded p-1 text-muted hover:bg-canvas">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
