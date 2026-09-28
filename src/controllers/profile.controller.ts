import type { Request, Response } from 'express'

import type { ProfileService } from '../services/profile.service'
import type { StatsService } from '../services/stats.service'
import type { UpdateProfileInput } from '../types/domain'
import { asyncHandler } from '../middleware/asyncHandler'
import { sendSuccess } from '../utils/apiResponse'

/**
 * Profile and dashboard-statistics endpoints.
 *
 * Grouped together because both are singletons rather than collections, so
 * neither justifies a controller of its own.
 */
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly stats: StatsService
  ) {}

  /** GET /api/profile — public. Backs the Home hero and the About page. */
  get = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.profile.get())
  })

  /** PUT /api/profile — admin. Partial update from the Settings screen. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const profile = await this.profile.update(req.body as UpdateProfileInput)
    sendSuccess(res, profile)
  })

  /** GET /api/admin/stats — admin. All seven dashboard cards in one request. */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, await this.stats.get())
  })
}
