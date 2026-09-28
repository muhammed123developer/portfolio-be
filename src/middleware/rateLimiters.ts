import rateLimit, { type Options } from 'express-rate-limit'
import type { Request, Response } from 'express'

import { sendError } from '../utils/apiResponse'
import { env } from '../config/env'

/**
 * Rate limiting, tiered by how much damage abuse of an endpoint could do.
 *
 * All limiters share one 429 handler so a throttled client gets the same JSON
 * envelope as every other error rather than express-rate-limit's plain text.
 */

function tooManyRequests(message: string) {
  return (_req: Request, res: Response): void => {
    sendError(res, message, 429)
  }
}

const shared: Partial<Options> = {
  standardHeaders: 'draft-7', // RateLimit-* response headers
  legacyHeaders: false, // drop the deprecated X-RateLimit-* headers
  // Limits would make the test suite flaky and prove nothing; the limiters
  // themselves are covered by a dedicated test that enables them explicitly.
  skip: () => env.isTest,
}

/** Broad protection for the whole API. Generous enough to be invisible to real users. */
export const generalLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  handler: tooManyRequests('Too many requests. Please try again in a few minutes.'),
})

/**
 * Login is the highest-value target on the API, so it gets the tightest limit.
 * Successful logins are not counted — only failures burn the allowance, so a
 * legitimate admin is never locked out by their own activity.
 */
export const authLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: tooManyRequests('Too many login attempts. Please try again in 15 minutes.'),
})

/**
 * Failed logins per account, whatever IP they come from — the per-IP limiter
 * alone lets an attacker with many addresses keep guessing one password.
 * Runs after validation, so the key is the normalised email. Same window and
 * allowance as the per-IP limit; successful logins are not counted.
 *
 * Trade-off: someone who knows the admin email can deliberately trip this
 * and block logins to that account for the rest of the window.
 */
export const authAccountLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => `login:${String(req.body?.email ?? '').toLowerCase()}`,
  handler: tooManyRequests('Too many login attempts. Please try again in 15 minutes.'),
})

/** The contact form is public and writes to the database, so it is spam-prone. */
export const contactLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  handler: tooManyRequests('You have sent several messages already. Please try again later.'),
})

/** Uploads are authenticated, but still worth capping — they consume disk. */
export const uploadLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 40,
  handler: tooManyRequests('Too many uploads. Please try again shortly.'),
})
