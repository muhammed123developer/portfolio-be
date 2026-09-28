import type { Request, Response } from 'express'

import type { AuthService } from '../services/auth.service'
import { asyncHandler } from '../middleware/asyncHandler'
import { sendSuccess } from '../utils/apiResponse'
import { AUTH_COOKIE, clearAuthCookies, setAuthCookies } from '../utils/cookies'
import { unauthorized } from '../utils/AppError'

/**
 * Authentication endpoints.
 *
 * The controller owns HTTP concerns only — reading the request, setting
 * cookies, shaping the response. Credential checking and token issuing live in
 * AuthService, which knows nothing about Express.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   *
   * The token is returned in an httpOnly cookie, never in the response body.
   * The body carries the admin and the CSRF token the client must echo back
   * on subsequent mutations.
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string }

    const { admin, token } = await this.authService.login(email, password)
    const csrfToken = setAuthCookies(res, token)

    sendSuccess(res, { admin, csrfToken })
  })

  /**
   * POST /api/auth/logout
   *
   * Deletes the server-side session, so the token stops working even if a
   * copy of it survives somewhere, then clears both cookies. Does not require
   * a live session: logging out after the session already expired must still
   * clear the cookies rather than fail with a 401.
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.logout(req.cookies?.[AUTH_COOKIE] as string | undefined)
    clearAuthCookies(res)
    sendSuccess(res, { message: 'Logged out' })
  })

  /**
   * GET /api/auth/me
   *
   * Used by the frontend on load to decide whether a session already exists,
   * so a returning admin lands straight in the panel rather than on the login
   * screen. Runs behind requireAuth, so `req.admin` is always populated.
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.admin) {
      // Unreachable behind requireAuth; belt and braces so a future routing
      // mistake fails closed rather than returning undefined.
      throw unauthorized('Authentication required')
    }

    sendSuccess(res, { admin: req.admin })
  })
}
