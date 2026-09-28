import { Schema, model, type HydratedDocument } from 'mongoose'

import { schemaOptions } from '../utils/mongooseHelpers'

/**
 * The portfolio owner's account. There is exactly one role in this system, so
 * there is no roles collection — adding one would be speculative complexity.
 */
export interface AdminAttributes {
  name: string
  email: string
  passwordHash: string
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type AdminDocument = HydratedDocument<AdminAttributes>

const adminSchema = new Schema<AdminAttributes>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      // Stored lowercase so "John@x.com" and "john@x.com" cannot become two
      // accounts, and so login is effectively case-insensitive.
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email must be 255 characters or fewer'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email address'],
    },
    /**
     * bcrypt hash — a plain-text password is never written here.
     *
     * `select: false` means the hash is absent from every query result unless a
     * caller explicitly opts in with `.select('+passwordHash')`. Only the login
     * service does. Leaking it through a controller is therefore impossible by
     * construction rather than by remembering to strip it.
     */
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  schemaOptions()
)

export const Admin = model<AdminAttributes>('Admin', adminSchema)
