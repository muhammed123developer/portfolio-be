import { Admin as AdminModel, AdminSession as AdminSessionModel } from '../../models'
import { env } from '../../config/env'
import { buildSeedAdmin } from '../../mocks/dataset'
import type { Admin, AdminRecord } from '../../types/domain'
import { verifyPassword } from '../../utils/password'
import type { AdminRepository } from '../types'
import { isLookupableId, toEntity } from './helpers'

/**
 * MongoDB admin repository.
 *
 * `passwordHash` is `select: false` on the schema, so every query here omits it
 * unless it explicitly opts in — only `findByEmailWithPassword` does.
 */
export class MongoAdminRepository implements AdminRepository {
  async findById(id: string): Promise<Admin | null> {
    if (!isLookupableId(id)) return null
    const doc = await AdminModel.findById(id).lean()
    return doc ? toEntity<Admin>(doc) : null
  }

  async findByEmailWithPassword(email: string): Promise<AdminRecord | null> {
    const doc = await AdminModel.findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .lean()
    return doc ? toEntity<AdminRecord>(doc, [], ['passwordHash']) : null
  }

  async recordLogin(id: string, at: string): Promise<void> {
    if (!isLookupableId(id)) return
    await AdminModel.updateOne({ _id: id }, { $set: { lastLoginAt: new Date(at) } })
  }
}

/**
 * Makes the database's admin account match ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * Keeps the in-memory backend's rule that the environment is the source of
 * truth for the one admin account:
 *
 *  - the password is re-hashed only when ADMIN_PASSWORD no longer matches the
 *    stored hash, and that also ends every existing session;
 *  - an admin under any other email (an old ADMIN_EMAIL) is removed, so a
 *    retired credential cannot keep working.
 *
 * Called once at boot, before the server accepts traffic.
 */
export async function syncAdminFromEnv(): Promise<void> {
  // buildSeedAdmin validates the env values and produces the hash; its
  // deterministic id is reused so the account keeps one id across backends.
  const email = env.adminEmail.trim().toLowerCase()
  const existing = await AdminModel.findOne({ email }).select('+passwordHash').lean()

  const stale = await AdminModel.find({ email: { $ne: email } }).select('_id').lean()
  if (stale.length > 0) {
    const staleIds = stale.map((doc) => String(doc._id))
    await AdminSessionModel.deleteMany({ adminId: { $in: staleIds } })
    await AdminModel.deleteMany({ _id: { $in: staleIds } })
    console.log(`[auth]  removed ${stale.length} admin account(s) not matching ADMIN_EMAIL`)
  }

  if (existing && (await verifyPassword(env.adminPassword, existing.passwordHash))) {
    if (existing.name !== env.adminName) {
      await AdminModel.updateOne({ _id: existing._id }, { $set: { name: env.adminName } })
    }
    return
  }

  const seed = await buildSeedAdmin()

  if (existing) {
    await AdminModel.updateOne(
      { _id: existing._id },
      { $set: { name: seed.name, passwordHash: seed.passwordHash } }
    )
    // A changed password must sign out everyone who logged in with the old one.
    await AdminSessionModel.deleteMany({ adminId: String(existing._id) })
    console.log('[auth]  ADMIN_PASSWORD changed — password updated and sessions cleared')
    return
  }

  await AdminModel.create({
    _id: seed.id,
    name: seed.name,
    email: seed.email,
    passwordHash: seed.passwordHash,
    lastLoginAt: null,
  })
  console.log('[auth]  admin account created from ADMIN_EMAIL / ADMIN_PASSWORD')
}
