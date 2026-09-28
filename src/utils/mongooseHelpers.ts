import type { SchemaOptions } from 'mongoose'

/**
 * Shared Mongoose schema conventions.
 *
 * Every schema in this project is built with `schemaOptions()`, which
 * guarantees two things the rest of the stack depends on:
 *
 *  1. Documents serialise with `id` (a string) and without `_id` or `__v`, so
 *     the JSON the API returns is identical to what the frontend already
 *     expects. No component knows or cares that the database is MongoDB.
 *
 *  2. Calendar dates round-trip as "YYYY-MM-DD" rather than as timestamps.
 */

/**
 * Parses a calendar date into a Date pinned to UTC midnight.
 *
 * MongoDB has no date-only type, so a value like "2023-03-01" would otherwise
 * be stored using the server's local timezone. Read back somewhere west of
 * UTC, that becomes 28 February — which silently shifts the month shown in the
 * experience and education timelines. Pinning to UTC midnight removes the
 * ambiguity entirely.
 *
 * Returns null for unparseable input so the schema's own validator produces the
 * error message, rather than this helper throwing something less useful.
 */
export function parseDateOnly(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (!match) return null

  const [, year, month, day] = match
  if (!year || !month || !day) return null

  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  // Rejects impossible dates such as 2023-02-31, which Date would roll over.
  if (Number.isNaN(parsed.getTime())) return null
  if (parsed.getUTCMonth() !== Number(month) - 1) return null

  return parsed
}

/** Formats a stored Date back to "YYYY-MM-DD" for the API response. */
export function formatDateOnly(value: unknown): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null
  return value.toISOString().slice(0, 10)
}

/**
 * Builds the options block shared by every schema.
 *
 * @param dateOnlyFields paths that represent calendar dates and should be
 *   serialised as "YYYY-MM-DD" instead of full ISO timestamps.
 */
export function schemaOptions(dateOnlyFields: readonly string[] = []): SchemaOptions {
  const transform = (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
    // Mongoose's built-in `id` virtual already provides the string form; this
    // just removes the Mongo-specific fields the API should not expose.
    delete ret._id
    delete ret.__v

    for (const field of dateOnlyFields) {
      if (field in ret) {
        ret[field] = formatDateOnly(ret[field])
      }
    }

    return ret
  }

  return {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false, transform },
    toObject: { virtuals: true, versionKey: false, transform },
  }
}

/**
 * Turns a slug-like string into a URL-safe slug.
 *
 * Lives here rather than in a service because both the Project service and the
 * seed script need identical behaviour.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    // Strip diacritics so "Café" becomes "cafe" rather than "caf".
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}
