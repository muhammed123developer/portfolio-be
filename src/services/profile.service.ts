import type { Profile, UpdateProfileInput } from '../types/domain'
import type { ProfileRepository } from '../repositories/types'
import { notFound } from '../utils/AppError'

/**
 * Profile business logic.
 *
 * The profile is a singleton backing the Home hero, the About page and the
 * admin Settings screen — the record that makes those editable at runtime
 * rather than hardcoded in React.
 */
export class ProfileService {
  constructor(private readonly profile: ProfileRepository) {}

  /**
   * Public read.
   *
   * Throws 404 when the store has no profile, so the frontend renders its
   * empty state rather than a page full of "undefined".
   */
  async get(): Promise<Profile> {
    const profile = await this.profile.get()
    if (!profile) throw notFound('Profile has not been set up yet')
    return profile
  }

  /** Admin-only. Upserts, so Settings stays usable against an empty store. */
  async update(input: UpdateProfileInput): Promise<Profile> {
    return this.profile.update(input)
  }
}
