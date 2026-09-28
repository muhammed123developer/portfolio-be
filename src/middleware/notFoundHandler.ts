import type { NextFunction, Request, Response } from 'express'
import { notFound } from '../utils/AppError'

/**
 * Catches requests that matched no route and converts them into a 404 AppError,
 * so an unknown URL returns the same JSON envelope as every other error rather
 * than Express's default HTML page.
 *
 * Registered after all routes but before errorHandler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFound(`Route ${req.method} ${req.originalUrl} does not exist`))
}
