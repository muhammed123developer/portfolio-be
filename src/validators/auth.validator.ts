import { body } from 'express-validator'

/**
 * Login request validation.
 *
 * Note what is deliberately *absent*: there is no minimum length or complexity
 * check on the password here. Enforcing "at least 8 characters" on a login
 * form tells an attacker which guesses are not worth submitting, and it would
 * lock out an existing account whose password predates the rule. Complexity
 * belongs at the point a password is *set*, not checked.
 */
export const loginValidator = [
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

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    // An upper bound only, to stop a multi-megabyte body reaching bcrypt.
    .isLength({ max: 200 })
    .withMessage('Password must be 200 characters or fewer'),
]
