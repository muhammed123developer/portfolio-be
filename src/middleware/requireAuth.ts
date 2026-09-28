import type { NextFunction, Request, RequestHandler, Response } from 'express'

import type { AuthService } from '../services/auth.service'
import { unauthorized } from '../utils/AppError'
import { AUTH_COOKIE } from '../utils/cookies'

/**
 * Rejects unauthenticated requests and attaches the admin to `req.admin`.
 *
 * Built as a factory taking the AuthService, so the middleware is wired at the
 * composition root like everything else rather than importing a singleton.
 *
 * Reads the token from the httpOnly cookie. A Bearer header is deliberately
 * NOT accepted: supporting both would reintroduce the XSS exposure the cookie
 * exists to avoid, and give an attacker a second path to try.
 */
export function createRequireAuth(authService: AuthService): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[AUTH_COOKIE] as string | undefined

      if (!token) {
        throw unauthorized('Authentication required')
      }

      const { admin, sessionId } = await authService.authenticate(token)
      req.admin = admin
      req.sessionId = sessionId
      next()
    } catch (error) {
      next(error)
    }
  }
}
