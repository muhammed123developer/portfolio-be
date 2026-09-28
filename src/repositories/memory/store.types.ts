import type {
  AdminRecord,
  AdminSession,
  ContactMessage,
  Education,
  Experience,
  Profile,
  ProjectRecord,
  Skill,
  Technology,
} from '../../types/domain'

/**
 * Shape of the in-memory dataset.
 *
 * In its own file to keep `store.ts` and `persistence.ts` free of a circular
 * import: the store schedules flushes through persistence, and persistence
 * needs the store's type.
 *
 * Note `projects` holds `ProjectRecord` (technologies as ids), matching how the
 * documents will look in MongoDB. Resolving those ids into full Technology
 * objects is the repository's job, so services always receive populated data.
 */
export interface MemoryStore {
  admins: AdminRecord[]
  sessions: AdminSession[]
  profile: Profile | null
  technologies: Technology[]
  projects: ProjectRecord[]
  experience: Experience[]
  education: Education[]
  skills: Skill[]
  contactMessages: ContactMessage[]
}

/**
 * The subset written to disk — everything except `admins` and `sessions`.
 *
 * The admin account is rebuilt from environment variables at every boot, so no
 * credential material is ever persisted. Sessions live only in memory, so a
 * restart signs every admin out — including after ADMIN_PASSWORD changes.
 */
export type PersistedStore = Omit<MemoryStore, 'admins' | 'sessions'>
