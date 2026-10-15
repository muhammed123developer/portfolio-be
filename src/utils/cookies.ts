import crypto from 'node:crypto'
import type { CookieOptions, Response } from 'express'

import { env } from '../config/env'

/**
 * Session cookie handling.
 *
 * The JWT is delivered in an httpOnly cookie rather than in the response body,
 * so JavaScript on the page can never read it — an XSS flaw cannot exfiltrate
 * the session. The trade-off is that browsers attach cookies automatically to
 * cross-site requests, which is what CSRF exploits, so a second readable
 * cookie carries a token the client must echo back in a header. See
 * middleware/verifyCsrf.ts.
 */

/** httpOnly — the session token itself. */
export const AUTH_COOKIE = 'token'

/** Readable by JavaScript on purpose — the CSRF double-submit value. */
export const CSRF_COOKIE = 'csrfToken'

/** Header the frontend echoes the CSRF cookie back in. */
export const CSRF_HEADER = 'x-csrf-token'

function baseOptions(): CookieOptions {
  return {
    // When served over HTTPS (production cross-site Vercel <-> Render),
    // sameSite must be 'none' so browsers attach the cookie on cross-site fetches.
    // In local development over HTTP, browsers reject 'none' without secure, so use 'lax'.
    sameSite: env.cookieSecure ? 'none' : 'lax',
    secure: env.cookieSecure,
    path: '/',
    // No maxAge/expires: a browser-session cookie, gone when the browser
    // closes. How long the login lasts is enforced server-side (idle timeout
    // and absolute cap on the session record), not by the cookie.
  }
}

/** Sets both cookies. Called on successful login. */
export function setAuthCookies(res: Response, token: string): string {
  res.cookie(AUTH_COOKIE, token, { ...baseOptions(), httpOnly: true })

  // 32 random bytes; the value is meaningless, only the match matters.
  const csrfToken = crypto.randomBytes(32).toString('hex')
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseOptions(), httpOnly: false })

  return csrfToken
}

/**
 * Clears both cookies. Called on logout.
 *
 * The options must match those used when setting them, or the browser treats
 * it as a different cookie and quietly leaves the original in place.
 */
export function clearAuthCookies(res: Response): void {
  const options = baseOptions()
  res.clearCookie(AUTH_COOKIE, { ...options, httpOnly: true })
  res.clearCookie(CSRF_COOKIE, { ...options, httpOnly: false })
}
