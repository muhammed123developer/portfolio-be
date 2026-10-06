import fs from 'node:fs'
import type { Server } from 'node:http'

import { createApp } from './app'
import { env } from './config/env'
import { connectDatabase, describeConnectionError, disconnectDatabase } from './config/database'
import { initStore } from './repositories/memory/store'
import { flushPending, writeSnapshot } from './repositories/memory/persistence'
import { getStore } from './repositories/memory/store'
import { syncAdminFromEnv } from './repositories/mongo/admin.repository'

/**
 * Process entry point: prepare storage, bind the port, and shut down cleanly.
 * Kept separate from app.ts so tests can exercise the app in-process without
 * ever opening a socket.
 */

async function start(): Promise<void> {
  // Uploads are written at runtime and the directory is gitignored, so it may
  // not exist on a fresh clone or a fresh container.
  fs.mkdirSync(env.uploadDirAbsolute, { recursive: true })

  // Fail fast: storage that cannot initialise should stop the process now,
  // with a clear message, rather than surfacing as 500s on first traffic.
  try {
    if (env.usesMemoryStore) {
      await initStore()
      console.log(
        `[store] ready (source: memory, persistence: ${env.dataPersist ? 'on' : 'off'})`
      )
    } else {
      try {
        await connectDatabase()
      } catch (error) {
        for (const line of describeConnectionError(error)) console.error(`[store] ${line}`)
        throw error
      }
      await syncAdminFromEnv()
      console.log(`[store] ready (source: mongo, database: ${env.mongodbDbName})`)
    }
    // The admin account is built from ADMIN_EMAIL/ADMIN_PASSWORD at boot and
    // is NOT reloaded afterwards. Printing the email (never the password)
    // makes it obvious when the running server predates an edit to .env —
    // otherwise a corrected credential looks like it simply does not work.
    console.log(`[auth]  admin account loaded for: ${env.adminEmail}`)
  } catch (error) {
    console.error('')
    console.error('[store] failed to initialise:')
    console.error(error instanceof Error ? `  ${error.message}` : error)
    console.error('')
    process.exit(1)
  }

  const app = createApp()
  const server: Server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`)
    console.log(`[server] health check: http://localhost:${env.port}/api/health`)
    console.log(`[server] accepting browser requests from ${env.clientUrl}`)
  })

  /**
   * Graceful shutdown: stop accepting new connections, let in-flight requests
   * finish, then flush pending state. Without the final flush, a change made
   * seconds before a restart would be lost inside the debounce window.
   */
  const shutdown = (signal: string) => {
    console.log(`\n[server] ${signal} received, shutting down`)
    server.close(() => {
      if (env.usesMemoryStore) flushPending()
      void disconnectDatabase()
        .catch(() => undefined)
        .finally(() => {
          console.log('[server] closed cleanly')
          process.exit(0)
        })
    })

    // Do not hang forever on a stuck connection. Flush before exiting anyway,
    // so a wedged socket does not also cost the operator their unsaved changes.
    setTimeout(() => {
      console.error('[server] forced shutdown after timeout')
      try {
        if (env.usesMemoryStore) writeSnapshot(getStore())
      } catch {
        // Nothing useful left to do at this point.
      }
      process.exit(1)
    }, 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // A rejection that reaches this point means a bug escaped our error handling.
  process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandled promise rejection:', reason)
    shutdown('unhandledRejection')
  })
}

void start()
