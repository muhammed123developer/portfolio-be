import type { Request, Response } from 'express'

import type { SkillService } from '../services/skill.service'
import type { CreateSkillInput, UpdateSkillInput } from '../types/domain'
import type { SkillCategory } from '../types/enums'
import { asyncHandler } from '../middleware/asyncHandler'
import { sendCreated, sendSuccess } from '../utils/apiResponse'
import { queryData } from '../utils/requestData'

/**
 * Skill endpoints.
 *
 * The public list is returned grouped by category in declaration order, so the
 * frontend can render sections straight from the response without regrouping.
 */
export class SkillController {
  constructor(private readonly skills: SkillService) {}

  /** GET /api/skills — public, optionally filtered by category. */
  list = asyncHandler(async (req: Request, res: Response) => {
    // Via queryData(), not req.query — see utils/requestData.ts.
    const { category } = queryData<{ category: string }>(req)
    const skills = await this.skills.list(
      category ? { category: category as SkillCategory } : undefined
    )
    sendSuccess(res, skills)
  })

  /** POST /api/skills — admin. */
  create = asyncHandler(async (req: Request, res: Response) => {
    const skill = await this.skills.create(req.body as CreateSkillInput)
    sendCreated(res, skill)
  })

  /** PUT /api/skills/:id — admin. Also how reordering is applied. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const skill = await this.skills.update(req.params.id as string, req.body as UpdateSkillInput)
    sendSuccess(res, skill)
  })

  /** DELETE /api/skills/:id — admin. */
  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.skills.remove(req.params.id as string)
    sendSuccess(res, { deleted: true })
  })
}
