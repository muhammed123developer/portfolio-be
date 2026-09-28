import type { Request, Response } from 'express'

import type { ContactService } from '../services/contact.service'
import type { ContactMessageFilter } from '../repositories/types'
import type { MessageStatus } from '../types/enums'
import { asyncHandler } from '../middleware/asyncHandler'
import { buildPaginationMeta, sendCreated, sendPaginated, sendSuccess } from '../utils/apiResponse'
import { queryData } from '../utils/requestData'

/**
 * Contact endpoints.
 *
 * `submit` is the only public write in the application. Everything else is
 * inbox management and sits behind authentication — a visitor must not be able
 * to read other people's messages.
 */
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /**
   * POST /api/contact — public, rate limited.
   *
   * The response deliberately does not echo the stored message back: there is
   * nothing the sender needs from it, and returning the record would expose
   * the internal id and the recorded IP.
   */
  submit = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, subject, message } = req.body as {
      name: string
      email: string
      subject: string
      message: string
    }

    await this.contact.submit({
      name,
      email,
      subject,
      message,
      // With TRUST_PROXY set to the real hop count, this is the client IP
      // behind a reverse proxy rather than the proxy's own address.
      ipAddress: req.ip ?? null,
    })

    sendCreated(res, { message: 'Thank you — your message has been sent.' })
  })

  /**
   * GET /api/contact — admin only. Paginated, filterable by status.
   *
   * Query parameters come from `queryData()`, not `req.query` — see
   * utils/requestData.ts for why Express 5 makes that necessary.
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, search } = queryData<{
      page: number
      limit: number
      status: string
      search: string
    }>(req)

    const filter: ContactMessageFilter = {}
    if (typeof page === 'number') filter.page = page
    if (typeof limit === 'number') filter.limit = limit
    if (typeof status === 'string' && status) filter.status = status as MessageStatus
    if (typeof search === 'string' && search) filter.search = search

    const result = await this.contact.list(filter)
    sendPaginated(res, result.items, buildPaginationMeta(result.total, result.page, result.limit))
  })

  /** GET /api/contact/:id — admin. Opening a message marks it read. */
  get = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.contact.getAndMarkRead(req.params.id as string)
    sendSuccess(res, message)
  })

  /** PUT /api/contact/:id — admin. Status is the only mutable field. */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body as { status: MessageStatus }
    const message = await this.contact.setStatus(req.params.id as string, status)
    sendSuccess(res, message)
  })

  /** DELETE /api/contact/:id — admin. */
  remove = asyncHandler(async (req: Request, res: Response) => {
    await this.contact.remove(req.params.id as string)
    sendSuccess(res, { deleted: true })
  })
}
