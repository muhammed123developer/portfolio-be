import { connectDatabase, describeConnectionError, disconnectDatabase } from '../config/database'
import { env } from '../config/env'

/**
 * Shared wrapper for the one-shot database scripts (`db:ping`, `db:indexes`,
 * `db:seed`, `db:drop`).
 *
 * Handles connect, disconnect and exit codes in one place so each script is
 * just its own logic, and so a failure always exits non-zero — which is what
 * makes these usable in CI or a deploy step rather than only by hand.
 */
export async function runScript(name: string, fn: () => Promise<void>): Promise<void> {
  const started = Date.now()
  console.log(`[${name}] connecting to MongoDB (${env.nodeEnv})…`)

  try {
    await connectDatabase()
  } catch (error) {
    console.error('')
    for (const line of describeConnectionError(error)) {
      console.error(`[${name}] ${line}`)
    }
    console.error('')
    console.error(error)
    process.exit(1)
  }

  try {
    await fn()
    console.log(`[${name}] done in ${Date.now() - started}ms`)
  } catch (error) {
    console.error(`[${name}] failed:`)
    console.error(error)
    await disconnectDatabase().catch(() => undefined)
    process.exit(1)
  }

  await disconnectDatabase()
  process.exit(0)
}

/** True when the given flag was passed on the command line. */
export function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag)
}
