import { Router, type RequestHandler } from 'express'

import type { TechnologyController } from '../controllers/technology.controller'
import {
  createTechnologyValidator,
  deleteTechnologyValidator,
  updateTechnologyValidator,
} from '../validators/technology.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'

/** Technology routes: public read, authenticated write. */
export function createTechnologyRoutes(
  controller: TechnologyController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.get('/', controller.list)

  router.post(
    '/',
    requireAuth,
    verifyCsrf,
    createTechnologyValidator,
    handleValidation,
    controller.create
  )

  router.put(
    '/:id',
    requireAuth,
    verifyCsrf,
    updateTechnologyValidator,
    handleValidation,
    controller.update
  )

  // Deleting also detaches the technology from every project — see
  // TechnologyService.remove().
  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    deleteTechnologyValidator,
    handleValidation,
    controller.remove
  )

  return router
}
