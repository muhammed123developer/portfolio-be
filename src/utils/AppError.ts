/**
 * An error we threw deliberately, with an HTTP status attached.
 *
 * The central error handler trusts the message of an AppError and sends it to
 * the client. Any other error is treated as an unexpected bug: it is logged in
 * full server-side and reduced to a generic 500 for the client, so stack traces
 * and driver internals never leak.
 */
export class AppError extends Error {
  public readonly statusCode: number

  /** True for errors we raised on purpose, false for genuine bugs. */
  public readonly isOperational = true

  /** Field-level detail, used for 422 responses from express-validator. */
  public readonly errors?: Record<string, string>

  constructor(message: string, statusCode: number, errors?: Record<string, string>) {
    super(message)
    this.name = new.target.name
    this.statusCode = statusCode
    if (errors) this.errors = errors
    Error.captureStackTrace?.(this, new.target)
  }
}

/* ------------------------------------------------------------------------ *
 * Named constructors for the status codes this API uses.
 * Using these instead of `new AppError(msg, 404)` keeps intent obvious at the
 * call site and keeps status codes consistent across services.
 * ------------------------------------------------------------------------ */

/** 400 — the request itself is malformed. */
export const badRequest = (message = 'Bad request') => new AppError(message, 400)

/** 401 — not authenticated, or the session expired. */
export const unauthorized = (message = 'Authentication required') => new AppError(message, 401)

/** 403 — authenticated, but not allowed to do this. */
export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(message, 403)

/** 404 — the resource does not exist. */
export const notFound = (message = 'Resource not found') => new AppError(message, 404)

/** 409 — the request conflicts with existing state, e.g. a duplicate slug. */
export const conflict = (message = 'That resource already exists') => new AppError(message, 409)

/** 422 — well-formed request, but the values failed validation. */
export const validationFailed = (errors: Record<string, string>, message = 'Validation failed') =>
  new AppError(message, 422, errors)

/** 500 — something we did not anticipate. */
export const internal = (message = 'Something went wrong') => new AppError(message, 500)
