import { env } from '../../config/env'
import { buildMockData, buildSeedAdmin } from '../../mocks/dataset'
import { loadSnapshot, scheduleFlush, writeSnapshot } from './persistence'
import type { MemoryStore, PersistedStore } from './store.types'

/**
 * The in-memory dataset and its lifecycle.
 *
 * A module-level singleton: every repository reads and mutates this one object,
 * so behaviour matches a real shared database rather than each repository
 * owning a private copy.
 */

function emptyStore(): MemoryStore {
  return {
    admins: [],
    sessions: [],
    profile: null,
    technologies: [],
    projects: [],
    experience: [],
    education: [],
    skills: [],
    contactMessages: [],
  }
}

let store: MemoryStore = emptyStore()
let initialised = false

/** The live store. Repositories call this rather than holding a reference. */
export function getStore(): MemoryStore {
  if (!initialised) {
    throw new Error(
      'The in-memory store was used before initStore() ran. ' +
        'server.ts must await initStore() during boot, and tests must call it in beforeAll().'
    )
  }
  return store
}

/**
 * Call after any mutation so the change reaches disk.
 *
 * Debounced inside `persistence`, and a no-op when DATA_PERSIST is off (always
 * the case under test), so repositories can call it unconditionally.
 */
export function persist(): void {
  scheduleFlush(store)
}

function applyPersisted(data: PersistedStore): void {
  store.profile = data.profile
  store.technologies = data.technologies
  store.projects = data.projects
  store.experience = data.experience
  store.education = data.education
  store.skills = data.skills
  store.contactMessages = data.contactMessages
}

/**
 * Boots the store.
 *
 * Restores the JSON snapshot when one exists, otherwise seeds from the mock
 * dataset. The admin account is always rebuilt from ADMIN_EMAIL /
 * ADMIN_PASSWORD — it is never restored from disk, because credential material
 * is never written there.
 */
export async function initStore(): Promise<void> {
  store = emptyStore()

  const snapshot = loadSnapshot()
  if (snapshot) {
    applyPersisted(snapshot)
    console.log('[store] restored from snapshot')
  } else {
    applyPersisted(buildMockData())
    console.log('[store] seeded from mock dataset')
  }

  // bcrypt hashing is why this function is async.
  store.admins = [await buildSeedAdmin()]

  initialised = true

  // Write straight away when seeding fresh, so the file exists from the start.
  if (!snapshot && env.dataPersist) writeSnapshot(store)
}

/**
 * Resets to the pristine mock dataset.
 *
 * Used by the test suite between cases: it gives every test the same starting
 * data without any database, which is what makes the suite both fast and
 * genuinely isolated.
 */
export async function resetStore(): Promise<void> {
  store = emptyStore()
  applyPersisted(buildMockData())
  store.admins = [await buildSeedAdmin()]
  initialised = true
}

/** Empties every collection. Used by tests that assert empty states. */
export function clearStore(): void {
  const empty = emptyStore()
  applyPersisted({
    profile: empty.profile,
    technologies: empty.technologies,
    projects: empty.projects,
    experience: empty.experience,
    education: empty.education,
    skills: empty.skills,
    contactMessages: empty.contactMessages,
  })
  initialised = true
}
