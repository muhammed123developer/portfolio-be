import { body, query, type ValidationChain } from 'express-validator'

import { SKILL_CATEGORIES } from '../types/enums'
import { idParam } from './common'

/**
 * Skill request validation.
 *
 * The {name, category} uniqueness rule is enforced in SkillService, not here:
 * it requires a storage lookup, and on update it must consider the merged
 * values rather than only what this request supplied.
 */

function skillFields(optional: boolean): ValidationChain[] {
  const maybe = <T extends ValidationChain>(chain: T): T =>
    (optional ? chain.optional() : chain) as T

  return [
    maybe(body('name').trim().notEmpty().withMessage('Skill name is required'))
      .isLength({ max: 80 })
      .withMessage('Name must be 80 characters or fewer'),

    maybe(
      body('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required')
        .bail()
        .isIn(SKILL_CATEGORIES)
        .withMessage(`category must be one of: ${SKILL_CATEGORIES.join(', ')}`)
    ),

    body('icon').optional({ nullable: true }).trim().isLength({ max: 80 }),

    body('proficiency')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Proficiency must be a whole number between 0 and 100')
      .toInt(),

    body('displayOrder').optional().isInt({ min: 0, max: 9999 }).toInt(),
  ]
}

export const listSkillsValidator: ValidationChain[] = [
  query('category')
    .optional()
    .isIn(SKILL_CATEGORIES)
    .withMessage(`category must be one of: ${SKILL_CATEGORIES.join(', ')}`),
]

export const createSkillValidator: ValidationChain[] = skillFields(false)
export const updateSkillValidator: ValidationChain[] = [idParam(), ...skillFields(true)]
export const deleteSkillValidator: ValidationChain[] = [idParam()]
