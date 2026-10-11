/**
 * Real HTTP client for the Express backend (Phase 2).
 *
 * - Base URL comes from `VITE_API_BASE_URL` (see `.env.example`). When it is
 *   empty, the app runs in demo mode and `services/api.js` serves mock data.
 * - Cookie sessions (`credentials: "include"`) + double-submit CSRF tokens:
 *   state-changing requests carry the `X-CSRF-Token` header, refreshed from
 *   `GET /api/v1/auth/csrf`. A single transparent retry covers rotation
 *   (e.g. after login regenerates the session).
 * - Errors are normalized to `{ message, code, status, details, retryAfter }`
 *   matching the backend's stable error shape.
 */

const viteBase = import.meta.env?.VITE_API_BASE_URL ?? "";
// Node fallback (tests / scripts): import.meta.env only exists under Vite.
const nodeBase = typeof process !== "undefined" ? (process.env.VITE_API_BASE_URL ?? "") : "";
// Automatic production fallback to the deployed Render backend
const prodFallback = import.meta.env?.PROD ? "https://solvers-backend.onrender.com" : "";
const BASE = (viteBase || nodeBase || prodFallback).replace(/\/$/, "");

export function isLive() {
  return BASE.length > 0;
}

export function apiBaseUrl() {
  return BASE;
}

let csrfToken = null;

async function fetchCsrfToken() {
  const res = await fetch(`${BASE}/api/v1/auth/csrf`, { credentials: "include" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Could not establish a session with the server.");
  csrfToken = body?.data?.csrfToken ?? null;
  return csrfToken;
}

function toApiError(res, body) {
  const err = new Error(body?.error?.message || `Request failed (${res.status})`);
  err.code = body?.error?.code;
  err.status = res.status;
  err.details = body?.error?.details;
  const headerRetry = res.headers.get("retry-after");
  err.retryAfter = body?.error?.retryAfter
    ?? (headerRetry != null && headerRetry !== "" ? Number(headerRetry) : undefined);
  return err;
}

function isCsrfFailure(res, body) {
  return res.status === 403 && /csrf/i.test(body?.error?.message ?? "");
}

export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  if (!isLive()) {
    throw new Error("Backend is not configured (VITE_API_BASE_URL is empty).");
  }
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  if (mutating && !csrfToken) {
    try {
      await fetchCsrfToken();
    } catch {
      // Continue without a token; the server will answer 403 explicitly.
    }
  }

  const send = async (token) => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token && mutating ? { "x-csrf-token": token } : {}),
        ...(headers ?? {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const responseBody = await res.json().catch(() => ({}));
    return { res, responseBody };
  };

  let { res, responseBody } = await send(csrfToken);
  if (isCsrfFailure(res, responseBody)) {
    // Token may have rotated (e.g. fresh login): refresh once and retry.
    try {
      await fetchCsrfToken();
    } catch {
      throw toApiError(res, responseBody);
    }
    ({ res, responseBody } = await send(csrfToken));
  }
  if (!res.ok) throw toApiError(res, responseBody);
  return responseBody;
}

export function clearCsrfToken() {
  csrfToken = null;
}

export const routes = {
  me: "/api/v1/auth/me",
  oauthStart: "/api/v1/auth/github/start",
  adminLogin: "/api/v1/auth/admin/login",
  logout: "/api/v1/auth/logout",
  csrf: "/api/v1/auth/csrf",
  leaderboard: "/api/v1/leaderboard",
  assignments: "/api/v1/assignments",
  progressMe: "/api/v1/progress/me",
  accessRequests: "/api/v1/access-requests",
  ownRequest: "/api/v1/access-requests/me",
  adminRequests: "/api/v1/admin/access-requests",
  adminProblems: "/api/v1/admin/problems",
  adminAssignments: "/api/v1/admin/assignments",
  adminStudents: "/api/v1/admin/students",
  adminSubmissions: "/api/v1/admin/submissions",
  reviewQueue: "/api/v1/admin/submissions/review-queue",
  auditLog: "/api/v1/admin/audit-log",
  integrationStatus: "/api/v1/admin/github/integration-status",
  adminOverview: "/api/v1/admin/overview",
  adminTrackingPolicy: "/api/v1/admin/tracking-policy",
};
