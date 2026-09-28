import { body, query, type ValidationChain } from 'express-validator'

import { MESSAGE_STATUSES } from '../types/enums'
import { idParam, paginationQuery, searchQuery } from './common'

/**
 * Contact message validation.
 *
 * `submitContactValidator` guards the only endpoint an unauthenticated visitor
 * can write through, so it is the strictest set in the application: every
 * field is bounded, and `status` is deliberately absent — a visitor cannot
 * post a message that arrives pre-marked as read.
 */

export const submitContactValidator: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 255 })
    .withMessage('Email must be 255 characters or fewer'),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .bail()
    .isLength({ min: 3, max: 200 })
    .withMessage('Subject must be between 3 and 200 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .bail()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters'),
]

export const listContactValidator: ValidationChain[] = [
  ...paginationQuery,
  searchQuery,
  query('status')
    .optional()
    .isIn(MESSAGE_STATUSES)
    .withMessage(`status must be one of: ${MESSAGE_STATUSES.join(', ')}`),
]

export const getContactValidator: ValidationChain[] = [idParam()]

/** Only the status is mutable — an admin cannot rewrite what someone sent. */
export const updateContactValidator: ValidationChain[] = [
  idParam(),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .bail()
    .isIn(MESSAGE_STATUSES)
    .withMessage(`status must be one of: ${MESSAGE_STATUSES.join(', ')}`),
]

export const deleteContactValidator: ValidationChain[] = [idParam()]
