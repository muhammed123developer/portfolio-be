import type { Request, Response } from 'express'

import type { ExperienceService } from '../services/experience.service'
import type { CreateExperienceInput, UpdateExperienceInput } from '../types/domain'
import { asyncHandler } from '../middleware/asyncHandler'
import { sendCreated, sendSuccess } from '../utils/apiResponse'

/**
 * Experience endpoints.
 *
 * Not paginated: a career timeline is a short list that the page renders in
 * full, so paginating it would add ceremony without benefit.
 */
export class ExperienceController {
  constructor(private readonly experience: ExperienceService) {}

  /** GET /api/experience — public. */
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.experience.list())
  })

  /** POST /api/experience — admin. */
  create = asyncHandler(async (req: Request, res: Response) => {
    const entry = await this.experience.create(req.body as CreateExperienceInput)
    sendCreated(res, entry)
  })

  /** PUT /api/experience/:id — admin. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const entry = await this.experience.update(
      req.params.id as string,
      req.body as UpdateExperienceInput
    )
    sendSuccess(res, entry)
  })

  /** DELETE /api/experience/:id — admin. */
  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.experience.remove(req.params.id as string)
    sendSuccess(res, { deleted: true })
  })
}
