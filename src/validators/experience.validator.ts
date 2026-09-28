import { body, type ValidationChain } from 'express-validator'

import { idParam, optionalUrl } from './common'

/**
 * Experience request validation.
 *
 * Validates that each date is a well-formed calendar date. The *relationship*
 * between them — end on or after start — is checked in ExperienceService,
 * because on an update it must consider the merged record rather than only the
 * fields in this request.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function experienceFields(optional: boolean): ValidationChain[] {
  const maybe = <T extends ValidationChain>(chain: T): T =>
    (optional ? chain.optional() : chain) as T

  return [
    maybe(body('company').trim().notEmpty().withMessage('Company is required'))
      .isLength({ max: 150 })
      .withMessage('Company must be 150 characters or fewer'),

    maybe(body('position').trim().notEmpty().withMessage('Position is required'))
      .isLength({ max: 150 })
      .withMessage('Position must be 150 characters or fewer'),

    body('location').optional({ nullable: true }).trim().isLength({ max: 150 }),

    maybe(
      body('startDate')
        .trim()
        .notEmpty()
        .withMessage('Start date is required')
        .bail()
        .matches(DATE_ONLY)
        .withMessage('Start date must be in YYYY-MM-DD format')
    ),

    // null is meaningful: it marks this as the current role.
    body('endDate')
      .optional({ nullable: true })
      .custom((value: unknown) => {
        if (value === null || value === '') return true
        if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
          throw new Error('End date must be in YYYY-MM-DD format, or null for a current role')
        }
        return true
      }),

    body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),

    body('technologies')
      .optional()
      .isArray({ max: 30 })
      .withMessage('technologies must be an array of at most 30 items'),
    body('technologies.*').isString().trim().notEmpty().isLength({ max: 80 }),

    optionalUrl(body('companyUrl'), 'Company URL'),

    body('displayOrder').optional().isInt({ min: 0, max: 9999 }).toInt(),
  ]
}

export const createExperienceValidator: ValidationChain[] = experienceFields(false)
export const updateExperienceValidator: ValidationChain[] = [idParam(), ...experienceFields(true)]
export const deleteExperienceValidator: ValidationChain[] = [idParam()]
