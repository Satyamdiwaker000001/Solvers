import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Sidebar, Topbar, Toasts } from "../components/layout/Chrome.jsx";
import { studentNav, adminNav } from "../config/navigation.js";

/** Client-side route guard for the demo. Real enforcement lives server-side (NFR-SEC-01). */
export function ProtectedRoute({ allow, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/sign-in" replace state={{ from: loc.pathname }} />;
  if (allow === "admin" && user.role !== "admin") return <Navigate to="/forbidden" replace />;
  if (allow === "student" && user.role !== "student") return <Navigate to="/forbidden" replace />;
  if (allow === "student" && user.accessState !== "APPROVED") return <Navigate to="/access-status" replace />;
  return children;
}

function Shell({ nav, consoleName, badges }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-svh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-border bg-surface lg:block">
        <Sidebar nav={nav} badges={badges} />
      </aside>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85vw] max-w-80 bg-surface shadow-xl" role="dialog" aria-modal="true" aria-label="Navigation">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation menu" className="absolute right-2 top-3 rounded-lg p-2 text-muted hover:bg-canvas">
              <X aria-hidden="true" className="size-5" />
            </button>
            <Sidebar nav={nav} badges={badges} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-72">
        <Topbar title={consoleName} onMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <p className="text-xs text-muted">DSA Practice Tracker · frontend demo — evidence shown is illustrative mock data, not live GitHub analysis.</p>
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
