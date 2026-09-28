import type { Paginated } from '../types'

/**
 * Shared mechanics for the in-memory repositories.
 */

/**
 * Deep copy on the way out of the store.
 *
 * Without this, a caller holding a returned object would hold a live reference
 * into the store and could mutate it in place — something no real database
 * would ever allow. Copying keeps the in-memory backend honest, so code that
 * works here also works against MongoDB.
 */
export function clone<T>(value: T): T {
  return structuredClone(value)
}

/** Default and maximum page sizes, applied consistently across resources. */
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

/** Clamps caller-supplied paging values into a sane range. */
export function normalisePaging(page?: number, limit?: number): { page: number; limit: number } {
  const safePage = Number.isFinite(page) && (page ?? 0) > 0 ? Math.floor(page as number) : 1
  const requested =
    Number.isFinite(limit) && (limit ?? 0) > 0 ? Math.floor(limit as number) : DEFAULT_PAGE_SIZE
  return { page: safePage, limit: Math.min(requested, MAX_PAGE_SIZE) }
}

/** Slices an already-sorted, already-filtered array into a page of results. */
export function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const start = (page - 1) * limit
  return {
    items: clone(items.slice(start, start + limit)),
    total: items.length,
    page,
    limit,
  }
}

/** Case- and accent-insensitive substring match, for search filters. */
export function matches(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

/** Sorts by `displayOrder`, falling back to a secondary comparator for ties. */
export function byDisplayOrder<T extends { displayOrder: number }>(
  a: T,
  b: T,
  tiebreak: (a: T, b: T) => number = () => 0
): number {
  return a.displayOrder - b.displayOrder || tiebreak(a, b)
}

/** Newest first, by ISO timestamp. ISO strings sort correctly as strings. */
export function byNewest<T extends { createdAt: string }>(a: T, b: T): number {
  return b.createdAt.localeCompare(a.createdAt)
}
