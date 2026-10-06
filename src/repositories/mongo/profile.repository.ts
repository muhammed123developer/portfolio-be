import { Profile as ProfileModel } from '../../models'
import type { Profile, UpdateProfileInput } from '../../types/domain'
import type { ProfileRepository } from '../types'
import { definedFields, toEntity } from './helpers'

/**
 * MongoDB profile repository.
 *
 * The profile is a single document; the unique index on `singleton` makes a
 * second one impossible at the database level.
 */
export class MongoProfileRepository implements ProfileRepository {
  async get(): Promise<Profile | null> {
    const doc = await ProfileModel.findOne().lean()
    return doc ? toEntity<Profile>(doc) : null
  }

  /** Upserts, so Settings stays usable against an empty database. */
  async update(input: UpdateProfileInput): Promise<Profile> {
    const fields = definedFields(input)
    const doc =
      (await ProfileModel.findOne()) ??
      new ProfileModel({ fullName: 'Your Name', title: 'Full-Stack Developer' })

    doc.set(fields)
    await doc.save()
    return toEntity<Profile>(doc.toObject({ transform: false, virtuals: false }))
  }
}
