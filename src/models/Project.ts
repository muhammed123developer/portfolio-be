import { Schema, Types, model, type HydratedDocument } from 'mongoose'

import { schemaOptions } from '../utils/mongooseHelpers'
import { PROJECT_STATUSES, type ProjectStatus } from '../types/enums'
import type { TechnologyAttributes } from './Technology'

/**
 * A portfolio project — the centrepiece of the site.
 *
 * The case-study fields (problem, solution, features, architecture, challenges,
 * lessonsLearned) exist because a project page that only shows a description
 * proves nothing to an interviewer. All are optional, so a project can be
 * published early and written up later.
 *
 * `slug` rather than `_id` is the public lookup key, so URLs read
 * /projects/portfolio-platform instead of /projects/<objectid>.
 */
export interface ProjectAttributes {
  title: string
  slug: string
  shortDescription: string
  description: string

  /* Case study — all optional */
  problem: string | null
  solution: string | null
  features: string[]
  architecture: string | null
  challenges: string | null
  lessonsLearned: string | null

  /* Media */
  image: string | null
  screenshots: string[]

  /* Links */
  githubUrl: string | null
  liveUrl: string | null

  /* Presentation */
  featured: boolean
  status: ProjectStatus
  displayOrder: number

  /**
   * References into the technologies collection. This replaces what would be a
   * join table in SQL: a project uses many technologies and a technology
   * appears in many projects, but in a document database the owning side can
   * simply hold the references.
   */
  technologies: Types.ObjectId[]

  createdAt: Date
  updatedAt: Date
}

export type ProjectDocument = HydratedDocument<ProjectAttributes>

/** Shape after `.populate('technologies')` — what the API actually returns. */
export type PopulatedProject = Omit<ProjectAttributes, 'technologies'> & {
  id: string
  technologies: (TechnologyAttributes & { id: string })[]
}

const projectSchema = new Schema<ProjectAttributes>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title must be 150 characters or fewer'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [180, 'Slug must be 180 characters or fewer'],
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug may only contain lowercase letters, numbers and hyphens',
      ],
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      trim: true,
      maxlength: [300, 'Short description must be 300 characters or fewer'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },

    problem: { type: String, default: null },
    solution: { type: String, default: null },
    features: { type: [String], default: [] },
    architecture: { type: String, default: null },
    challenges: { type: String, default: null },
    lessonsLearned: { type: String, default: null },

    image: { type: String, default: null, maxlength: 500 },
    screenshots: { type: [String], default: [] },

    githubUrl: { type: String, default: null, maxlength: 500 },
    liveUrl: { type: String, default: null, maxlength: 500 },

    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: { values: [...PROJECT_STATUSES], message: '{VALUE} is not a valid project status' },
      default: 'completed',
    },
    displayOrder: { type: Number, default: 0 },

    technologies: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Technology' }],
      default: [],
    },
  },
  schemaOptions()
)

/* --- Indexes -------------------------------------------------------------
 * Declared here rather than created implicitly: `autoIndex` is off (see
 * src/config/database.ts), so these are applied by `npm run db:indexes`.
 * ---------------------------------------------------------------------- */

// The public projects page filters and sorts on these.
projectSchema.index({ featured: -1, displayOrder: 1, createdAt: -1 })
projectSchema.index({ status: 1 })

// Multikey index over the reference array, so "which projects use this
// technology?" is an index scan rather than a full collection scan.
projectSchema.index({ technologies: 1 })

export const Project = model<ProjectAttributes>('Project', projectSchema)
