import { Router, type RequestHandler } from 'express'

import type { SkillController } from '../controllers/skill.controller'
import {
  createSkillValidator,
  deleteSkillValidator,
  listSkillsValidator,
  updateSkillValidator,
} from '../validators/skill.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'

/** Skill routes: public read, authenticated write. */
export function createSkillRoutes(
  controller: SkillController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.get('/', listSkillsValidator, handleValidation, controller.list)

  router.post('/', requireAuth, verifyCsrf, createSkillValidator, handleValidation, controller.create)

  // Reordering is a plain PUT on displayOrder — no bespoke reorder endpoint.
  router.put('/:id', requireAuth, verifyCsrf, updateSkillValidator, handleValidation, controller.update)

  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    deleteSkillValidator,
    handleValidation,
    controller.remove
  )

  return router
}
