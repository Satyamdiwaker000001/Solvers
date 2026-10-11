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
import { NotificationDropdown } from "./NotificationDropdown.jsx";

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 px-1 py-1" aria-label="Solvers home">
      <span className="flex items-center text-primary font-mono text-xl font-bold tracking-tight">
        &lt;&gt;
      </span>
      <span className="text-[20px] font-black tracking-tight text-[#151936]">
        Solvers
      </span>
    </Link>
  );
}

export function Sidebar({ nav, onNavigate, badges, onRequestSignOut }) {
  const { user, signOut } = useAuth();
  const handleSignOut = onRequestSignOut || signOut;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F8F8FF] border-r border-[#E2E6F5]">
      {/* Brand logo header */}
      <div className="px-5 pt-6 pb-4">
        <Brand />
      </div>

      {/* Navigation items */}
      <nav aria-label="Primary" className="scroll-region min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1.5">
          {nav.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} onNavigate={onNavigate} badge={item.badgeKey ? badges?.[item.badgeKey] : null} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Mascot character with quote matching reference exactly */}
      <div className="px-3 pb-3 pt-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#EDE9FE]/50 to-[#E0E7FF]/70 p-3 pt-4 border border-[#E0E7FF] text-center shadow-xs">
          <div className="relative mx-auto w-32 h-36 flex items-center justify-center">
            <img
              src="/mascot.png"
              alt="Solvers Student Mascot"
              className="h-full object-contain filter drop-shadow-md select-none pointer-events-none"
            />
            {/* Playful floating quote tag matching reference */}
            <span
              className="absolute -top-1 -right-1 text-[10px] font-bold text-primary bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs border border-primary/20 pointer-events-none"
              style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
            >
              Keep Solving Keep Growing!
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-white/95 px-2.5 py-2 text-left border border-[#E2E6F5] shadow-2xs">
            <p className="text-[11px] font-bold text-[#151936] leading-tight flex items-center gap-1.5">
              <span className="text-amber-500 text-xs">👑</span>
              Consistency Builds Great Developers.
            </p>
          </div>
        </div>

        {/* User bar at bottom */}
        {user && (
          <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#E2E6F5] bg-white p-2 shadow-2xs">
            <Avatar src={user.avatarUrl} name={user.displayName || user.name} className="size-7.5 shrink-0 rounded-full border border-[#E2E6F5] object-cover text-xs font-bold text-primary" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px] font-bold text-[#151936]">{user.displayName || user.name}</p>
              <p className="truncate text-[10px] text-[#647096]">{user.role === "admin" ? "Course Admin" : `@${user.githubLogin}`}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 rounded-lg p-1 text-[#647096] transition hover:bg-[#F3F4FF] hover:text-[#DC4545] cursor-pointer"
            >
              <LogOut aria-hidden="true" className="size-3.5" />
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
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition duration-150",
        isActive
          ? "bg-[#E9E7FF] font-bold text-primary shadow-xs"
          : "text-[#647096] hover:bg-[#E9E7FF]/50 hover:text-[#151936]",
      )}
    >
      <Icon aria-hidden="true" className="size-4.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">{badge}</span>
      )}
    </NavLink>
  );
}

export function DemoBadge() {
  return null;
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
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-[#E2E6F5] bg-[#F8F8FF]/80 backdrop-blur-md lg:left-64">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-7">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open navigation menu"
            aria-expanded={Boolean(menuExpanded)}
            aria-controls="mobile-nav"
            className="shrink-0 rounded-lg p-2 text-[#151936] hover:bg-[#F3F4FF] lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-[#151936] tracking-tight">
              {title || "Dashboard"}
            </span>
          </div>
        </div>

        {/* Right side controls: Notification bell + User profile */}
        <div className="flex items-center gap-3 shrink-0">
          {right}

          {/* Active Workable Notification Dropdown */}
          <NotificationDropdown />

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 rounded-full border border-transparent hover:border-[#E2E6F5] hover:bg-white p-1 pr-2.5 transition cursor-pointer"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <Avatar
                  src={user.avatarUrl}
                  name={user.displayName || user.name}
                  className="size-8.5 rounded-full border border-[#E2E6F5] object-cover text-center text-xs font-bold leading-8 text-primary shadow-2xs"
                />
                <div className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                  <span className="text-[13px] font-bold text-[#151936] truncate max-w-32">
                    {user.displayName || user.name}
                  </span>
                  <span className="text-[10px] text-[#647096] font-medium">
                    {user.role === "admin" ? "Admin" : "Student"}
                  </span>
                </div>
                <ChevronDown className={`size-3.5 text-[#647096] transition duration-200 ${menuOpen ? "rotate-180 text-primary" : ""}`} />
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
