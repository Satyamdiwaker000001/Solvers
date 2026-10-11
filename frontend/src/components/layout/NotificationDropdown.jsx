import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Clock, CheckCircle2, AlertCircle, Flame, UserCheck, Code2, Sparkles, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import {
  getStudentAssignments,
  getStudentSubmissions,
  getAdminOverview,
  getReviewQueue,
  getAccessRequests,
} from "../../services/api.js";

export function NotificationDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("solvers_read_notifications") || "[]");
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch contextual notifications based on role
  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        const list = [];
        const now = Date.now();

        if (user.role === "admin") {
          const [ovRes, revRes, reqRes] = await Promise.allSettled([
            getAdminOverview(),
            getReviewQueue(),
            getAccessRequests(),
          ]);

          const overview = ovRes.status === "fulfilled" ? ovRes.value?.data : null;
          const reviewQueue = revRes.status === "fulfilled" ? revRes.value?.data || [] : [];
          const requests = reqRes.status === "fulfilled" ? reqRes.value?.data || [] : [];

          const pendingRequests = requests.filter((r) => r.status === "PENDING" || r.status === "pending");
          if (pendingRequests.length > 0) {
            list.push({
              id: `admin-req-${pendingRequests.length}-${pendingRequests[0].id}`,
              type: "request",
              title: `${pendingRequests.length} Pending Access Request${pendingRequests.length > 1 ? "s" : ""}`,
              body: `${pendingRequests[0].displayName || pendingRequests[0].githubLogin} requested course access.`,
              time: "Action required",
              link: "/admin/requests",
              icon: UserCheck,
              tone: "amber",
            });
          }

          if (reviewQueue.length > 0) {
            list.push({
              id: `admin-rev-${reviewQueue.length}-${reviewQueue[0].id}`,
              type: "review",
              title: `${reviewQueue.length} Submission${reviewQueue.length > 1 ? "s" : ""} in Review Queue`,
              body: `Needs manual inspection: ${reviewQueue[0].problemTitle || "Solution submission"}.`,
              time: "Pending review",
              link: "/admin/review",
              icon: AlertCircle,
              tone: "amber",
            });
          }

          if (overview?.totalStudents > 0) {
            list.push({
              id: `admin-status-students`,
              type: "info",
              title: "Cohort Active",
              body: `${overview.totalStudents} students registered. Daily tracking active.`,
              time: "System",
              link: "/admin",
              icon: Sparkles,
              tone: "primary",
            });
          }
        } else {
          // Student role
          const [asgRes, subRes] = await Promise.allSettled([
            getStudentAssignments(user.studentId),
            getStudentSubmissions(user.studentId),
          ]);

          const assignments = asgRes.status === "fulfilled" ? asgRes.value?.data || [] : [];
          const submissions = subRes.status === "fulfilled" ? subRes.value?.data || [] : [];

          // 1. Check for upcoming due dates (within 3 days or overdue)
          const uncompleted = assignments.filter((a) => a.status !== "VERIFIED");
          const overdue = uncompleted.filter((a) => a.dueAt && Date.parse(a.dueAt) < now);
          const upcoming = uncompleted.filter(
            (a) => a.dueAt && Date.parse(a.dueAt) >= now && Date.parse(a.dueAt) - now < 3 * 86400000
          );

          if (overdue.length > 0) {
            list.push({
              id: `student-overdue-${overdue[0].id}`,
              type: "overdue",
              title: `Assignment Overdue: ${overdue[0].problem?.title || overdue[0].title}`,
              body: "Submit your solution to complete requirements.",
              time: "Overdue",
              link: `/app/problems/${overdue[0].problemId || ""}`,
              icon: Clock,
              tone: "rose",
            });
          }

          if (upcoming.length > 0) {
            list.push({
              id: `student-upcoming-${upcoming[0].id}`,
              type: "upcoming",
              title: `Due Soon: ${upcoming[0].problem?.title || upcoming[0].title}`,
              body: `Target deadline approaching on ${new Date(upcoming[0].dueAt).toLocaleDateString()}.`,
              time: "Upcoming",
              link: `/app/problems/${upcoming[0].problemId || ""}`,
              icon: Clock,
              tone: "amber",
            });
          }

          // 2. Recent submission results
          const recentVerified = submissions.find((s) => s.outcome === "VERIFIED" || s.eventType === "NEW_PROBLEM_VERIFIED");
          if (recentVerified) {
            list.push({
              id: `student-verified-${recentVerified.id}`,
              type: "verified",
              title: "Problem Verified!",
              body: `${recentVerified.problemTitle || "Recent submission"} passed all tests.`,
              time: "Verified",
              link: "/app/activity",
              icon: CheckCircle2,
              tone: "green",
            });
          }

          // 3. Daily Streak reminder
          list.push({
            id: `student-streak-${new Date().toISOString().slice(0, 10)}`,
            type: "streak",
            title: "Daily Streak Active",
            body: "Solve and commit code today to maintain your daily streak!",
            time: "Today",
            link: "/app",
            icon: Flame,
            tone: "amber",
          });
        }

        if (active) {
          setNotifications(list);
        }
      } catch (e) {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNotifications();
  }, [user]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    try {
      localStorage.setItem("solvers_read_notifications", JSON.stringify(updated));
    } catch {}
  };

  const handleItemClick = (item) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      try {
        localStorage.setItem("solvers_read_notifications", JSON.stringify(updated));
      } catch {}
    }
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-xl border border-[#E2E6F5] bg-white text-[#647096] hover:text-[#151936] hover:border-primary/40 shadow-2xs transition cursor-pointer"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC4545] px-1 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-[#E2E6F5] bg-white p-3 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#E2E6F5]">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-[#151936]">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} new
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-[#647096]">
                  All read
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto scroll-region pr-0.5">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#647096]">
                <Bell className="size-6 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-[#151936]">No notifications</p>
                <p className="text-[11px] mt-0.5">You're completely up to date!</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !readIds.includes(item.id);
                const Icon = item.icon || Bell;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`flex items-start gap-3 w-full p-2.5 rounded-xl text-left transition cursor-pointer border ${
                      isUnread
                        ? "bg-[#F8F8FF] border-primary/20 hover:bg-[#F0EFFE]"
                        : "bg-white border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                        item.tone === "green"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : item.tone === "rose"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : item.tone === "amber"
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-indigo-50 text-primary border border-indigo-100"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1 leading-snug">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs truncate ${isUnread ? "font-bold text-[#151936]" : "font-semibold text-[#647096]"}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[#8F9BB3] shrink-0 font-medium">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#647096] mt-0.5 line-clamp-2 leading-tight">
                        {item.body}
                      </p>
                    </div>

                    {isUnread && (
                      <span className="size-2 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
