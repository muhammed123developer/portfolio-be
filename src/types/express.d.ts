import type { Admin } from './domain'

/**
 * Augments Express's Request with the authenticated admin.
 *
 * `requireAuth` populates this, so any handler behind that middleware can read
 * `req.admin` with full type safety and without casting.
 *
 * Deliberately typed as `Admin`, never `AdminRecord` — the bcrypt hash is not
 * representable here, so it cannot reach a controller even by accident.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: Admin
      /** The server-side session the request authenticated with. */
      sessionId?: string
    }
  }
}

export {}
