import bcrypt from 'bcrypt'

/**
 * Password hashing.
 *
 * Isolated behind two functions so the cost factor is defined once and the
 * rest of the codebase never touches bcrypt directly. A plain-text password
 * exists only as a function argument — it is never stored, logged or returned.
 */

/**
 * bcrypt work factor. 12 is the current sensible default: roughly 250ms per
 * hash on modern hardware, which is slow enough to make offline brute-forcing
 * expensive without making login feel sluggish.
 */
const SALT_ROUNDS = 12

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS)
}

/**
 * Verifies a password against a stored hash.
 *
 * bcrypt.compare is constant-time with respect to the hash, so it does not leak
 * information through timing. The caller must still return an identical error
 * for "no such user" and "wrong password" — see auth.service.ts.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash) return false
  return bcrypt.compare(plainText, hash)
}
