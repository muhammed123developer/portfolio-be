import { Schema, model, type HydratedDocument } from 'mongoose'

import { schemaOptions } from '../utils/mongooseHelpers'

/**
 * The portfolio owner's public details — a single document.
 *
 * This collection is what makes the hero, the About page and the footer
 * editable from the admin Settings screen instead of hardcoded in React.
 * Without it, changing a job title would mean a code change and a redeploy.
 *
 * Singleton-ness is enforced by a unique index on `singleton`, a field that is
 * always `true` and immutable: MongoDB itself rejects a second document. That
 * is stronger than a service-layer check, which a seed script could bypass.
 */
export interface ProfileAttributes {
  /** Always true. Exists solely to carry the single-document unique index. */
  singleton: boolean

  /* Hero */
  fullName: string
  title: string
  tagline: string | null

  /* About page */
  introduction: string | null
  philosophy: string | null
  currentFocus: string | null
  technicalInterests: string[]
  careerSummary: string | null

  /* Contact and social */
  publicEmail: string | null
  location: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  avatarUrl: string | null
  resumeUrl: string | null
  availableForWork: boolean

  createdAt: Date
  updatedAt: Date
}

export type ProfileDocument = HydratedDocument<ProfileAttributes>

const profileSchema = new Schema<ProfileAttributes>(
  {
    singleton: {
      type: Boolean,
      default: true,
      unique: true,
      // Cannot be changed after creation, so nobody can sidestep the unique
      // index by flipping an existing document to `false`.
      immutable: true,
      validate: {
        validator: (value: boolean) => value === true,
        message: 'Profile.singleton must always be true',
      },
    },

    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [120, 'Full name must be 120 characters or fewer'],
    },
    title: {
      type: String,
      required: [true, 'Professional title is required'],
      trim: true,
      maxlength: [160, 'Title must be 160 characters or fewer'],
    },
    tagline: { type: String, default: null, trim: true, maxlength: 300 },

    introduction: { type: String, default: null, trim: true },
    philosophy: { type: String, default: null, trim: true },
    currentFocus: { type: String, default: null, trim: true },
    technicalInterests: { type: [String], default: [] },
    careerSummary: { type: String, default: null, trim: true },

    publicEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    location: { type: String, default: null, trim: true, maxlength: 150 },
    githubUrl: { type: String, default: null, maxlength: 500 },
    linkedinUrl: { type: String, default: null, maxlength: 500 },
    websiteUrl: { type: String, default: null, maxlength: 500 },
    avatarUrl: { type: String, default: null, maxlength: 500 },
    resumeUrl: { type: String, default: null, maxlength: 500 },
    availableForWork: { type: Boolean, default: true },
  },
  schemaOptions()
)

export const Profile = model<ProfileAttributes>('Profile', profileSchema)
