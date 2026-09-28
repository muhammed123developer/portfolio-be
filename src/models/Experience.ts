import { Schema, model, type HydratedDocument } from 'mongoose'

import { parseDateOnly, schemaOptions } from '../utils/mongooseHelpers'

/**
 * A role in the career timeline.
 *
 * `endDate` is nullable and NULL carries meaning: it marks the current role.
 *
 * Both dates are calendar dates, not timestamps. MongoDB has no date-only
 * type, so they are stored pinned to UTC midnight and serialised back as
 * "YYYY-MM-DD" — otherwise a timezone conversion could shift a role that began
 * in March into February in the rendered timeline.
 */
export interface ExperienceAttributes {
  company: string
  position: string
  location: string | null
  startDate: Date
  /** NULL means "present" — this is the current role. */
  endDate: Date | null
  description: string | null
  technologies: string[]
  companyUrl: string | null
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type ExperienceDocument = HydratedDocument<ExperienceAttributes>

const experienceSchema = new Schema<ExperienceAttributes>(
  {
    company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
      maxlength: [150, 'Company must be 150 characters or fewer'],
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
      maxlength: [150, 'Position must be 150 characters or fewer'],
    },
    location: { type: String, default: null, trim: true, maxlength: 150 },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      set: parseDateOnly,
    },
    endDate: {
      type: Date,
      default: null,
      set: parseDateOnly,
    },

    description: { type: String, default: null, trim: true },
    // Free-text technology names, distinct from the Technology collection:
    // a past employer's stack is a historical note, not a portfolio taxonomy,
    // and normalising it would couple the timeline to project tagging.
    technologies: { type: [String], default: [] },
    companyUrl: { type: String, default: null, maxlength: 500 },
    displayOrder: { type: Number, default: 0 },
  },
  // Serialise both dates as calendar dates rather than ISO timestamps.
  schemaOptions(['startDate', 'endDate'])
)

/**
 * Cross-field validation, so it cannot live on either path alone.
 *
 * This was a database CHECK constraint under PostgreSQL. MongoDB has no
 * equivalent, so it is enforced here — application-level rather than
 * storage-level. The validator runs on save() and, because the update paths
 * set `runValidators`, on updates too.
 *
 * Note: Mongoose 9 removed the `next` callback from pre-middleware. A hook now
 * takes no arguments and signals completion by returning (or by throwing).
 */
experienceSchema.pre('validate', function () {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be on or after the start date')
  }
})

// The timeline is always rendered newest-first.
experienceSchema.index({ startDate: -1 })
experienceSchema.index({ displayOrder: 1, startDate: -1 })

export const Experience = model<ExperienceAttributes>('Experience', experienceSchema)
