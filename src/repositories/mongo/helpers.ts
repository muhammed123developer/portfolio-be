import { isValidObjectId } from 'mongoose'

import { conflict } from '../../utils/AppError'
import { formatDateOnly } from '../../utils/mongooseHelpers'
import { normalisePaging } from '../memory/helpers'

/**
 * Shared mechanics for the MongoDB repositories.
 *
 * Every repository returns the plain domain types from types/domain.ts, never
 * a Mongoose document. The helpers here do that conversion, so services see
 * exactly the shape the in-memory backend produces: `id` as a string, full
 * timestamps as ISO strings and calendar dates as "YYYY-MM-DD".
 */

export { normalisePaging }

/** Fields that never leave the repository layer. */
const INTERNAL_FIELDS = new Set(['_id', '__v', 'singleton', 'passwordHash'])

/**
 * Converts a lean document into a domain entity.
 *
 * @param dateOnlyFields paths holding calendar dates, serialised as
 *   "YYYY-MM-DD"; every other Date becomes a full ISO timestamp.
 * @param keep internal fields to retain — only the admin login lookup passes
 *   `passwordHash` here.
 */
export function toEntity<T>(
  doc: object,
  dateOnlyFields: readonly string[] = [],
  keep: readonly string[] = []
): T {
  const entity: Record<string, unknown> = { id: String((doc as { _id?: unknown })._id) }

  for (const [key, value] of Object.entries(doc)) {
    if (INTERNAL_FIELDS.has(key) && !keep.includes(key)) continue
    if (dateOnlyFields.includes(key)) {
      entity[key] = formatDateOnly(value)
    } else if (value instanceof Date) {
      entity[key] = value.toISOString()
    } else {
      entity[key] = value
    }
  }

  return entity as T
}

/**
 * True when `id` can be looked up at all.
 *
 * Route validators already reject malformed ids, but repositories are also
 * reached from services and scripts, and Mongoose would otherwise throw a
 * CastError — a 500 — for what is really just "not found".
 */
export function isLookupableId(id: string): boolean {
  return isValidObjectId(id)
}

/** Only the keys the caller actually supplied, so partial updates stay partial. */
export function definedFields<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

/** Escapes user input for safe use inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Case-insensitive "contains" match, for search filters. */
export function containsIgnoreCase(term: string): RegExp {
  return new RegExp(escapeRegex(term.trim()), 'i')
}

/** Case-insensitive whole-value match, for uniqueness checks. */
export function equalsIgnoreCase(value: string): RegExp {
  return new RegExp(`^${escapeRegex(value.trim())}$`, 'i')
}

/**
 * Translates a duplicate-key error (11000) into the 409 the repository
 * contract promises, so the API cannot tell this backend from the in-memory
 * one. Anything else is rethrown untouched.
 */
export async function withConflictMapping<T>(message: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if ((error as { code?: number } | null)?.code === 11000) throw conflict(message)
    throw error
  }
}
