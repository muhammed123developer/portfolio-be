import type {
  Admin,
  AdminRecord,
  AdminSession,
  ContactMessage,
  CreateContactMessageInput,
  CreateEducationInput,
  CreateExperienceInput,
  CreateProjectInput,
  CreateSkillInput,
  CreateTechnologyInput,
  Education,
  Experience,
  Profile,
  Project,
  Skill,
  Technology,
  UpdateContactMessageInput,
  UpdateEducationInput,
  UpdateExperienceInput,
  UpdateProfileInput,
  UpdateProjectInput,
  UpdateSkillInput,
  UpdateTechnologyInput,
} from '../types/domain'
import type { MessageStatus, ProjectStatus, SkillCategory } from '../types/enums'

/**
 * The storage contract.
 *
 * Everything above this line in the stack — services, controllers, routes —
 * depends only on these interfaces. Everything below is an implementation
 * detail: `repositories/memory/*` today, `repositories/mongo/*` later.
 *
 * Two rules keep the contract swappable, and both are load-bearing:
 *
 *  1. **No storage-specific query shapes.** Filters are domain vocabulary
 *     (`featured`, `status`, `search`), never `{ $regex }` or `{ $in }`. A
 *     Mongo-shaped filter object here would force the in-memory implementation
 *     to interpret Mongo operators, which defeats the entire purpose.
 *
 *  2. **Uniqueness violations are part of the contract.** An implementation
 *     that detects a duplicate must throw `conflict()` from utils/AppError.
 *     The Mongo implementation will translate driver error 11000 into the same
 *     thing, so the error handler and the frontend cannot tell them apart.
 */

/** A page of results plus the totals needed to render pagination controls. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

/** Shared by every paginated query. */
export interface PageParams {
  page?: number
  limit?: number
}

/* ------------------------------------------------------------------ Admin */

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>
  /**
   * The only method that returns the bcrypt hash. Used exclusively by the
   * authentication service — see the `AdminRecord` comment in types/domain.ts.
   */
  findByEmailWithPassword(email: string): Promise<AdminRecord | null>
  recordLogin(id: string, at: string): Promise<void>
}

/* ---------------------------------------------------------------- Session */

export interface SessionRepository {
  create(session: AdminSession): Promise<void>
  findById(id: string): Promise<AdminSession | null>
  touch(id: string, at: string): Promise<void>
  delete(id: string): Promise<void>
  /** Drops sessions whose absolute expiry has passed. */
  deleteExpired(now: string): Promise<void>
}

/* ------------------------------------------------------------- Technology */

export interface TechnologyRepository {
  findAll(): Promise<Technology[]>
  findById(id: string): Promise<Technology | null>
  findBySlug(slug: string): Promise<Technology | null>
  /** Used to validate the technology ids supplied when saving a project. */
  findManyByIds(ids: string[]): Promise<Technology[]>
  create(input: CreateTechnologyInput & { slug: string }): Promise<Technology>
  update(id: string, input: UpdateTechnologyInput & { slug?: string }): Promise<Technology | null>
  delete(id: string): Promise<boolean>
}

/* ---------------------------------------------------------------- Project */

export interface ProjectFilter extends PageParams {
  featured?: boolean
  status?: ProjectStatus
  /** Filter to projects using a given technology. */
  technologySlug?: string
  /** Case-insensitive match against title and short description. */
  search?: string
  sort?: 'newest' | 'oldest' | 'order'
}

export interface ProjectRepository {
  findMany(filter: ProjectFilter): Promise<Paginated<Project>>
  findById(id: string): Promise<Project | null>
  findBySlug(slug: string): Promise<Project | null>
  /** Supports the slug-uniqueness check; `exceptId` skips the record being updated. */
  slugExists(slug: string, exceptId?: string): Promise<boolean>
  create(input: CreateProjectInput & { slug: string }): Promise<Project>
  update(id: string, input: UpdateProjectInput): Promise<Project | null>
  delete(id: string): Promise<boolean>
  /**
   * Removes a technology reference from every project.
   *
   * This is the replacement for SQL's ON DELETE CASCADE. MongoDB has no
   * foreign keys, so the technology service calls this before deleting a
   * technology. Returns how many projects were affected.
   */
  detachTechnology(technologyId: string): Promise<number>
  countAll(): Promise<{ total: number; featured: number }>
}

/* ------------------------------------------------------------- Experience */

export interface ExperienceRepository {
  findAll(): Promise<Experience[]>
  findById(id: string): Promise<Experience | null>
  create(input: CreateExperienceInput): Promise<Experience>
  update(id: string, input: UpdateExperienceInput): Promise<Experience | null>
  delete(id: string): Promise<boolean>
  count(): Promise<number>
}

/* -------------------------------------------------------------- Education */

export interface EducationRepository {
  findAll(): Promise<Education[]>
  findById(id: string): Promise<Education | null>
  create(input: CreateEducationInput): Promise<Education>
  update(id: string, input: UpdateEducationInput): Promise<Education | null>
  delete(id: string): Promise<boolean>
  count(): Promise<number>
}

/* ------------------------------------------------------------------ Skill */

export interface SkillFilter {
  category?: SkillCategory
}

export interface SkillRepository {
  findAll(filter?: SkillFilter): Promise<Skill[]>
  findById(id: string): Promise<Skill | null>
  /** Backs the compound {name, category} uniqueness rule. */
  existsByNameAndCategory(
    name: string,
    category: SkillCategory,
    exceptId?: string
  ): Promise<boolean>
  create(input: CreateSkillInput): Promise<Skill>
  update(id: string, input: UpdateSkillInput): Promise<Skill | null>
  delete(id: string): Promise<boolean>
  count(): Promise<number>
}

/* --------------------------------------------------------- ContactMessage */

export interface ContactMessageFilter extends PageParams {
  status?: MessageStatus
  search?: string
}

export interface ContactMessageRepository {
  findMany(filter: ContactMessageFilter): Promise<Paginated<ContactMessage>>
  findById(id: string): Promise<ContactMessage | null>
  create(input: CreateContactMessageInput): Promise<ContactMessage>
  update(id: string, input: UpdateContactMessageInput): Promise<ContactMessage | null>
  delete(id: string): Promise<boolean>
  countByStatus(): Promise<{ total: number; unread: number }>
}

/* ---------------------------------------------------------------- Profile */

export interface ProfileRepository {
  /** Null only before the store has been seeded. */
  get(): Promise<Profile | null>
  update(input: UpdateProfileInput): Promise<Profile>
}

/* ------------------------------------------------------------- Aggregate */

/**
 * Every repository, resolved for the active data source.
 *
 * `repositories/index.ts` builds one of these; `container.ts` injects the
 * individual repositories into the services that need them.
 */
export interface Repositories {
  admins: AdminRepository
  sessions: SessionRepository
  profile: ProfileRepository
  technologies: TechnologyRepository
  projects: ProjectRepository
  experience: ExperienceRepository
  education: EducationRepository
  skills: SkillRepository
  contactMessages: ContactMessageRepository
}
