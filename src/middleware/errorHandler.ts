import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import mongoose from 'mongoose'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

import { AppError } from '../utils/AppError'
import { sendError } from '../utils/apiResponse'
import { env } from '../config/env'

/**
 * The MongoDB driver reports a duplicate-key violation as a plain
 * `MongoServerError` with `code: 11000` rather than a dedicated error class, so
 * it has to be recognised structurally.
 */
interface DuplicateKeyError extends Error {
  code: number
  keyPattern?: Record<string, unknown>
  keyValue?: Record<string, unknown>
}

function isMongoServerError(err: unknown): err is Error & { code?: number } {
  return err instanceof Error && err.name === 'MongoServerError'
}

function isDuplicateKeyError(err: unknown): err is DuplicateKeyError {
  return isMongoServerError(err) && err.code === 11000
}

/** What we decided to tell the client about a given error. */
interface NormalisedError {
  statusCode: number
  message: string
  errors?: Record<string, string>
  /** Unexpected errors get logged in full; deliberate ones do not. */
  logFull: boolean
}

/**
 * Translates any thrown value into the response the client should receive.
 *
 * The guiding rule: a client learns what it needs to fix its request, and
 * nothing about our internals. Database messages, stack traces and driver
 * details stay on the server.
 */
function normalise(err: unknown): NormalisedError {
  // 1. Errors we raised on purpose — trusted, sent through as-is.
  if (err instanceof AppError) {
    const result: NormalisedError = {
      statusCode: err.statusCode,
      message: err.message,
      logFull: err.statusCode >= 500,
    }
    if (err.errors) result.errors = err.errors
    return result
  }

  // 2. Duplicate key — e.g. two projects with the same slug, or a second
  //    Profile document. MongoDB signals this with driver error code 11000
  //    rather than a typed error class.
  if (isDuplicateKeyError(err)) {
    const fields: Record<string, string> = {}
    for (const path of Object.keys(err.keyPattern ?? {})) {
      fields[path] = `${path} must be unique`
    }
    return {
      statusCode: 409,
      message: 'A record with those details already exists',
      errors: Object.keys(fields).length > 0 ? fields : undefined,
      logFull: false,
    }
  }

  // 3. Schema validation (required, enum, min/max, custom validators) — caught
  //    even though express-validator runs first, because services can build
  //    documents from sources that never passed through a request validator.
  if (err instanceof mongoose.Error.ValidationError) {
    const fields: Record<string, string> = {}
    for (const [path, detail] of Object.entries(err.errors)) {
      fields[path] = detail.message
    }
    return {
      statusCode: 422,
      message: 'Validation failed',
      errors: Object.keys(fields).length > 0 ? fields : undefined,
      logFull: false,
    }
  }

  // 4. A malformed ObjectId in a path parameter, or a value of the wrong type
  //    in a filter. The client's fault, so 400 rather than 500.
  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: err.path === '_id' ? 'Malformed identifier' : `Invalid value for "${err.path}"`,
      logFull: false,
    }
  }

  // 5. Anything else from Mongoose or the driver is ours to fix, not the
  //    client's — the message is deliberately generic.
  if (err instanceof mongoose.Error || isMongoServerError(err)) {
    return { statusCode: 500, message: 'A database error occurred', logFull: true }
  }

  // 6. Token problems. Both map to 401 with a deliberately vague message.
  if (err instanceof TokenExpiredError) {
    return { statusCode: 401, message: 'Your session has expired, please log in again', logFull: false }
  }
  if (err instanceof JsonWebTokenError) {
    return { statusCode: 401, message: 'Authentication required', logFull: false }
  }

  // 7. Upload problems — oversized files, unexpected field names.
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large (maximum ${Math.round(env.maxUploadBytes / (1024 * 1024))}MB)`
        : `Upload failed: ${err.message}`
    return { statusCode: 400, message, logFull: false }
  }

  // 8. Body parser rejecting invalid JSON.
  if (err instanceof SyntaxError && 'body' in err) {
    return { statusCode: 400, message: 'Request body is not valid JSON', logFull: false }
  }

  // 9. Anything else is a bug we have not accounted for.
  return { statusCode: 500, message: 'Something went wrong', logFull: true }
}

/**
 * Centralised error handler. Registered last in app.ts — every route reaches
 * it, so no controller needs its own try/catch for error responses.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Headers already sent means the response is mid-flight; only Express can
  // safely tear the connection down from here.
  if (res.headersSent) {
    next(err)
    return
  }

  const { statusCode, message, errors, logFull } = normalise(err)

  if (logFull && !env.isTest) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}`)
    console.error(err)
  }

  sendError(res, message, statusCode, errors)
}
