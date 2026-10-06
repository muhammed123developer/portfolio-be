import { Schema, model } from 'mongoose'

/**
 * A server-side admin login session — see `AdminSession` in types/domain.ts.
 *
 * Stored in MongoDB rather than process memory so that a restart or redeploy
 * does not sign the admin out, and so the idle/absolute limits still hold if
 * the API ever runs on more than one instance.
 *
 * `_id` is the random session id carried in the JWT (`sid`), not an ObjectId.
 *
 * Expired sessions are removed by a TTL index on `expiresAt`, so the
 * collection cleans itself up without a cron job. The auth service still
 * checks expiry on every request — TTL deletion runs only about once a minute.
 */
export interface AdminSessionAttributes {
  _id: string
  adminId: string
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date
}

const adminSessionSchema = new Schema<AdminSessionAttributes>(
  {
    _id: { type: String, required: true },
    adminId: { type: String, required: true, index: true },
    createdAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  // Timestamps are supplied by the auth service, which owns the session clock.
  { timestamps: false, versionKey: false }
)

adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const AdminSession = model<AdminSessionAttributes>(
  'AdminSession',
  adminSessionSchema,
  'adminsessions'
)
