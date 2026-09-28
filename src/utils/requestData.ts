import type { Request } from 'express'
import { matchedData } from 'express-validator'

/**
 * Reads validated-and-sanitised request data.
 *
 * WHY THIS EXISTS — a genuine Express 5 behaviour change:
 *
 * In Express 5, `req.query` is a getter that parses the query string and
 * returns a **new object on every access** (`req.query !== req.query`). That
 * breaks express-validator's sanitisers: `.toInt()` and `.toBoolean()` write
 * their converted value back into the object they were handed, which Express
 * then throws away. Reading `req.query.limit` afterwards yields the original
 * string, so a numeric comparison silently fails and the filter is ignored —
 * no error, no warning, just a query parameter that quietly does nothing.
 *
 * `matchedData()` does not read `req.query`; it reads express-validator's own
 * record of each field, which holds the sanitised value. So it returns
 * `limit: 5` as a number where `req.query.limit` gives `"5"` as a string.
 *
 * Controllers therefore read query parameters through these helpers, never
 * from `req.query` directly.
 *
 * Note that only fields with a validation chain are returned — a parameter
 * with no chain is invisible here, which is the intended behaviour: undeclared
 * input should not reach a service.
 */

/** Sanitised query-string parameters. */
export function queryData<T extends Record<string, unknown>>(req: Request): Partial<T> {
  return matchedData(req, { locations: ['query'], includeOptionals: false }) as Partial<T>
}

/** Sanitised route parameters. */
export function paramData<T extends Record<string, unknown>>(req: Request): Partial<T> {
  return matchedData(req, { locations: ['params'], includeOptionals: false }) as Partial<T>
}
