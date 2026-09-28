import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

import { forbidden } from '../utils/AppError'
import { CSRF_COOKIE, CSRF_HEADER } from '../utils/cookies'

/**
 * CSRF protection, using the double-submit cookie pattern.
 *
 * Why this is needed: the session lives in a cookie, and browsers attach
 * cookies automatically to any request to this origin — including one
 * triggered by a form on an attacker's site. Authentication alone therefore
 * does not prove the *user* intended the request.
 *
 * The defence: at login the server sets a random value in a readable cookie.
 * The frontend's Axios interceptor reads it and echoes it in a header. An
 * attacker's page can cause the cookie to be sent, but the same-origin policy
 * stops it reading the cookie's value, so it cannot set the matching header.
 *
 * SameSite=Lax on the cookies already blocks the common cases; this is the
 * second layer, and the one that still holds if that attribute is ever
 * loosened for an embedding or OAuth flow.
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  // Safe methods do not change state, so they need no token.
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next()
    return
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined
  const headerValue = req.get(CSRF_HEADER)

  if (!cookieToken || !headerValue) {
    next(forbidden('Missing CSRF token. Please refresh the page and try again.'))
    return
  }

  if (!safeEquals(cookieToken, headerValue)) {
    next(forbidden('Invalid CSRF token. Please refresh the page and try again.'))
    return
  }

  next()
}

/**
 * Constant-time comparison.
 *
 * `===` short-circuits at the first differing character, so the time it takes
 * leaks how much of the value was correct. That is enough to guess a token
 * byte by byte given enough attempts.
 */
function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  // timingSafeEqual throws on a length mismatch, so that is checked first —
  // length is not secret.
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}
