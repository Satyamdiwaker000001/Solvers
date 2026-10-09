import {
  LayoutDashboard,
  BookOpenCheck,
  GitBranch,
  FileBarChart2,
  Trophy,
  Users,
  Inbox,
  Library,
  ScanSearch,
  ScrollText,
  Activity,
} from "lucide-react";

export const studentNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, end: false },
  { to: "/app/problems", label: "Problems", icon: BookOpenCheck, end: false },
  { to: "/app/activity", label: "GitHub Activity", icon: GitBranch, end: false },
  { to: "/app/report", label: "My Report", icon: FileBarChart2, end: false },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy, end: false },
];

export const adminNav = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/requests", label: "Access Requests", icon: Inbox, end: false, badgeKey: "pendingRequests" },
  { to: "/admin/problems", label: "Problems", icon: Library, end: false },
  { to: "/admin/students", label: "Students", icon: Users, end: false },
  { to: "/admin/review", label: "Review Queue", icon: ScanSearch, end: false, badgeKey: "needsReview" },
  { to: "/admin/leaderboard", label: "Leaderboard", icon: Trophy, end: false },
  { to: "/admin/integration", label: "Integration", icon: Activity, end: false },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText, end: false },
];
