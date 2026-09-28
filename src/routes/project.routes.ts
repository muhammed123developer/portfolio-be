import { Router, type RequestHandler } from 'express'

import type { ProjectController } from '../controllers/project.controller'
import {
  createProjectValidator,
  deleteProjectValidator,
  getProjectValidator,
  listProjectsValidator,
  updateProjectValidator,
} from '../validators/project.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'

/**
 * Project routes.
 *
 * The public/admin split is visible at a glance: reads are open, and every
 * mutation carries `requireAuth, verifyCsrf` before its validators. Putting
 * authentication first means an unauthenticated caller gets a 401 without the
 * server doing any validation work on their payload.
 */
export function createProjectRoutes(
  controller: ProjectController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  /* ---- Public ---- */
  router.get('/', listProjectsValidator, handleValidation, controller.list)
  router.get('/:slug', getProjectValidator, handleValidation, controller.getBySlug)

  /* ---- Admin ---- */
  router.post(
    '/',
    requireAuth,
    verifyCsrf,
    createProjectValidator,
    handleValidation,
    controller.create
  )

  router.put(
    '/:id',
    requireAuth,
    verifyCsrf,
    updateProjectValidator,
    handleValidation,
    controller.update
  )

  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    deleteProjectValidator,
    handleValidation,
    controller.remove
  )

  return router
}
