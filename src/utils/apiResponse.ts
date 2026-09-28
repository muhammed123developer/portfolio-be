import type { Response } from 'express'

/**
 * Every response this API sends goes through one of these helpers, so the
 * envelope documented in the README is guaranteed rather than merely intended:
 *
 *   success  { "success": true,  "data": ... }
 *   failure  { "success": false, "message": "...", "errors"?: { field: msg } }
 *
 * The frontend Axios interceptor relies on exactly this shape.
 */

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface SuccessBody<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ErrorBody {
  success: false
  message: string
  errors?: Record<string, string>
}

/** 200 (or the supplied status) with a data payload. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const body: SuccessBody<T> = { success: true, data }
  return res.status(statusCode).json(body)
}

/** 201 for a freshly created resource. */
export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201)
}

/** A list plus its pagination metadata. */
export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta): Response {
  const body: SuccessBody<T[]> = { success: true, data, meta }
  return res.status(200).json(body)
}

/** Only the error handler should call this — controllers throw AppError instead. */
export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string>
): Response {
  const body: ErrorBody = { success: false, message }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}

/** Builds pagination metadata from the raw count and the requested page. */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}
