import type { Request, Response } from 'express'

import type { ImageKind, UploadService } from '../services/upload.service'
import { asyncHandler } from '../middleware/asyncHandler'
import { badRequest } from '../utils/AppError'
import { sendCreated } from '../utils/apiResponse'

/** Admin image uploads — profile picture and project thumbnails. */
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  /**
   * POST /api/uploads/:kind — admin. Multipart, single `image` field.
   * Returns `{ url }`; the client saves it with the normal profile/project update.
   */
  image = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('Choose an image to upload')
    const result = await this.uploads.uploadImage(req.file.buffer, req.params.kind as ImageKind)
    sendCreated(res, result)
  })
}
