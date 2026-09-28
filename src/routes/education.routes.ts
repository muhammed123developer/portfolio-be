import { Router, type RequestHandler } from 'express'

import type { EducationController } from '../controllers/education.controller'
import {
  createEducationValidator,
  deleteEducationValidator,
  updateEducationValidator,
} from '../validators/education.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'

/** Education routes: public read, authenticated write. */
export function createEducationRoutes(
  controller: EducationController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.get('/', controller.list)

  router.post(
    '/',
    requireAuth,
    verifyCsrf,
    createEducationValidator,
    handleValidation,
    controller.create
  )

  router.put(
    '/:id',
    requireAuth,
    verifyCsrf,
    updateEducationValidator,
    handleValidation,
    controller.update
  )

  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    deleteEducationValidator,
    handleValidation,
    controller.remove
  )

  return router
}
