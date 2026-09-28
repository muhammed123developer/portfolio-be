import { body, type ValidationChain } from 'express-validator'

import { idParam } from './common'

/**
 * Education request validation.
 *
 * Mirrors the experience validator — same date handling, same "null endDate
 * means ongoing" convention.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function educationFields(optional: boolean): ValidationChain[] {
  const maybe = <T extends ValidationChain>(chain: T): T =>
    (optional ? chain.optional() : chain) as T

  return [
    maybe(body('institution').trim().notEmpty().withMessage('Institution is required'))
      .isLength({ max: 200 })
      .withMessage('Institution must be 200 characters or fewer'),

    maybe(body('degree').trim().notEmpty().withMessage('Degree is required'))
      .isLength({ max: 200 })
      .withMessage('Degree must be 200 characters or fewer'),

    body('field').optional({ nullable: true }).trim().isLength({ max: 200 }),
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

    // null means still studying.
    body('endDate')
      .optional({ nullable: true })
      .custom((value: unknown) => {
        if (value === null || value === '') return true
        if (typeof value !== 'string' || !DATE_ONLY.test(value)) {
          throw new Error('End date must be in YYYY-MM-DD format, or null if still studying')
        }
        return true
      }),

    body('grade').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('displayOrder').optional().isInt({ min: 0, max: 9999 }).toInt(),
  ]
}

export const createEducationValidator: ValidationChain[] = educationFields(false)
export const updateEducationValidator: ValidationChain[] = [idParam(), ...educationFields(true)]
export const deleteEducationValidator: ValidationChain[] = [idParam()]
