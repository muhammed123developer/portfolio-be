import type {
  MessageStatus,
  ProjectStatus,
  SkillCategory,
  TechnologyCategory,
} from './enums'

/**
 * The application's domain entities.
 *
 * These are plain TypeScript types with **no imports from Mongoose or any other
 * storage library**. That is the whole point: services, controllers and tests
 * describe data in these terms, so swapping the in-memory repositories for
 * MongoDB changes only the files under `repositories/`.
 *
 * Two conventions that make the eventual swap seamless:
 *
 *  1. `id` is a 24-character hex string — the same shape as a MongoDB ObjectId,
 *     so `isMongoId()` validators, URLs and frontend types are unaffected when
 *     the real database arrives.
 *
 *  2. All dates are **strings**, never `Date` objects. Timestamps are full ISO
 *     ("2026-09-21T10:00:00.000Z"); calendar dates are "YYYY-MM-DD". Keeping
 *     them as strings means JSON persistence needs no revive step, API
 *     responses are already correctly shaped, and a calendar date can never
 *     shift a day because of a timezone conversion.
 */

/** Fields every stored entity carries. */
export interface BaseEntity {
  id: string
  /** ISO 8601 timestamp. */
  createdAt: string
  /** ISO 8601 timestamp. */
  updatedAt: string
}

/* ------------------------------------------------------------------ Admin */

export interface Admin extends BaseEntity {
  name: string
  email: string
  /** ISO timestamp, or null if the account has never been used. */
  lastLoginAt: string | null
}

/**
 * The stored form, including the bcrypt hash.
 *
 * Kept as a separate type from `Admin` so that returning a hash from anywhere
 * other than the authentication service is a *compile error*, not a code-review
 * catch. `AdminRepository.findByEmailWithPassword` is the only method that
 * returns this shape.
 */
export interface AdminRecord extends Admin {
  passwordHash: string
}

/**
 * A server-side login session. The JWT carries only its id (`sid`), so the
 * server can end a session before the token's own expiry — on logout, after
 * the idle timeout, or when the process restarts.
 */
export interface AdminSession {
  id: string
  adminId: string
  createdAt: string
  /** Last authenticated request; drives the idle timeout. */
  lastSeenAt: string
  /** Absolute cap, fixed at login. */
  expiresAt: string
}

/* ------------------------------------------------------------- Technology */

export interface Technology extends BaseEntity {
  name: string
  slug: string
  category: TechnologyCategory
  icon: string | null
}

export interface CreateTechnologyInput {
  name: string
  category?: TechnologyCategory
  icon?: string | null
}

export type UpdateTechnologyInput = Partial<CreateTechnologyInput>

/* ---------------------------------------------------------------- Project */

/** Fields common to the stored and the returned form of a project. */
export interface ProjectFields extends BaseEntity {
  title: string
  slug: string
  shortDescription: string
  description: string

  /* Case study — all optional, so a project can be published before write-up */
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
}

/**
 * How a project is *stored* — technologies held as references.
 *
 * Mirrors how the document will look in MongoDB, so the mock store and the
 * real collection have the same shape.
 */
export interface ProjectRecord extends ProjectFields {
  technologyIds: string[]
}

/**
 * How a project is *returned* — technologies resolved to full objects.
 *
 * Equivalent to the result of `.populate('technologies')`. Repositories are
 * responsible for the resolution, so services and controllers always receive
 * this richer shape and never deal with raw ids.
 */
export interface Project extends ProjectFields {
  technologies: Technology[]
}

export interface CreateProjectInput {
  title: string
  /** Derived from `title` by the service when omitted. */
  slug?: string
  shortDescription: string
  description: string
  problem?: string | null
  solution?: string | null
  features?: string[]
  architecture?: string | null
  challenges?: string | null
  lessonsLearned?: string | null
  image?: string | null
  screenshots?: string[]
  githubUrl?: string | null
  liveUrl?: string | null
  featured?: boolean
  status?: ProjectStatus
  displayOrder?: number
  technologyIds?: string[]
}

export type UpdateProjectInput = Partial<CreateProjectInput>

/* ------------------------------------------------------------- Experience */

export interface Experience extends BaseEntity {
  company: string
  position: string
  location: string | null
  /** Calendar date, "YYYY-MM-DD". */
  startDate: string
  /** Calendar date, or null meaning this is the current role. */
  endDate: string | null
  description: string | null
  technologies: string[]
  companyUrl: string | null
  displayOrder: number
}

export interface CreateExperienceInput {
  company: string
  position: string
  location?: string | null
  startDate: string
  endDate?: string | null
  description?: string | null
  technologies?: string[]
  companyUrl?: string | null
  displayOrder?: number
}

export type UpdateExperienceInput = Partial<CreateExperienceInput>

/* -------------------------------------------------------------- Education */

export interface Education extends BaseEntity {
  institution: string
  degree: string
  field: string | null
  location: string | null
  startDate: string
  /** Calendar date, or null meaning still studying. */
  endDate: string | null
  grade: string | null
  description: string | null
  displayOrder: number
}

export interface CreateEducationInput {
  institution: string
  degree: string
  field?: string | null
  location?: string | null
  startDate: string
  endDate?: string | null
  grade?: string | null
  description?: string | null
  displayOrder?: number
}

export type UpdateEducationInput = Partial<CreateEducationInput>

/* ------------------------------------------------------------------ Skill */

export interface Skill extends BaseEntity {
  name: string
  category: SkillCategory
  icon: string | null
  /** 0–100, rendered as a proficiency meter. */
  proficiency: number
  displayOrder: number
}

export interface CreateSkillInput {
  name: string
  category: SkillCategory
  icon?: string | null
  proficiency?: number
  displayOrder?: number
}

export type UpdateSkillInput = Partial<CreateSkillInput>

/* --------------------------------------------------------- ContactMessage */

export interface ContactMessage extends BaseEntity {
  name: string
  email: string
  subject: string
  message: string
  status: MessageStatus
  /** Stored so form abuse can be traced; never exposed on public routes. */
  ipAddress: string | null
  readAt: string | null
}

export interface CreateContactMessageInput {
  name: string
  email: string
  subject: string
  message: string
  ipAddress?: string | null
}

export interface UpdateContactMessageInput {
  status?: MessageStatus
}

/* ---------------------------------------------------------------- Profile */

/**
 * The portfolio owner's public details — a single record.
 *
 * Backs the Home hero, the About page and the admin Settings screen, which is
 * what makes those editable at runtime instead of hardcoded in React.
 */
export interface Profile extends BaseEntity {
  fullName: string
  title: string
  tagline: string | null

  introduction: string | null
  philosophy: string | null
  currentFocus: string | null
  technicalInterests: string[]
  careerSummary: string | null

  publicEmail: string | null
  location: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  avatarUrl: string | null
  resumeUrl: string | null
  availableForWork: boolean
}

export type UpdateProfileInput = Partial<Omit<Profile, keyof BaseEntity>>

/* ------------------------------------------------------------------ Stats */

/** Powers the seven admin dashboard cards in a single request. */
export interface DashboardStats {
  totalProjects: number
  featuredProjects: number
  totalSkills: number
  totalExperience: number
  totalEducation: number
  unreadMessages: number
  totalMessages: number
}
