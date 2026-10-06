import { AdminSession as AdminSessionModel } from '../../models'
import type { AdminSession } from '../../types/domain'
import type { SessionRepository } from '../types'
import { toEntity } from './helpers'

/**
 * MongoDB session repository.
 *
 * Unlike the in-memory version, sessions survive a restart or redeploy. A TTL
 * index on `expiresAt` also removes expired sessions in the background.
 */
export class MongoSessionRepository implements SessionRepository {
  async create(session: AdminSession): Promise<void> {
    await AdminSessionModel.create({
      _id: session.id,
      adminId: session.adminId,
      createdAt: new Date(session.createdAt),
      lastSeenAt: new Date(session.lastSeenAt),
      expiresAt: new Date(session.expiresAt),
    })
  }

  async findById(id: string): Promise<AdminSession | null> {
    const doc = await AdminSessionModel.findById(id).lean()
    return doc ? toEntity<AdminSession>(doc) : null
  }

  async touch(id: string, at: string): Promise<void> {
    await AdminSessionModel.updateOne({ _id: id }, { $set: { lastSeenAt: new Date(at) } })
  }

  async delete(id: string): Promise<void> {
    await AdminSessionModel.deleteOne({ _id: id })
  }

  async deleteExpired(now: string): Promise<void> {
    await AdminSessionModel.deleteMany({ expiresAt: { $lte: new Date(now) } })
  }
}
