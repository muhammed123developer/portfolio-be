import { Schema, model, type HydratedDocument } from 'mongoose'

import { schemaOptions } from '../utils/mongooseHelpers'
import { MESSAGE_STATUSES, type MessageStatus } from '../types/enums'

/**
 * A message submitted through the public contact form.
 *
 * This is the only collection an unauthenticated visitor can write to, which is
 * why it is rate limited, validated twice (React Hook Form for UX,
 * express-validator for safety) and length-capped at the schema level too.
 *
 * `ipAddress` is stored purely so form abuse can be traced.
 */
export interface ContactMessageAttributes {
  name: string
  email: string
  subject: string
  message: string
  status: MessageStatus
  ipAddress: string | null
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ContactMessageDocument = HydratedDocument<ContactMessageAttributes>

const contactMessageSchema = new Schema<ContactMessageAttributes>(
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
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email must be 255 characters or fewer'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email address'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject must be 200 characters or fewer'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      // Hard ceiling so one submission cannot bloat the collection.
      maxlength: [5000, 'Message must be 5000 characters or fewer'],
    },
    status: {
      type: String,
      enum: { values: [...MESSAGE_STATUSES], message: '{VALUE} is not a valid status' },
      default: 'unread',
    },
    // Sized for an IPv6 address.
    ipAddress: { type: String, default: null, maxlength: 45 },
    readAt: { type: Date, default: null },
  },
  schemaOptions()
)

/**
 * The admin inbox filters by status and always sorts newest-first, so this
 * compound index covers the common query without a separate sort stage.
 */
contactMessageSchema.index({ status: 1, createdAt: -1 })
contactMessageSchema.index({ createdAt: -1 })

export const ContactMessage = model<ContactMessageAttributes>(
  'ContactMessage',
  contactMessageSchema
)
