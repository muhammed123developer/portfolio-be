import { Router, type RequestHandler } from 'express'
import multer from 'multer'

import { env } from '../config/env'
import type { UploadController } from '../controllers/upload.controller'
import { uploadImageValidator } from '../validators/upload.validator'
import { handleValidation } from '../middleware/handleValidation'
import { uploadLimiter } from '../middleware/rateLimiters'
import { verifyCsrf } from '../middleware/verifyCsrf'
import { badRequest } from '../utils/AppError'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Held in memory and streamed straight to Cloudinary — nothing touches disk.
 * Size-capped so an oversized file is refused before it is buffered in full.
 */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) callback(null, true)
    else callback(badRequest('Only JPEG, PNG or WebP images can be uploaded'))
  },
}).single('image')

/** Upload routes: admin only, every one. */
export function createUploadRoutes(
  controller: UploadController,
  requireAuth: RequestHandler
): Router {
  const router = Router()

  router.post(
    '/:kind',
    requireAuth,
    verifyCsrf,
    uploadLimiter,
    uploadImageValidator,
    handleValidation,
    imageUpload,
    controller.image
  )

  return router
}
