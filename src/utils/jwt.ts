import jwt, { type SignOptions } from 'jsonwebtoken'

import { env } from '../config/env'

/**
 * JSON Web Token signing and verification.
 *
 * The token carries only the admin's id and a session id. Anything else — name, email,
 * permissions — is looked up fresh on each request, so a token issued before a
 * change cannot carry stale data, and nothing sensitive sits in a value the
 * client can decode.
 */

export interface TokenPayload {
  /** Admin id. "sub" is the registered JWT claim for the subject. */
  sub: string
  /** Server-side session id — see AdminSession. */
  sid: string
}

/**
 * The only algorithm ever issued or accepted. Pinning it on verify means a
 * token can never choose its own algorithm (e.g. "none").
 */
const ALGORITHM = 'HS256'

export function signToken(adminId: string, sessionId: string): string {
  // The token lives exactly as long as the session's absolute cap; the idle
  // timeout and revocation are enforced against the session record.
  const options: SignOptions = {
    algorithm: ALGORITHM,
    expiresIn: Math.floor(env.sessionMaxMs / 1000),
  }
  return jwt.sign({ sub: adminId, sid: sessionId }, env.jwtSecret, options)
}

/**
 * Verifies a token and returns its payload.
 *
 * Throws `JsonWebTokenError` or `TokenExpiredError` on failure; the central
 * error handler already maps both to a 401, so callers do not catch here.
 */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] })

  // A token signed elsewhere could decode to a string or an object without
  // the expected claims, so the shape is checked rather than assumed.
  if (
    typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    !decoded.sub ||
    typeof decoded.sid !== 'string' ||
    !decoded.sid
  ) {
    throw new jwt.JsonWebTokenError('Token payload is missing its subject or session')
  }

  return { sub: decoded.sub, sid: decoded.sid }
}
