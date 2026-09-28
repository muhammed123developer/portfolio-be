import type { Request, Response } from 'express'

import type { ProjectService } from '../services/project.service'
import type { ProjectFilter } from '../repositories/types'
import type { CreateProjectInput, UpdateProjectInput } from '../types/domain'
import type { ProjectStatus } from '../types/enums'
import { asyncHandler } from '../middleware/asyncHandler'
import { buildPaginationMeta, sendCreated, sendPaginated, sendSuccess } from '../utils/apiResponse'
import { queryData } from '../utils/requestData'

/**
 * Project endpoints.
 *
 * Thin by design: read the request, delegate, shape the response. No business
 * rules, no storage access. Everything here has already been validated by the
 * chains in validators/project.validator.ts, so no argument is re-checked.
 */
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  /** GET /api/projects — public, paginated and filterable. */
  list = asyncHandler(async (req: Request, res: Response) => {
    const filter = this.readFilter(req)
    const result = await this.projects.list(filter)

    sendPaginated(res, result.items, buildPaginationMeta(result.total, result.page, result.limit))
  })

  /** GET /api/projects/:slug — public. Slug, not id, is the public key. */
  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.projects.getBySlug(req.params.slug as string)
    sendSuccess(res, project)
  })

  /** POST /api/projects — admin. */
  create = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.projects.create(req.body as CreateProjectInput)
    sendCreated(res, project)
  })

  /** PUT /api/projects/:id — admin. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const project = await this.projects.update(
      req.params.id as string,
      req.body as UpdateProjectInput
    )
    sendSuccess(res, project)
  })

  /** DELETE /api/projects/:id — admin. */
  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.projects.remove(req.params.id as string)
    sendSuccess(res, { deleted: true })
  })

  /**
   * Translates query parameters into a domain filter.
   *
   * Reads through `queryData()` rather than `req.query`: Express 5 rebuilds
   * `req.query` on every access, so express-validator's `.toInt()` and
   * `.toBoolean()` sanitisers never survive to be read there. See
   * utils/requestData.ts.
   */
  private readFilter(req: Request): ProjectFilter {
    const { page, limit, featured, status, technology, search, sort } = queryData<{
      page: number
      limit: number
      featured: boolean
      status: string
      technology: string
      search: string
      sort: string
    }>(req)

    const filter: ProjectFilter = {}

    if (typeof page === 'number') filter.page = page
    if (typeof limit === 'number') filter.limit = limit
    if (typeof featured === 'boolean') filter.featured = featured
    if (typeof status === 'string') filter.status = status as ProjectStatus
    if (typeof technology === 'string' && technology) filter.technologySlug = technology
    if (typeof search === 'string' && search) filter.search = search
    if (sort === 'newest' || sort === 'oldest' || sort === 'order') filter.sort = sort

    return filter
  }
}
