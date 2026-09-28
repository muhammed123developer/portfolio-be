import { Schema, model, type HydratedDocument, type Query } from 'mongoose'

import { schemaOptions } from '../utils/mongooseHelpers'
import { TECHNOLOGY_CATEGORIES, type TechnologyCategory } from '../types/enums'
import { Project } from './Project'

/**
 * A technology that can be attached to projects — React, MongoDB, Docker.
 *
 * Deliberately its own collection rather than a string array on Project: the
 * same technology appears across many projects, so normalising it means
 * renaming "Mongo" to "MongoDB" is one update rather than an edit to every
 * project, and it makes "show all projects using X" a single indexed query.
 */
export interface TechnologyAttributes {
  name: string
  slug: string
  category: TechnologyCategory
  icon: string | null
  createdAt: Date
  updatedAt: Date
}

export type TechnologyDocument = HydratedDocument<TechnologyAttributes>

const technologySchema = new Schema<TechnologyAttributes>(
  {
    name: {
      type: String,
      required: [true, 'Technology name is required'],
      unique: true,
      trim: true,
      maxlength: [80, 'Name must be 80 characters or fewer'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [100, 'Slug must be 100 characters or fewer'],
    },
    category: {
      type: String,
      enum: { values: [...TECHNOLOGY_CATEGORIES], message: '{VALUE} is not a valid category' },
      default: 'other',
    },
    /** Icon identifier (e.g. a lucide name), resolved by the frontend. */
    icon: { type: String, default: null, maxlength: 80 },
  },
  schemaOptions()
)

technologySchema.index({ category: 1, name: 1 })

/* ---------------------------------------------------------------------------
 * Referential cleanup — the replacement for SQL's ON DELETE CASCADE.
 *
 * MongoDB has no foreign keys, so deleting a technology would otherwise leave
 * dangling ObjectIds inside Project.technologies. This hook detaches the
 * technology from every project that references it.
 *
 * The $pull runs BEFORE the delete on purpose. If the delete then fails, the
 * technology is merely detached and the admin can retry — whereas deleting
 * first and failing to detach would leave dangling references behind.
 *
 * No transaction is used, so the behaviour is identical on Atlas and on the
 * standalone in-memory server the test suite runs against. `populate()` skips
 * missing references silently, so even the worst-case interleaving degrades to
 * a cosmetic issue rather than a broken page.
 * ------------------------------------------------------------------------ */
async function detachFromProjects(
  query: Query<unknown, TechnologyAttributes>
): Promise<void> {
  const doomed = await query.model.find(query.getFilter()).select('_id').lean()
  if (doomed.length === 0) return

  const ids = doomed.map((doc) => doc._id)
  await Project.updateMany({ technologies: { $in: ids } }, { $pull: { technologies: { $in: ids } } })
}

// Covers Model.findByIdAndDelete() and Model.findOneAndDelete().
technologySchema.pre('findOneAndDelete', async function () {
  await detachFromProjects(this)
})

// Covers Model.deleteOne() and Model.deleteMany() as query middleware.
technologySchema.pre('deleteOne', { document: false, query: true }, async function () {
  await detachFromProjects(this)
})

technologySchema.pre('deleteMany', { document: false, query: true }, async function () {
  await detachFromProjects(this)
})

export const Technology = model<TechnologyAttributes>('Technology', technologySchema)
