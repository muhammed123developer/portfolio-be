import { body, type ValidationChain } from 'express-validator'

import { optionalUrl } from './common'

/**
 * Profile (Settings) request validation.
 *
 * Every field is optional: Settings sends a partial update, so a form that
 * only changes the tagline must not be forced to resubmit the whole profile.
 */
export const updateProfileValidator: ValidationChain[] = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Full name must be 120 characters or fewer'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Professional title cannot be empty')
    .isLength({ max: 160 })
    .withMessage('Title must be 160 characters or fewer'),

  body('tagline').optional({ nullable: true }).trim().isLength({ max: 300 }),
  body('introduction').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('philosophy').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('currentFocus').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('careerSummary').optional({ nullable: true }).isString().isLength({ max: 5000 }),

  body('technicalInterests')
    .optional()
    .isArray({ max: 20 })
    .withMessage('technicalInterests must be an array of at most 20 items'),
  body('technicalInterests.*').isString().trim().notEmpty().isLength({ max: 120 }),

  body('publicEmail')
    .optional({ nullable: true })
    .custom((value: unknown) => {
      if (value === null || value === '') return true
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Public email must be a valid email address')
      }
      return true
    }),

  body('location').optional({ nullable: true }).trim().isLength({ max: 150 }),

  optionalUrl(body('githubUrl'), 'GitHub URL'),
  optionalUrl(body('linkedinUrl'), 'LinkedIn URL'),
  optionalUrl(body('websiteUrl'), 'Website URL'),

  body('avatarUrl').optional({ nullable: true }).isString().isLength({ max: 500 }),
  optionalUrl(body('resumeUrl'), 'Resume URL'),

  body('availableForWork')
    .optional()
    .isBoolean()
    .withMessage('availableForWork must be true or false')
    .toBoolean(),
]
