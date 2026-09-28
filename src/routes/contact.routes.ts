import { Router, type RequestHandler } from 'express'

import type { ContactController } from '../controllers/contact.controller'
import {
  deleteContactValidator,
  getContactValidator,
  listContactValidator,
  submitContactValidator,
  updateContactValidator,
} from '../validators/contact.validator'
import { handleValidation } from '../middleware/handleValidation'
import { verifyCsrf } from '../middleware/verifyCsrf'
import { contactLimiter } from '../middleware/rateLimiters'

/**
 * Contact routes.
 *
 * Note the asymmetry: POST is public (that is the whole point of a contact
 * form) while GET is admin-only, because the collection is an inbox rather
 * than public content. That is the reverse of every other resource here, and
 * getting it backwards would publish every message anyone ever sent.
 */
export function createContactRoutes(
  controller: ContactController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  /* ---- Public: submit only ---- */
  // Rate limited before validation, so spam costs as little work as possible.
  router.post('/', contactLimiter, submitContactValidator, handleValidation, controller.submit)

  /* ---- Admin: the inbox ---- */
  router.get('/', requireAuth, listContactValidator, handleValidation, controller.list)
  router.get('/:id', requireAuth, getContactValidator, handleValidation, controller.get)

  router.put(
    '/:id',
    requireAuth,
    verifyCsrf,
    updateContactValidator,
    handleValidation,
    controller.update
  )

  router.delete(
    '/:id',
    requireAuth,
    verifyCsrf,
    deleteContactValidator,
    handleValidation,
    controller.remove
  )

  return router
}
