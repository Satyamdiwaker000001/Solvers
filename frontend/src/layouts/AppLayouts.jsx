import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { Sidebar, Topbar, Toasts } from "../components/layout/Chrome.jsx";
import { studentNav, adminNav } from "../config/navigation.js";
import { useContainedFocus } from "../hooks/useContainedFocus.js";
import { Dialog } from "../components/ui/Dialog.jsx";
import { Button } from "../components/ui/Button.jsx";
import { getAdminOverview } from "../services/api.js";

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
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <aside ref={panelRef} tabIndex={-1} id="mobile-nav" className="absolute inset-y-0 left-0 w-[85vw] max-w-80 bg-surface shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
        <button type="button" onClick={onClose} aria-label="Close navigation menu" className="absolute right-2 top-3 rounded-lg p-2 text-muted hover:bg-canvas">
          <X aria-hidden="true" className="size-5" />
        </button>
        <Sidebar nav={nav} badges={badges} onNavigate={onClose} onRequestSignOut={onRequestSignOut} />
      </aside>
    </div>
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
  // Ensures any attempt to use the browser Back or Forward button stays trapped in the dashboard
  // and immediately prompts for logout confirmation.
  useEffect(() => {
    // 1. Initial push to guarantee there is a history entry for the trap
    window.history.pushState({ protected: true, path: location.pathname }, "", window.location.href);

    const onPopState = (e) => {
      // Immediately cancel the browser's navigation and keep the user on the current URL
      window.history.pushState({ protected: true, path: location.pathname }, "", window.location.href);
      // Open the logout confirmation dialog
      setShowLogoutConfirm(true);
    };

    window.addEventListener("popstate", onPopState);

    // 2. Also register beforeunload to prevent accidental browser closure or reloads if desired
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [location.pathname]);

  const handleRequestSignOut = () => {
    setShowLogoutConfirm(true);
  };

  const handleCancelSignOut = () => {
    setShowLogoutConfirm(false);
    // Refresh the trap state on cancel so subsequent back clicks are intercepted
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
    <div className="relative min-h-svh bg-canvas text-ink overflow-x-hidden">
      {/* Quiet atmospheric background lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden select-none" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 size-[500px] rounded-full blur-[140px] opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #DDF4E5 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 size-[550px] rounded-full blur-[160px] opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #EEF2F0 0%, transparent 70%)" }}
        />
      </div>

      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lg">
        Skip to main content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-surface/95 backdrop-blur-xl lg:block" aria-label="Primary">
        <Sidebar nav={nav} badges={badges} onRequestSignOut={handleRequestSignOut} />
      </aside>
      {/* Mobile drawer */}
      {open && <MobileNavDrawer nav={nav} badges={badges} onClose={close} onRequestSignOut={handleRequestSignOut} />}
      <div className="lg:pl-72 relative z-10 pt-16">
        <Topbar title={consoleName} onMenu={() => setOpen(true)} menuExpanded={open} onRequestSignOut={handleRequestSignOut} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] min-w-0 px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {showLogoutConfirm && (
        <Dialog
          title="Sign out of Solvers?"
          description="Are you sure you want to log out of your session?"
          onClose={handleCancelSignOut}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-ink">
              <LogOut className="size-5 shrink-0 text-danger" />
              <span>You will be returned to the sign-in screen and will need to log in again to access the dashboard.</span>
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
    return () => { active = false; };
  }, []);

  return <Shell nav={adminNav} consoleName="Admin console" badges={counts} />;
}
