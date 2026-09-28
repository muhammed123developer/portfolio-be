import { Schema, model, type HydratedDocument } from 'mongoose'

import { parseDateOnly, schemaOptions } from '../utils/mongooseHelpers'

/**
 * A qualification in the education timeline.
 *
 * Mirrors Experience deliberately — same calendar-date handling, same "null
 * endDate means ongoing" convention — so the two timelines share one frontend
 * component and one mental model.
 */
export interface EducationAttributes {
  institution: string
  degree: string
  field: string | null
  location: string | null
  startDate: Date
  /** NULL means the course is still in progress. */
  endDate: Date | null
  grade: string | null
  description: string | null
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type EducationDocument = HydratedDocument<EducationAttributes>

const educationSchema = new Schema<EducationAttributes>(
  {
    institution: {
      type: String,
      required: [true, 'Institution is required'],
      trim: true,
      maxlength: [200, 'Institution must be 200 characters or fewer'],
    },
    degree: {
      type: String,
      required: [true, 'Degree is required'],
      trim: true,
      maxlength: [200, 'Degree must be 200 characters or fewer'],
    },
    field: { type: String, default: null, trim: true, maxlength: 200 },
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

    grade: { type: String, default: null, trim: true, maxlength: 100 },
    description: { type: String, default: null, trim: true },
    displayOrder: { type: Number, default: 0 },
  },
  schemaOptions(['startDate', 'endDate'])
)

/** Cross-field date check — see the equivalent hook in Experience.ts. */
educationSchema.pre('validate', function () {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date must be on or after the start date')
  }
})

educationSchema.index({ startDate: -1 })
educationSchema.index({ displayOrder: 1, startDate: -1 })

/**
 * Collection name is forced to the uncountable "education"; Mongoose would
 * otherwise pluralise the model name to "educations".
 */
export const Education = model<EducationAttributes>('Education', educationSchema, 'education')
