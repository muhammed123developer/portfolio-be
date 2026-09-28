import crypto from 'node:crypto'

/**
 * Generates a 24-character lowercase hex id.
 *
 * Deliberately the same shape as a MongoDB ObjectId. When the mock
 * repositories are replaced by Mongoose, ids keep the same format, which means
 * `isMongoId()` validators, existing URLs, seeded fixtures and the frontend's
 * `id: string` type all continue to work untouched.
 *
 * The first 4 bytes are a big-endian timestamp, as in a real ObjectId, so ids
 * also sort roughly by creation time — handy when eyeballing the JSON files.
 */
export function generateId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const header = Buffer.alloc(4)
  header.writeUInt32BE(timestamp, 0)
  return Buffer.concat([header, crypto.randomBytes(8)]).toString('hex')
}

/** True when a string could be an id produced by `generateId` (or Mongo). */
export function isValidId(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{24}$/.test(value)
}
