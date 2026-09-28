import crypto from 'node:crypto'

import { env } from '../config/env'
import type { Admin } from '../types/domain'
import type { AdminRepository, SessionRepository } from '../repositories/types'
import { unauthorized } from '../utils/AppError'
import { verifyPassword } from '../utils/password'
import { signToken, verifyToken } from '../utils/jwt'

/**
 * Authentication business logic.
 *
 * Receives its repository through the constructor, so swapping the storage
 * backend — or passing a stub in a test — changes one argument and nothing
 * else. This service never touches Express: no `req`, no `res`, no cookies.
 * The controller owns HTTP; this owns the rules.
 */
/** How stale lastSeenAt may get before an authenticated request refreshes it. */
const TOUCH_INTERVAL_MS = 60 * 1000

export class AuthService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly sessions: SessionRepository
  ) {}

  /**
   * Verifies credentials, opens a new server-side session and issues a token
   * bound to it. Every login gets a fresh session id, so nothing from before
   * the login (a planted cookie, an old token) carries over.
   *
   * Both "no such account" and "wrong password" produce the *same* error, with
   * the same message. Distinguishing them would let an attacker enumerate
   * valid admin emails by comparing responses.
   */
  async login(email: string, password: string): Promise<{ admin: Admin; token: string }> {
    const record = await this.admins.findByEmailWithPassword(email)

    if (!record) {
      // Hash the supplied password anyway before failing. Otherwise a missing
      // account returns measurably faster than a wrong password, and that
      // timing difference alone reveals which emails exist.
      await verifyPassword(password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
      throw unauthorized('Invalid email or password')
    }

    const matches = await verifyPassword(password, record.passwordHash)
    if (!matches) {
      throw unauthorized('Invalid email or password')
    }

    const now = Date.now()
    const timestamp = new Date(now).toISOString()
    await this.admins.recordLogin(record.id, timestamp)

    await this.sessions.deleteExpired(timestamp)
    const sessionId = crypto.randomBytes(32).toString('base64url')
    await this.sessions.create({
      id: sessionId,
      adminId: record.id,
      createdAt: timestamp,
      lastSeenAt: timestamp,
      expiresAt: new Date(now + env.sessionMaxMs).toISOString(),
    })

    return {
      admin: this.toPublicAdmin({ ...record, lastLoginAt: timestamp }),
      token: signToken(record.id, sessionId),
    }
  }

  /**
   * Resolves a token to the current admin and its live session.
   *
   * A valid signature is not enough: the session the token names must still
   * exist (not logged out, not lost to a restart), be inside its absolute cap
   * and have been used within the idle timeout. The admin is re-read on every
   * request rather than trusted from the token, so a deleted account stops
   * working immediately.
   */
  async authenticate(token: string): Promise<{ admin: Admin; sessionId: string }> {
    // Throws JsonWebTokenError / TokenExpiredError, both mapped to 401 by the
    // central error handler.
    const payload = verifyToken(token)

    const session = await this.sessions.findById(payload.sid)
    if (!session || session.adminId !== payload.sub) {
      throw unauthorized('Your session has ended, please log in again')
    }

    const now = Date.now()
    const idleFor = now - Date.parse(session.lastSeenAt)
    if (now >= Date.parse(session.expiresAt) || idleFor > env.sessionIdleMs) {
      await this.sessions.delete(session.id)
      throw unauthorized('Your session has expired, please log in again')
    }

    const admin = await this.admins.findById(payload.sub)
    if (!admin) {
      await this.sessions.delete(session.id)
      throw unauthorized('Your session is no longer valid, please log in again')
    }

    // Refreshing at most once a minute keeps the idle clock accurate to a
    // minute without a write on every single request.
    if (idleFor > TOUCH_INTERVAL_MS) {
      await this.sessions.touch(session.id, new Date(now).toISOString())
    }

    return { admin, sessionId: session.id }
  }

  /**
   * Ends the session a token belongs to. Best effort: an invalid or expired
   * token has no live session to end, and logout must still succeed.
   */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return
    try {
      const { sid } = verifyToken(token)
      await this.sessions.delete(sid)
    } catch {
      // Nothing to revoke.
    }
  }

  /** Drops the password hash, whatever the repository handed back. */
  private toPublicAdmin(record: Admin & { passwordHash?: string }): Admin {
    const { passwordHash: _passwordHash, ...admin } = record
    return admin
  }
}
