import type { Request, Response } from 'express'

import type { TechnologyService } from '../services/technology.service'
import type { CreateTechnologyInput, UpdateTechnologyInput } from '../types/domain'
import { asyncHandler } from '../middleware/asyncHandler'
import { sendCreated, sendSuccess } from '../utils/apiResponse'

/**
 * Technology endpoints.
 *
 * Public read, because the project form's technology picker and the public
 * project filters both need the list.
 */
export class TechnologyController {
  constructor(private readonly technologies: TechnologyService) {}

  /** GET /api/technologies — public. */
  list = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.technologies.list())
  })

  /** POST /api/technologies — admin. 409 if the name is taken. */
  create = asyncHandler(async (req: Request, res: Response) => {
    const technology = await this.technologies.create(req.body as CreateTechnologyInput)
    sendCreated(res, technology)
  })

  /** PUT /api/technologies/:id — admin. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const technology = await this.technologies.update(
      req.params.id as string,
      req.body as UpdateTechnologyInput
    )
    sendSuccess(res, technology)
  })

  /**
   * DELETE /api/technologies/:id — admin.
   *
   * Reports how many projects the technology was detached from, so the admin
   * UI can say "removed from 3 projects" rather than leaving the cascade
   * invisible.
   */
  remove = asyncHandler(async (req: Request, res: Response) => {
    const { detachedFrom } = await this.technologies.remove(req.params.id as string)
    sendSuccess(res, { deleted: true, detachedFrom })
  })
}
