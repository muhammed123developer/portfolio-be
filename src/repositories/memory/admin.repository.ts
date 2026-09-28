import type { Admin, AdminRecord } from '../../types/domain'
import type { AdminRepository } from '../types'
import { getStore } from './store'
import { clone } from './helpers'

/**
 * In-memory admin repository.
 *
 * The admin account is rebuilt from environment variables at every boot and is
 * never written to the JSON snapshot, so no credential material reaches disk.
 */
export class MemoryAdminRepository implements AdminRepository {
  async findById(id: string): Promise<Admin | null> {
    const found = getStore().admins.find((admin) => admin.id === id)
    if (!found) return null
    return this.withoutPassword(found)
  }

  /**
   * The only method that returns the bcrypt hash.
   *
   * Email comparison is lowercased on both sides so login is effectively
   * case-insensitive, matching the `lowercase: true` behaviour the Mongoose
   * schema will apply once MongoDB is wired up.
   */
  async findByEmailWithPassword(email: string): Promise<AdminRecord | null> {
    const target = email.trim().toLowerCase()
    const found = getStore().admins.find((admin) => admin.email.toLowerCase() === target)
    return found ? clone(found) : null
  }

  async recordLogin(id: string, at: string): Promise<void> {
    const found = getStore().admins.find((admin) => admin.id === id)
    if (!found) return
    found.lastLoginAt = at
    found.updatedAt = at
    // Deliberately not persisted — admins are excluded from the snapshot.
  }

  /** Strips the hash, mirroring the `select: false` behaviour of the schema. */
  private withoutPassword(record: AdminRecord): Admin {
    const { passwordHash: _passwordHash, ...rest } = clone(record)
    return rest
  }
}
