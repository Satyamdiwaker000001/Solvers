import { useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { Sidebar, Topbar, Toasts } from "../components/layout/Chrome.jsx";
import { studentNav, adminNav } from "../config/navigation.js";
import { useContainedFocus } from "../hooks/useContainedFocus.js";

/** Client-side route guard (convenience only). Real enforcement lives server-side (NFR-SEC-01). */
export function ProtectedRoute({ allow, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace state={{ from: loc.pathname }} />;
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
function MobileNavDrawer({ nav, badges, onClose }) {
  const panelRef = useRef(null);
  useContainedFocus(panelRef, { onEscape: onClose });
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <aside ref={panelRef} tabIndex={-1} id="mobile-nav" className="absolute inset-y-0 left-0 w-[85vw] max-w-80 bg-surface shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
        <button type="button" onClick={onClose} aria-label="Close navigation menu" className="absolute right-2 top-3 rounded-lg p-2 text-muted hover:bg-canvas">
          <X aria-hidden="true" className="size-5" />
        </button>
        <Sidebar nav={nav} badges={badges} onNavigate={onClose} />
      </aside>
    </div>
  );
}

function Shell({ nav, consoleName, badges }) {
  const [open, setOpen] = useState(false);
  const { isDemo } = useAuth();
  const close = () => setOpen(false);
  return (
    <div className="min-h-svh bg-canvas">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-lg">
        Skip to main content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-surface lg:block" aria-label="Primary">
        <Sidebar nav={nav} badges={badges} />
      </aside>
      {/* Mobile drawer */}
      {open && <MobileNavDrawer nav={nav} badges={badges} onClose={close} />}
      <div className="lg:pl-72">
        <Topbar title={consoleName} onMenu={() => setOpen(true)} menuExpanded={open} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl min-w-0 px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <p className="text-xs text-muted">{isDemo
            ? "DSA Practice Tracker · frontend demo — evidence shown is illustrative mock data, not live GitHub analysis."
            : "DSA Practice Tracker · live data from the class server. Verification outcomes reflect stored evidence."}</p>
        </footer>
      </div>
      <Toasts />
    </div>
  );
}

export function StudentLayout() {
  return <Shell nav={studentNav} consoleName="Student console" />;
}

export function AdminLayout() {
  return <Shell nav={adminNav} consoleName="Admin console" badges={{ pendingRequests: 2, needsReview: 1 }} />;
}
