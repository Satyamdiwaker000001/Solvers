import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { Sidebar, Topbar, Toasts } from "../components/layout/Chrome.jsx";
import { studentNav, adminNav } from "../config/navigation.js";
import { useContainedFocus } from "../hooks/useContainedFocus.js";
import { Dialog } from "../components/ui/Dialog.jsx";
import { Button } from "../components/ui/Button.jsx";
import { getAdminOverview } from "../services/api.js";
import { cn } from "../components/ui/cn.js";

/** Client-side route guard (convenience only). Real enforcement lives server-side (NFR-SEC-01). */
export function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) {
    const loginTarget = allow === "admin" ? "/admin-login" : "/sign-in";
    return <Navigate to={loginTarget} replace state={{ from: loc.pathname }} />;
  }
  if (allow === "admin" && user.role !== "admin") return <Navigate to="/forbidden" replace />;
  if (allow === "student" && user.role !== "student") return <Navigate to="/forbidden" replace />;
  if (allow === "student" && user.accessState !== "APPROVED") return <Navigate to="/access-status" replace />;
  return children;
}

/**
 * Mobile navigation drawer: focus-trapped while open, Escape closes,
 * focus returns to the menu button. Renders only while open so the
 * trap/restore lifecycle matches visibility.
 */
function MobileNavDrawer({ nav, badges, onClose, onRequestSignOut }) {
  const panelRef = useRef(null);
  useContainedFocus(panelRef, { onEscape: onClose });
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-2xs" onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        id="mobile-nav"
        className="absolute inset-y-0 left-0 w-[82vw] max-w-72 bg-surface shadow-2xl animate-in slide-in-from-left duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="absolute right-2.5 top-3.5 rounded-lg p-1.5 text-muted hover:bg-canvas"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
        <Sidebar nav={nav} badges={badges} onNavigate={onClose} onRequestSignOut={onRequestSignOut} />
      </aside>
    </div>
  );
}

/**
 * Mobile Bottom Navigation Bar:
 * Provides native app-like bottom navigation on mobile screens (<768px)
 * for immediate one-tap switching between primary sections.
 */
function MobileBottomNav({ nav, badges }) {
  // Take the primary 4 or 5 items for the mobile bottom bar
  const items = nav.slice(0, 5);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#E2E6F5] px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const badge = item.badgeKey ? badges?.[item.badgeKey] : null;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center py-1 px-1 rounded-xl text-center transition-all duration-150 min-w-0 relative",
                  isActive
                    ? "text-[#4F46E5] font-bold"
                    : "text-[#647096] hover:text-[#151936] font-medium"
                )
              }
            >
              <div className="relative">
                <Icon className="size-5 shrink-0" />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-2 grid size-4 place-items-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-2xs">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-full leading-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function Shell({ nav, consoleName, badges }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const close = () => setOpen(false);

  // Universal Cross-Browser History Guard (Chrome, Edge, Safari, Firefox)
  useEffect(() => {
    window.history.pushState({ protected: true, path: location.pathname }, "", window.location.href);

    const onPopState = () => {
      window.history.pushState({ protected: true, path: location.pathname }, "", window.location.href);
      setShowLogoutConfirm(true);
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [location.pathname]);

  const handleRequestSignOut = () => {
    setShowLogoutConfirm(true);
  };

  const handleCancelSignOut = () => {
    setShowLogoutConfirm(false);
    window.history.pushState({ protected: true, path: location.pathname }, "", window.location.href);
  };

  const handleConfirmSignOut = () => {
    setShowLogoutConfirm(false);
    const target = user?.role === "admin" ? "/admin-login" : "/sign-in";
    signOut();
    window.history.replaceState(null, "", target);
    navigate(target, { replace: true });
  };

  return (
    <div className="relative min-h-svh bg-[#F3F4FF] text-ink overflow-x-hidden font-sans">
      {/* Soft lavender atmospheric highlights */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/4 size-[600px] rounded-full blur-[140px] opacity-[0.22]"
          style={{ background: "radial-gradient(circle, #E9E7FF 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -right-32 size-[500px] rounded-full blur-[160px] opacity-[0.18]"
          style={{ background: "radial-gradient(circle, #EDE9FE 0%, transparent 70%)" }}
        />
      </div>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Tablet & Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[#E2E6F5] bg-[#F8F8FF] md:block"
        aria-label="Primary"
      >
        <Sidebar nav={nav} badges={badges} onRequestSignOut={handleRequestSignOut} />
      </aside>

      {/* Mobile drawer (only for mobile screens < 768px) */}
      {open && (
        <MobileNavDrawer
          nav={nav}
          badges={badges}
          onClose={close}
          onRequestSignOut={handleRequestSignOut}
        />
      )}

      {/* Main page content area */}
      <div className="md:pl-64 relative z-10 pt-16 pb-16 md:pb-6">
        <Topbar
          title={consoleName}
          onMenu={() => setOpen(true)}
          menuExpanded={open}
          onRequestSignOut={handleRequestSignOut}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] min-w-0 px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-6"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Bar (App-like Navigation only on mobile screens < 768px) */}
      <MobileBottomNav nav={nav} badges={badges} />

      {/* Sign out confirmation modal */}
      {showLogoutConfirm && (
        <Dialog
          title="Sign out of Solvers?"
          description="Are you sure you want to log out of your session?"
          onClose={handleCancelSignOut}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-ink">
              <LogOut className="size-5 shrink-0 text-danger" />
              <span>
                You will be returned to the sign-in screen and will need to log in again to access the dashboard.
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <Button tone="secondary" onClick={handleCancelSignOut}>
                Cancel (Stay on Dashboard)
              </Button>
              <Button tone="destructive" onClick={handleConfirmSignOut}>
                Yes, Sign out
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      <Toasts />
    </div>
  );
}

export function StudentLayout() {
  return <Shell nav={studentNav} consoleName="Student console" />;
}

export function AdminLayout() {
  const [counts, setCounts] = useState({ pendingRequests: 0, needsReview: 0 });

  useEffect(() => {
    let active = true;
    getAdminOverview()
      .then((res) => {
        if (active && res?.data) {
          setCounts({
            pendingRequests: res.data.pendingRequests ?? 0,
            needsReview: res.data.needsReview ?? 0,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <Shell nav={adminNav} consoleName="Admin console" badges={counts} />;
}
