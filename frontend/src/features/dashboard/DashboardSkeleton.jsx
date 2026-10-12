import { Sparkles, ShieldCheck } from "lucide-react";

/**
 * High-fidelity, enterprise-grade skeleton loader for Student Dashboard.
 * Mirrors the real production dashboard structure 1:1 with shimmering placeholders.
 */
export function StudentDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading student dashboard"
      className="flex flex-col gap-5 sm:gap-6 font-sans antialiased text-[#151936] w-full max-w-[1400px] mx-auto min-w-0 animate-in fade-in duration-300"
    >
      {/* 1. TOP WELCOME BANNER SKELETON */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#E2E6F5] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex-1 space-y-3.5">
            <div className="h-6 w-36 rounded-full bg-[#F0F2FD] animate-pulse" />
            <div className="h-9 w-64 sm:w-96 rounded-xl bg-[#F0F2FD] animate-pulse" />
            <div className="h-4 w-48 sm:w-64 rounded-lg bg-[#F0F2FD] animate-pulse" />
            <div className="flex items-center gap-3 pt-1">
              <div className="h-7 w-40 rounded-xl bg-[#F0F2FD] animate-pulse" />
              <div className="h-4 w-52 rounded-lg bg-[#F0F2FD] animate-pulse hidden sm:block" />
            </div>
          </div>
          {/* Circular mascot backdrop skeleton */}
          <div className="size-28 sm:size-36 rounded-full bg-gradient-to-tr from-[#EEECFF] to-[#F5F3FF] border border-[#E2E6F5] shrink-0 animate-pulse hidden md:block" />
        </div>
      </div>

      {/* 2. FOUR METRIC KPI CARDS SKELETON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-2xl bg-white p-4 border border-[#E2E6F5] shadow-xs"
          >
            <div className="size-11 rounded-xl bg-[#F0F2FD] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-24 rounded-lg bg-[#F0F2FD] animate-pulse" />
              <div className="h-3 w-16 rounded-md bg-[#F0F2FD] animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. MAIN DASHBOARD CONTENT GRID SKELETON */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column (7 cols): Assigned Problems & Submissions */}
        <div className="lg:col-span-7 space-y-5">
          {/* Problems Card */}
          <div className="rounded-3xl bg-white border border-[#E2E6F5] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F2FA]">
              <div className="h-5 w-44 rounded-lg bg-[#F0F2FD] animate-pulse" />
              <div className="h-4 w-20 rounded-md bg-[#F0F2FD] animate-pulse" />
            </div>
            {[1, 2, 3, 4].map((p) => (
              <div
                key={p}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#F0F2FA] bg-[#FAFBFD]"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 sm:w-60 rounded-md bg-[#F0F2FD] animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-3 w-12 rounded bg-[#F0F2FD] animate-pulse" />
                    <div className="h-3 w-16 rounded bg-[#F0F2FD] animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-20 rounded-xl bg-[#F0F2FD] animate-pulse" />
              </div>
            ))}
          </div>

          {/* Submissions Card */}
          <div className="rounded-3xl bg-white border border-[#E2E6F5] p-5 sm:p-6 shadow-xs space-y-3">
            <div className="h-5 w-40 rounded-lg bg-[#F0F2FD] animate-pulse mb-3" />
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="flex items-center justify-between py-2.5 border-b border-[#F0F2FA] last:border-0"
              >
                <div className="space-y-1">
                  <div className="h-4 w-36 rounded bg-[#F0F2FD] animate-pulse" />
                  <div className="h-3 w-20 rounded bg-[#F0F2FD] animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-[#F0F2FD] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Consistency & Leaderboard */}
        <div className="lg:col-span-5 space-y-5">
          {/* Consistency Heatmap Card */}
          <div className="rounded-3xl bg-white border border-[#E2E6F5] p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-36 rounded-lg bg-[#F0F2FD] animate-pulse" />
              <div className="h-4 w-16 rounded bg-[#F0F2FD] animate-pulse" />
            </div>
            <div className="h-32 w-full rounded-2xl bg-[#F0F2FD] animate-pulse" />
          </div>

          {/* Leaderboard Card */}
          <div className="rounded-3xl bg-white border border-[#E2E6F5] p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 w-32 rounded-lg bg-[#F0F2FD] animate-pulse" />
              <div className="h-4 w-14 rounded bg-[#F0F2FD] animate-pulse" />
            </div>
            {[1, 2, 3, 4, 5].map((r) => (
              <div
                key={r}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAFBFD] border border-[#F0F2FA]"
              >
                <div className="size-6 rounded-full bg-[#F0F2FD] animate-pulse shrink-0" />
                <div className="size-8 rounded-full bg-[#F0F2FD] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-28 rounded bg-[#F0F2FD] animate-pulse" />
                  <div className="h-2.5 w-16 rounded bg-[#F0F2FD] animate-pulse" />
                </div>
                <div className="h-4 w-10 rounded bg-[#F0F2FD] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * High-fidelity skeleton loader for Faculty Admin Dashboard.
 */
export function AdminDashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading admin dashboard"
      className="flex flex-col gap-6 font-sans antialiased text-[#151936] w-full max-w-[1400px] mx-auto min-w-0 animate-in fade-in duration-300"
    >
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E6F5]">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-xl bg-[#F0F2FD] animate-pulse" />
          <div className="h-4 w-80 rounded-lg bg-[#F0F2FD] animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-[#F0F2FD] animate-pulse" />
          <div className="h-9 w-32 rounded-xl bg-[#F0F2FD] animate-pulse" />
        </div>
      </div>

      {/* 4 Admin Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-5 border border-[#E2E6F5] shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-[#F0F2FD] animate-pulse" />
              <div className="size-8 rounded-lg bg-[#F0F2FD] animate-pulse" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-[#F0F2FD] animate-pulse" />
            <div className="h-3 w-36 rounded bg-[#F0F2FD] animate-pulse" />
          </div>
        ))}
      </div>

      {/* 2-Column Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-3xl bg-white border border-[#E2E6F5] p-6 shadow-xs space-y-4">
          <div className="h-6 w-44 rounded-lg bg-[#F0F2FD] animate-pulse mb-4" />
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="h-14 w-full rounded-xl bg-[#FAFBFD] border border-[#F0F2FA] animate-pulse"
            />
          ))}
        </div>
        <div className="lg:col-span-4 rounded-3xl bg-white border border-[#E2E6F5] p-6 shadow-xs space-y-4">
          <div className="h-6 w-36 rounded-lg bg-[#F0F2FD] animate-pulse mb-4" />
          <div className="h-48 w-full rounded-2xl bg-[#F0F2FD] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
