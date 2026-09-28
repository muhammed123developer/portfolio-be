import { body, type ValidationChain } from 'express-validator'

import { TECHNOLOGY_CATEGORIES } from '../types/enums'
import { idParam } from './common'

/**
 * Technology request validation.
 *
 * The slug is derived from the name by TechnologyService and is not accepted
 * from the client, so there is no chain for it here.
 */

function technologyFields(optional: boolean): ValidationChain[] {
  const maybe = <T extends ValidationChain>(chain: T): T =>
    (optional ? chain.optional() : chain) as T

  return [
    maybe(body('name').trim().notEmpty().withMessage('Technology name is required'))
      .isLength({ max: 80 })
      .withMessage('Name must be 80 characters or fewer'),

    body('category')
      .optional()
      .isIn(TECHNOLOGY_CATEGORIES)
      .withMessage(`category must be one of: ${TECHNOLOGY_CATEGORIES.join(', ')}`),

    body('icon').optional({ nullable: true }).trim().isLength({ max: 80 }),
  ]
}

export const createTechnologyValidator: ValidationChain[] = technologyFields(false)
export const updateTechnologyValidator: ValidationChain[] = [idParam(), ...technologyFields(true)]
export const deleteTechnologyValidator: ValidationChain[] = [idParam()]
