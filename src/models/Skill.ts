import { Schema, model, type HydratedDocument } from 'mongoose'

import { schemaOptions } from '../utils/mongooseHelpers'
import { SKILL_CATEGORIES, type SkillCategory } from '../types/enums'

/**
 * A single skill shown on the public site, grouped by category.
 *
 * The public skills list renders entirely from this collection — nothing is
 * hardcoded in React — so adding "Kubernetes" is an admin action rather than a
 * code change and a redeploy.
 *
 * Ordering within a category is controlled by `displayOrder`, an integer the
 * admin edits, rather than drag-and-drop. That keeps a reorder a plain,
 * testable PUT instead of a bespoke interaction.
 */
export interface SkillAttributes {
  name: string
  category: SkillCategory
  icon: string | null
  /** 0–100, rendered as a proficiency meter. */
  proficiency: number
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export type SkillDocument = HydratedDocument<SkillAttributes>

const skillSchema = new Schema<SkillAttributes>(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [80, 'Name must be 80 characters or fewer'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: [...SKILL_CATEGORIES], message: '{VALUE} is not a valid skill category' },
    },
    icon: { type: String, default: null, maxlength: 80 },
    proficiency: {
      type: Number,
      default: 70,
      // Was a database CHECK constraint under PostgreSQL; MongoDB has no
      // equivalent, so the bound is enforced at the application layer.
      min: [0, 'Proficiency must be between 0 and 100'],
      max: [100, 'Proficiency must be between 0 and 100'],
      validate: {
        validator: Number.isInteger,
        message: 'Proficiency must be a whole number',
      },
    },
    displayOrder: { type: Number, default: 0 },
  },
  schemaOptions()
)

/**
 * The same name may legitimately appear in two categories (e.g. "Docker" under
 * both DevOps and Tools), so uniqueness is on the pair rather than the name.
 */
skillSchema.index({ name: 1, category: 1 }, { unique: true })

/** Covers the public query: skills for one category, in display order. */
skillSchema.index({ category: 1, displayOrder: 1 })

export const Skill = model<SkillAttributes>('Skill', skillSchema)
