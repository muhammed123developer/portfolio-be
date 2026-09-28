import { Router, type RequestHandler } from 'express'

import type { ExperienceController } from '../controllers/experience.controller'
import {
  createExperienceValidator,
  deleteExperienceValidator,
  updateExperienceValidator,
} from '../validators/experience.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'

/** Experience routes: public read, authenticated write. */
export function createExperienceRoutes(
  controller: ExperienceController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.get('/', controller.list)

  router.post(
    '/',
    requireAuth,
    verifyCsrf,
    createExperienceValidator,
    handleValidation,
    controller.create
  )

  router.put(
    '/:id',
    requireAuth,
    verifyCsrf,
    updateExperienceValidator,
    handleValidation,
    controller.update
  )

  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    deleteExperienceValidator,
    handleValidation,
    controller.remove
  )

  return router
}
