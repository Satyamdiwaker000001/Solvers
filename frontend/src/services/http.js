/**
 * Real HTTP client stub for backend integration (NOT used yet).
 * When the Express API is ready, services/api.js functions should call these
 * helpers against VITE_API_BASE_URL instead of the mock dataset.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || `Request failed (${res.status})`);
    err.code = body.code;
    err.status = res.status;
    throw err;
  }
  return body;
}

export const routes = {
  me: "/api/v1/me",
  leaderboard: "/api/v1/leaderboard",
  assignments: "/api/v1/assignments",
  progressMe: "/api/v1/progress/me",
  adminRequests: "/api/v1/admin/access-requests",
};
