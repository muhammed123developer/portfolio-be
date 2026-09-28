import type { AdminSession } from '../../types/domain'
import type { SessionRepository } from '../types'
import { getStore } from './store'
import { clone } from './helpers'

/**
 * In-memory session repository.
 *
 * Never persisted to the JSON snapshot (see store.types.ts), so restarting the
 * server ends every session — which is also what makes a changed
 * ADMIN_PASSWORD sign out everyone who logged in with the old one.
 */
export class MemorySessionRepository implements SessionRepository {
  async create(session: AdminSession): Promise<void> {
    getStore().sessions.push(clone(session))
  }

  async findById(id: string): Promise<AdminSession | null> {
    const found = getStore().sessions.find((session) => session.id === id)
    return found ? clone(found) : null
  }

  async touch(id: string, at: string): Promise<void> {
    const found = getStore().sessions.find((session) => session.id === id)
    if (found) found.lastSeenAt = at
  }

  async delete(id: string): Promise<void> {
    const store = getStore()
    store.sessions = store.sessions.filter((session) => session.id !== id)
  }

  async deleteExpired(now: string): Promise<void> {
    const store = getStore()
    const cutoff = Date.parse(now)
    store.sessions = store.sessions.filter((session) => Date.parse(session.expiresAt) > cutoff)
  }
}
