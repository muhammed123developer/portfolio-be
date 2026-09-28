/**
 * Calendar-date helpers.
 *
 * The domain model stores calendar dates as "YYYY-MM-DD" strings rather than
 * Date objects. A role that began in "March 2023" has no meaningful time of
 * day, and storing a timestamp lets a timezone conversion shift the displayed
 * month — 2023-03-01T00:00:00Z read back west of UTC becomes 28 February.
 * Keeping them as strings removes the ambiguity entirely.
 *
 * Storage-agnostic on purpose: used by the in-memory repositories now, and by
 * the Mongo repositories later to convert at the Date/string boundary.
 */

/** Matches a "YYYY-MM-DD" prefix. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Normalises any supported date input to "YYYY-MM-DD".
 *
 * Returns null for anything unparseable, so the caller's validator produces
 * the error message rather than this helper throwing something less useful.
 */
export function toDateOnly(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }

  const match = DATE_ONLY.exec(String(value))
  if (!match) return null

  const [, year, month, day] = match
  if (!year || !month || !day) return null

  const monthIndex = Number(month) - 1
  const parsed = new Date(Date.UTC(Number(year), monthIndex, Number(day)))
  if (Number.isNaN(parsed.getTime())) return null
  // Rejects impossible dates such as 2023-02-31, which Date would roll over
  // into March rather than refusing.
  if (parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== Number(day)) return null

  return parsed.toISOString().slice(0, 10)
}

/** True when the string is a real calendar date in "YYYY-MM-DD" form. */
export function isValidDateOnly(value: unknown): boolean {
  return toDateOnly(value) !== null
}

/**
 * True when `end` is on or after `start`.
 *
 * A null `end` means "present" (current role, or still studying) and is always
 * valid. This rule used to be a database CHECK constraint; it now lives in the
 * service layer so it holds for every storage backend.
 */
export function isChronological(start: string, end: string | null | undefined): boolean {
  if (!end) return true
  // ISO "YYYY-MM-DD" strings sort correctly as plain strings.
  return end >= start
}

/** Current time as an ISO 8601 timestamp — the form used by every entity. */
export function nowIso(): string {
  return new Date().toISOString()
}
