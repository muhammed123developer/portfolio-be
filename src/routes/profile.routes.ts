import { Router, type RequestHandler } from 'express'

import type { ProfileController } from '../controllers/profile.controller'
import { updateProfileValidator } from '../validators/profile.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'

/** Profile routes: public read (hero and About), admin write (Settings). */
export function createProfileRoutes(
  controller: ProfileController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.get('/', controller.get)
  router.put('/', requireAuth, verifyCsrf, updateProfileValidator, handleValidation, controller.update)

  return router
}

/** Admin-only dashboard statistics, mounted separately at /api/admin. */
export function createAdminRoutes(
  controller: ProfileController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.get('/stats', requireAuth, controller.getStats)

  return router
}
