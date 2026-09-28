import type { NextFunction, Request, Response } from 'express'
import { validationResult, type ValidationError } from 'express-validator'

import { validationFailed } from '../utils/AppError'

/**
 * Turns express-validator's collected errors into a 422 response.
 *
 * Runs immediately after the validation chains on every route that has them,
 * so a controller only ever executes against input that has already passed
 * validation — controllers never re-check their own arguments.
 *
 * The response body maps field name to message:
 *
 *   { "success": false, "message": "Validation failed",
 *     "errors": { "email": "Must be a valid email address" } }
 *
 * That shape is what React Hook Form consumes to mark individual fields, which
 * is why the first error per field is kept rather than an array per field —
 * showing a user four simultaneous complaints about one input is noise.
 */
export function handleValidation(req: Request, _res: Response, next: NextFunction): void {
  const result = validationResult(req)

  if (result.isEmpty()) {
    next()
    return
  }

  const errors: Record<string, string> = {}

  for (const error of result.array()) {
    const field = fieldNameOf(error)
    // First error wins: the chains are ordered most-fundamental first, so the
    // earliest message is the most useful one ("required" before "too short").
    if (!(field in errors)) {
      errors[field] = error.msg as string
    }
  }

  next(validationFailed(errors))
}

/**
 * express-validator v7 errors are a discriminated union; only some members
 * carry a `path`. Anything else is grouped under `_error`.
 */
function fieldNameOf(error: ValidationError): string {
  if (error.type === 'field') return error.path
  if (error.type === 'alternative_grouped' || error.type === 'alternative') return '_error'
  return '_error'
}
