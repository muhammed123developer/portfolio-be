import { env } from '../config/env'
import { deleteSnapshot, writeSnapshot } from '../repositories/memory/persistence'
import { getStore, resetStore } from '../repositories/memory/store'

/**
 * Discards the JSON snapshot and rebuilds it from src/mocks/dataset.ts.
 *
 * Use this after editing the mock dataset, or to throw away changes made
 * through the admin panel and get back to a known state.
 *
 * Runs without any database connection, so it works regardless of whether
 * MongoDB has been configured yet.
 */
async function main(): Promise<void> {
  console.log('[mock:reset] discarding snapshot and reseeding from src/mocks/dataset.ts')

  deleteSnapshot()

  // resetStore() rebuilds the in-memory dataset; initStore() would otherwise
  // reload whatever is on disk.
  await resetStore()

  const store = getStore()
  console.log('  profile         :', store.profile ? 1 : 0)
  console.log('  technologies    :', store.technologies.length)
  console.log('  projects        :', store.projects.length)
  console.log('  experience      :', store.experience.length)
  console.log('  education       :', store.education.length)
  console.log('  skills          :', store.skills.length)
  console.log('  contactMessages :', store.contactMessages.length)
  console.log('  admins          :', store.admins.length, '(rebuilt from env, never persisted)')

  if (env.dataPersist) {
    writeSnapshot(store)
    console.log(`[mock:reset] snapshot written to ${env.dataDir}`)
  } else {
    console.log('[mock:reset] DATA_PERSIST is off — nothing written to disk')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[mock:reset] failed:')
    console.error(error instanceof Error ? `  ${error.message}` : error)
    process.exit(1)
  })
