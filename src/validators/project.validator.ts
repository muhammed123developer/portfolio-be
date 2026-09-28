import { body, query, type ValidationChain } from 'express-validator'

import { PROJECT_STATUSES } from '../types/enums'
import { idParam, optionalUrl, paginationQuery, searchQuery, slugParam } from './common'

/**
 * Project request validation.
 *
 * Checks request *shape* only — types, lengths, formats, enum membership.
 * Business rules (slug uniqueness, that referenced technologies exist) belong
 * to ProjectService, because they need to consult storage and must hold for
 * every backend.
 */

/** Fields shared by create and update; `optional` relaxes them for PUT. */
function projectFields(optional: boolean): ValidationChain[] {
  const maybe = <T extends ValidationChain>(chain: T): T =>
    (optional ? chain.optional() : chain) as T

  return [
    maybe(body('title').trim().notEmpty().withMessage('Title is required'))
      .isLength({ max: 150 })
      .withMessage('Title must be 150 characters or fewer'),

    body('slug')
      .optional()
      .trim()
      .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .withMessage('Slug may only contain lowercase letters, numbers and hyphens')
      .isLength({ max: 180 })
      .withMessage('Slug must be 180 characters or fewer'),

    maybe(
      body('shortDescription').trim().notEmpty().withMessage('Short description is required')
    )
      .isLength({ max: 300 })
      .withMessage('Short description must be 300 characters or fewer'),

    maybe(body('description').trim().notEmpty().withMessage('Description is required'))
      .isLength({ max: 20000 })
      .withMessage('Description must be 20000 characters or fewer'),

    body('problem').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('solution').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('architecture').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('challenges').optional({ nullable: true }).isString().isLength({ max: 5000 }),
    body('lessonsLearned').optional({ nullable: true }).isString().isLength({ max: 5000 }),

    body('features')
      .optional()
      .isArray({ max: 30 })
      .withMessage('features must be an array of at most 30 items'),
    body('features.*')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Each feature must be a non-empty string')
      .isLength({ max: 300 })
      .withMessage('Each feature must be 300 characters or fewer'),

    body('screenshots')
      .optional()
      .isArray({ max: 12 })
      .withMessage('screenshots must be an array of at most 12 items'),
    body('screenshots.*').isString().isLength({ max: 500 }),

    body('image').optional({ nullable: true }).isString().isLength({ max: 500 }),

    optionalUrl(body('githubUrl'), 'GitHub URL'),
    optionalUrl(body('liveUrl'), 'Live URL'),

    body('featured').optional().isBoolean().withMessage('featured must be true or false').toBoolean(),

    body('status')
      .optional()
      .isIn(PROJECT_STATUSES)
      .withMessage(`status must be one of: ${PROJECT_STATUSES.join(', ')}`),

    body('displayOrder')
      .optional()
      .isInt({ min: 0, max: 9999 })
      .withMessage('displayOrder must be between 0 and 9999')
      .toInt(),

    body('technologyIds')
      .optional()
      .isArray({ max: 40 })
      .withMessage('technologyIds must be an array of at most 40 items'),
    body('technologyIds.*').isMongoId().withMessage('Each technology id must be a valid id'),
  ]
}

export const listProjectsValidator: ValidationChain[] = [
  ...paginationQuery,
  searchQuery,
  query('featured')
    .optional()
    .isBoolean()
    .withMessage('featured must be true or false')
    .toBoolean(),
  query('status')
    .optional()
    .isIn(PROJECT_STATUSES)
    .withMessage(`status must be one of: ${PROJECT_STATUSES.join(', ')}`),
  query('technology').optional().trim().isLength({ max: 100 }),
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'order'])
    .withMessage('sort must be one of: newest, oldest, order'),
]

export const getProjectValidator: ValidationChain[] = [slugParam()]
export const createProjectValidator: ValidationChain[] = projectFields(false)
export const updateProjectValidator: ValidationChain[] = [idParam(), ...projectFields(true)]
export const deleteProjectValidator: ValidationChain[] = [idParam()]
