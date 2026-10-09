import { Navigate, Route, Routes } from "react-router-dom";
import { StudentLayout, AdminLayout, ProtectedRoute } from "./layouts/AppLayouts.jsx";
import { AccessStatusPage, AuthFinishPage } from "./features/auth/AuthPages.jsx";
import { SignInPage, AdminLoginPage } from "./features/auth/LoginPageOnly.jsx";
import { StudentDashboardConcept as StudentDashboard } from "./features/dashboard/StudentDashboardConcept.jsx";
import { AdminDashboard } from "./features/dashboard/AdminDashboard.jsx";
import { ProblemsPage, ProblemDetailPage } from "./features/problems/ProblemsPages.jsx";
import { ProblemsAdminPage, ProblemFormPage } from "./features/problems/ProblemsAdmin.jsx";
import { ActivityPage } from "./features/github-activity/ActivityPage.jsx";
import { ReportPage } from "./features/reports/ReportPage.jsx";
import { StudentLeaderboardPage, Leaderboard } from "./features/leaderboard/Leaderboard.jsx";
import { AccessQueuePage } from "./features/approval/AccessQueuePage.jsx";
import { StudentsPage, StudentDetailPage } from "./features/students/StudentsPages.jsx";
import { ReviewQueuePage, ReviewDetailPage } from "./features/review/ReviewPages.jsx";
import { IntegrationPage, AuditPage } from "./features/admin/AdminOpsPages.jsx";
import { ForbiddenPage, NotFoundPage } from "./pages/SystemPages.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/sign-in" replace />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/auth/finish" element={<AuthFinishPage />} />
      <Route path="/access-status" element={<AccessStatusPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route element={<ProtectedRoute allow="student"><StudentLayout /></ProtectedRoute>}>
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/app/dashboard" element={<StudentDashboard />} />
        <Route path="/app/problems" element={<ProblemsPage />} />
        <Route path="/app/problems/:id" element={<ProblemDetailPage />} />
        <Route path="/app/activity" element={<ActivityPage />} />
        <Route path="/app/report" element={<ReportPage />} />
        <Route path="/app/leaderboard" element={<StudentLeaderboardPage />} />
      </Route>

      <Route element={<ProtectedRoute allow="admin"><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/requests" element={<AccessQueuePage />} />
        <Route path="/admin/problems" element={<ProblemsAdminPage />} />
        <Route path="/admin/problems/new" element={<ProblemFormPage />} />
        <Route path="/admin/problems/:id/edit" element={<ProblemFormPage />} />
        <Route path="/admin/students" element={<StudentsPage />} />
        <Route path="/admin/students/:id" element={<StudentDetailPage />} />
        <Route path="/admin/review" element={<ReviewQueuePage />} />
        <Route path="/admin/review/:id" element={<ReviewDetailPage />} />
        <Route path="/admin/leaderboard" element={<Leaderboard title="Class leaderboard" />} />
        <Route path="/admin/integration" element={<IntegrationPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
