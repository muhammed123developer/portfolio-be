import { Router, type RequestHandler } from 'express'

import type { AuthController } from '../controllers/auth.controller'
import { loginValidator } from '../validators/auth.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'
import { authAccountLimiter, authLimiter } from '../middleware/rateLimiters'

/**
 * Authentication routes.
 *
 * The middleware order on login is deliberate: throttle before doing any work,
 * validate before touching the service, and only then run bcrypt — which is
 * intentionally expensive and must not be reachable by an unthrottled caller.
 */
export function createAuthRoutes(
  controller: AuthController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  // Nothing about a login or a session should be kept by a browser or proxy cache.
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Per-IP limit first (cheap), then validation, then a per-account limit on
  // the normalised email so guesses cannot be spread across many IPs.
  router.post(
    '/login',
    authLimiter,
    loginValidator,
    handleValidation,
    authAccountLimiter,
    controller.login
  )

  // Logout needs CSRF: without it, any site could log the admin out on every
  // page load, which is a real if minor nuisance attack. It deliberately does
  // not need a live session — see AuthController.logout.
  router.post('/logout', verifyCsrf, controller.logout)

  router.get('/me', requireAuth, controller.me)

  return router
}
