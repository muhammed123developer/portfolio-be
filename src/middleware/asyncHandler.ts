import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Wraps an async route handler so a rejected promise reaches the central error
 * handler instead of hanging the request.
 *
 * Express 5 already forwards rejected promises, but wrapping explicitly keeps
 * the intent visible at every call site, keeps handlers portable back to
 * Express 4, and means controllers never need a try/catch purely to call next().
 */
export function asyncHandler<T extends Request = Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req as T, res, next)).catch(next)
  }
}
