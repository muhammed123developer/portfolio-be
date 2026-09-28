import fs from 'node:fs'
import path from 'node:path'

import { env } from '../../config/env'
import type { MemoryStore, PersistedStore } from './store.types'

/**
 * Mirrors the in-memory store to a JSON file so work done through the admin
 * panel survives a dev-server restart.
 *
 * The arrays in memory remain the source of truth; this is a write-behind
 * mirror, never read during normal operation — only at boot.
 *
 * Two deliberate choices:
 *
 *  1. **Admins are never persisted.** The admin is rebuilt at every boot from
 *     ADMIN_EMAIL / ADMIN_PASSWORD, so no credential material — not even a
 *     bcrypt hash — is ever written to disk.
 *
 *  2. **Writes are debounced and atomic.** A burst of updates produces one
 *     write, and the file is written to a temporary path then renamed, so an
 *     interrupted write cannot leave a half-written file that fails to parse
 *     on the next boot.
 */

const SNAPSHOT_FILE = 'store.json'
const FLUSH_DELAY_MS = 250

/** Bumped if the persisted shape ever changes, so stale files are discarded. */
const SNAPSHOT_VERSION = 1

interface Snapshot {
  version: number
  savedAt: string
  data: PersistedStore
}

let flushTimer: NodeJS.Timeout | null = null
let pendingStore: MemoryStore | null = null

function snapshotPath(): string {
  return path.join(env.dataDir, SNAPSHOT_FILE)
}

/** Everything except the admin account — see note 1 above. */
function toPersisted(store: MemoryStore): PersistedStore {
  return {
    profile: store.profile,
    technologies: store.technologies,
    projects: store.projects,
    experience: store.experience,
    education: store.education,
    skills: store.skills,
    contactMessages: store.contactMessages,
  }
}

/**
 * Reads the snapshot from disk.
 *
 * Returns null — rather than throwing — when the file is missing, unreadable,
 * corrupt or from an older version. A broken mock-data file should reseed, not
 * crash the server.
 */
export function loadSnapshot(): PersistedStore | null {
  if (!env.dataPersist) return null

  const file = snapshotPath()
  if (!fs.existsSync(file)) return null

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot
    if (parsed.version !== SNAPSHOT_VERSION) {
      console.warn(`[store] ignoring snapshot from version ${parsed.version}, reseeding`)
      return null
    }
    return parsed.data
  } catch (error) {
    console.warn('[store] snapshot could not be read, reseeding from mock data')
    console.warn(error instanceof Error ? error.message : error)
    return null
  }
}

/** Writes the snapshot immediately. Used on shutdown and by flushNow(). */
export function writeSnapshot(store: MemoryStore): void {
  if (!env.dataPersist) return

  const snapshot: Snapshot = {
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    data: toPersisted(store),
  }

  try {
    fs.mkdirSync(env.dataDir, { recursive: true })
    const target = snapshotPath()
    const temporary = `${target}.tmp`
    // Write-then-rename: rename is atomic, so a crash mid-write leaves the
    // previous good snapshot intact rather than a truncated file.
    fs.writeFileSync(temporary, JSON.stringify(snapshot, null, 2), 'utf8')
    fs.renameSync(temporary, target)
  } catch (error) {
    // Persistence is a development convenience — never fail a request over it.
    console.warn('[store] could not write snapshot:', error instanceof Error ? error.message : error)
  }
}

/**
 * Queues a write. Repeated calls inside the debounce window collapse into one,
 * so a bulk edit does not rewrite the file once per record.
 */
export function scheduleFlush(store: MemoryStore): void {
  if (!env.dataPersist) return

  pendingStore = store
  if (flushTimer) return

  flushTimer = setTimeout(() => {
    flushTimer = null
    if (pendingStore) writeSnapshot(pendingStore)
    pendingStore = null
  }, FLUSH_DELAY_MS)

  // Do not hold the event loop open purely to flush mock data.
  flushTimer.unref?.()
}

/** Flushes any queued write immediately. Called during graceful shutdown. */
export function flushPending(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pendingStore) {
    writeSnapshot(pendingStore)
    pendingStore = null
  }
}

/** Deletes the snapshot file. Used by the mock reset script. */
export function deleteSnapshot(): void {
  const file = snapshotPath()
  if (fs.existsSync(file)) fs.rmSync(file)
}
