import { Link, NavLink } from "react-router-dom";
import { Menu, X, ShieldCheck, FlaskConical, LogOut } from "lucide-react";
import { GithubMark } from "../ui/GithubMark.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { cn } from "../ui/cn.js";
import { SolversLogo } from "../ui/SolversLogo.jsx";
import { Avatar } from "../ui/Avatar.jsx";

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="DSA Practice Tracker home">
      <SolversLogo compact />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-extrabold tracking-tight text-ink">Solvers</span>
        <span className="block truncate text-xs text-muted">DSA Practice &amp; Verification</span>
      </span>
    </Link>
  );
}

export function Sidebar({ nav, onNavigate, badges, onRequestSignOut }) {
  const { user, signOut } = useAuth();
  const handleSignOut = onRequestSignOut || signOut;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4 pr-12 lg:pr-4"><Brand /></div>
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
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-border/80 bg-surface p-2.5 shadow-xs">
            <Avatar src={user.avatarUrl} name={user.displayName || user.name} className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle object-cover text-xs font-bold text-primary" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-ink">{user.displayName || user.name}</p>
              <p className="truncate text-xs text-muted">{user.role === "admin" ? "Course Admin" : `@${user.githubLogin}`}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-danger"
            >
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarLink({ item, onNavigate, badge }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to} end={item.end} onClick={onNavigate}
      className={({ isActive }) => cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        isActive
          ? "border border-primary/30 bg-primary/15 font-semibold text-primary shadow-xs"
          : "text-ink/80 hover:bg-canvas hover:text-ink",
      )}
    >
      <Icon aria-hidden="true" className="size-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="tnum grid min-w-5 place-items-center rounded-full border border-warning/30 bg-warning-bg px-1.5 py-0.5 text-xs font-bold text-warning">{badge}</span>
      )}
    </NavLink>
  );
}

export function DemoBadge() {
  const { isDemo } = useAuth();
  if (!isDemo) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-canvas/80 px-2.5 py-1.5 text-xs text-muted">
      <FlaskConical aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
      <span className="truncate leading-tight"><strong className="text-ink">Demo mode</strong> · in-memory data</span>
    </div>
  );
}

export function Topbar({ title, onMenu, menuExpanded, right, onRequestSignOut }) {
  const { user, signOut } = useAuth();
  const handleSignOut = onRequestSignOut || signOut;
  return (
    <header className="app-topbar fixed inset-x-0 top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-md lg:left-72">
      <div className="app-topbar-inner mx-auto flex h-16 max-w-[1440px] items-center gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation menu"
          aria-expanded={Boolean(menuExpanded)}
          aria-controls="mobile-nav"
          className="shrink-0 rounded-lg p-2 text-ink hover:bg-canvas lg:hidden"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <div className="min-w-0 flex-1 lg:hidden"><Brand /></div>
        <div className="app-topbar-heading hidden min-w-0 flex-1 items-center gap-2 lg:flex">
          <span className="app-topbar-kicker">Workspace</span>
          <span className="app-topbar-divider" aria-hidden="true" />
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          {right}
          {user && (
            <div className="app-account hidden items-center gap-2 sm:flex">
              <Avatar src={user.avatarUrl} name={user.displayName || user.name} className="size-8 rounded-full border border-border object-cover text-center text-xs font-bold leading-8 text-primary" />
              <span className="app-account-pill inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
                {user.role === "admin" ? <ShieldCheck aria-hidden="true" className="size-3.5 text-primary" /> : <GithubMark className="size-3.5" />}
                {user.role === "admin" ? "Admin" : `@${user.githubLogin}`}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-danger"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </div>
          )}
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
