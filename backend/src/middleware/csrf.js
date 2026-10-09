import crypto from "node:crypto";
import { forbidden } from "./errors.js";

const COOKIE_NAME = "csrf-token";
const HEADER_NAME = "x-csrf-token";

/**
 * Double-submit CSRF protection for cookie sessions: a random token is stored
 * in the session and mirrored in a readable cookie; state-changing requests
 * must echo it in the X-CSRF-Token header. Safe methods and the OAuth
 * handshake itself are exempt (OAuth uses its own `state` parameter).
 */
export function ensureCsrfToken(req, res, next) {
  try {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    const cookieOpts = {
      httpOnly: false,
      sameSite: "lax",
      secure: req.app.get("csrfSecureCookies") === true,
      maxAge: 12 * 3_600_000,
      path: "/",
    };
    res.cookie(COOKIE_NAME, req.session.csrfToken, cookieOpts);
    return next();
  } catch (err) {
    return next(err);
  }
}

export function checkCsrfToken(req, _res, next) {
  const sent = req.get(HEADER_NAME);
  const expected = req.session && req.session.csrfToken;
  if (!expected || !sent || sent !== expected) {
    return next(forbidden("FORBIDDEN", "Missing or invalid CSRF token"));
  }
  return next();
}

export function rotateCsrfToken(req) {
  req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  return req.session.csrfToken;
}
