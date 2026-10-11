import { useState, useRef, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, ShieldCheck, FlaskConical, LogOut, Camera, ChevronDown, User, Settings, Check } from "lucide-react";
import { GithubMark } from "../ui/GithubMark.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";
import { cn } from "../ui/cn.js";
import { SolversLogo } from "../ui/SolversLogo.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { AvatarEditModal } from "./AvatarEditModal.jsx";

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
  const [showAvatarModal, setShowAvatarModal] = useState(false);

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
            <button
              type="button"
              onClick={() => user.role === "admin" && setShowAvatarModal(true)}
              title={user.role === "admin" ? "Change profile avatar" : undefined}
              className={`relative shrink-0 rounded-full transition ${user.role === "admin" ? "cursor-pointer hover:ring-2 hover:ring-primary/50 group" : ""}`}
            >
              <Avatar src={user.avatarUrl} name={user.displayName || user.name} className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle object-cover text-xs font-bold text-primary" />
              {user.role === "admin" && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-white opacity-0 transition group-hover:opacity-100">
                  <Camera className="size-3.5" />
                </span>
              )}
            </button>
            <div
              className={`min-w-0 flex-1 leading-tight ${user.role === "admin" ? "cursor-pointer" : ""}`}
              onClick={() => user.role === "admin" && setShowAvatarModal(true)}
              title={user.role === "admin" ? "Edit profile" : undefined}
            >
              <p className="truncate text-[13px] font-semibold text-ink hover:text-primary transition">{user.displayName || user.name}</p>
              <p className="truncate text-xs text-muted">{user.role === "admin" ? "Course Admin" : `@${user.githubLogin}`}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-danger cursor-pointer"
            >
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </div>
      {showAvatarModal && <AvatarEditModal onClose={() => setShowAvatarModal(false)} />}
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
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
        <div className="flex items-center gap-3">
          {right}
          {user && (
            <div className="relative" ref={dropdownRef}>
              {/* Unified Profile Trigger Button */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-canvas/80 p-1 pl-1.5 pr-3 shadow-xs transition hover:border-primary/40 cursor-pointer"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <div className="relative">
                  <Avatar
                    src={user.avatarUrl}
                    name={user.displayName || user.name}
                    className="size-7 rounded-full border border-border object-cover text-center text-xs font-bold leading-7 text-primary"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                  <span className="text-xs font-bold text-ink truncate max-w-28">
                    {user.displayName || user.name}
                  </span>
                  <span className="text-[10px] text-muted flex items-center gap-1 font-medium">
                    {user.role === "admin" ? <ShieldCheck className="size-3 text-primary" /> : null}
                    {user.role === "admin" ? "Admin" : `@${user.githubLogin}`}
                  </span>
                </div>
                <ChevronDown className={`size-3.5 text-muted transition duration-200 ${menuOpen ? "rotate-180 text-primary" : ""}`} />
              </button>

              {/* Perfectly Aligned Profile Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-surface p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center gap-3 p-2.5 border-b border-border/80 mb-1">
                    <Avatar
                      src={user.avatarUrl}
                      name={user.displayName || user.name}
                      className="size-10 rounded-full border border-primary/50 object-cover text-center text-sm font-bold leading-10 text-primary shrink-0"
                    />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-sm font-bold text-ink truncate">{user.displayName || user.name}</p>
                      <p className="text-xs text-muted truncate mt-0.5">
                        {user.role === "admin" ? "Course Administrator" : `@${user.githubLogin}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {user.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setShowAvatarModal(true);
                        }}
                        className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-primary/10 hover:text-primary transition cursor-pointer text-left"
                      >
                        <Camera className="size-4 text-primary shrink-0" />
                        <span>Change Avatar & Profile</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition cursor-pointer text-left"
                    >
                      <LogOut className="size-4 text-danger shrink-0" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showAvatarModal && <AvatarEditModal onClose={() => setShowAvatarModal(false)} />}
    </header>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 flex w-[calc(100vw-1.5rem)] sm:w-auto flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl ring-1 ring-black/5 animate-in slide-in-from-bottom-2 sm:max-w-md"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{t.title}</p>
            {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss toast"
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
