import { param, query, type ValidationChain } from 'express-validator'

/**
 * Validation fragments reused across resources, so pagination and id checks
 * behave identically on every endpoint rather than drifting per route.
 */

/**
 * Validates a 24-character hex route parameter.
 *
 * `isMongoId()` matches exactly the id format the mock repositories generate,
 * so this check is already correct for the eventual MongoDB backend and will
 * not need revisiting.
 */
export function idParam(name = 'id'): ValidationChain {
  return param(name)
    .trim()
    .notEmpty()
    .withMessage('An id is required')
    .bail()
    .isMongoId()
    .withMessage('Malformed id')
}

/** A URL-safe slug route parameter. */
export function slugParam(name = 'slug'): ValidationChain {
  return param(name)
    .trim()
    .notEmpty()
    .withMessage('A slug is required')
    .bail()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Malformed slug')
}

/**
 * Optional `page` and `limit` query parameters.
 *
 * `limit` is capped at 100 here as well as in the repository. Validating it
 * means an over-large request gets a clear 422 rather than being silently
 * clamped, which is far less confusing to whoever is calling the API.
 */
export const paginationQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
]

/** An optional free-text search term. */
export const searchQuery: ValidationChain = query('search')
  .optional()
  .trim()
  .isLength({ max: 120 })
  .withMessage('search must be 120 characters or fewer')

/**
 * An optional URL field that also accepts null or an empty string.
 *
 * Clearing a link in the admin form sends "" or null; without this, express-
 * validator's `isURL` would reject that and make a link impossible to remove.
 */
export function optionalUrl(chain: ValidationChain, label: string): ValidationChain {
  return chain
    .optional({ nullable: true })
    .custom((value: unknown) => {
      if (value === null || value === '') return true
      if (typeof value !== 'string') throw new Error(`${label} must be a URL`)
      if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(value)) {
        throw new Error(`${label} must be a valid URL starting with http:// or https://`)
      }
      if (value.length > 500) throw new Error(`${label} must be 500 characters or fewer`)
      return true
    })
}
