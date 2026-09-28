import type { Profile, UpdateProfileInput } from '../../types/domain'
import type { ProfileRepository } from '../types'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { clone } from './helpers'

/**
 * In-memory profile repository.
 *
 * The profile is a singleton: one record backing the Home hero, the About page
 * and the admin Settings screen. The store holds it as a single nullable value
 * rather than an array, so a second profile is unrepresentable — the in-memory
 * equivalent of the unique index the MongoDB version will carry.
 */
export class MemoryProfileRepository implements ProfileRepository {
  async get(): Promise<Profile | null> {
    const profile = getStore().profile
    return profile ? clone(profile) : null
  }

  /**
   * Updates the profile, creating it if the store has none.
   *
   * Upsert rather than a strict update because Settings must remain usable
   * even against an empty store — otherwise the screen would be unreachable
   * until something else created the record first.
   */
  async update(input: UpdateProfileInput): Promise<Profile> {
    const store = getStore()
    const timestamp = nowIso()

    if (!store.profile) {
      store.profile = {
        id: generateId(),
        fullName: input.fullName ?? 'Your Name',
        title: input.title ?? 'Full-Stack Developer',
        tagline: input.tagline ?? null,
        introduction: input.introduction ?? null,
        philosophy: input.philosophy ?? null,
        currentFocus: input.currentFocus ?? null,
        technicalInterests: input.technicalInterests ?? [],
        careerSummary: input.careerSummary ?? null,
        publicEmail: input.publicEmail ?? null,
        location: input.location ?? null,
        githubUrl: input.githubUrl ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        websiteUrl: input.websiteUrl ?? null,
        avatarUrl: input.avatarUrl ?? null,
        resumeUrl: input.resumeUrl ?? null,
        availableForWork: input.availableForWork ?? true,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      persist()
      return clone(store.profile)
    }

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) Object.assign(store.profile, { [key]: value })
    }

    store.profile.updatedAt = timestamp
    persist()
    return clone(store.profile)
  }
}
