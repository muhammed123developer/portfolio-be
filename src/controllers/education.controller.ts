import type { Request, Response } from 'express'

import type { EducationService } from '../services/education.service'
import type { CreateEducationInput, UpdateEducationInput } from '../types/domain'
import { asyncHandler } from '../middleware/asyncHandler'
import { sendCreated, sendSuccess } from '../utils/apiResponse'

/** Education endpoints. Mirrors ExperienceController. */
export class EducationController {
  constructor(private readonly education: EducationService) {}

  /** GET /api/education — public. */
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.education.list())
  })

  /** POST /api/education — admin. */
  create = asyncHandler(async (req: Request, res: Response) => {
    const entry = await this.education.create(req.body as CreateEducationInput)
    sendCreated(res, entry)
  })

  /** PUT /api/education/:id — admin. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const entry = await this.education.update(
      req.params.id as string,
      req.body as UpdateEducationInput
    )
    sendSuccess(res, entry)
  })

  /** DELETE /api/education/:id — admin. */
  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.education.remove(req.params.id as string)
    sendSuccess(res, { deleted: true })
  })
}
