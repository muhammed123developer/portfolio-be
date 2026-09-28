import { env } from '../config/env'
import { models } from '../models'
import { hasFlag, runScript } from './runScript'

/**
 * Drops every collection this application owns.
 *
 * Destructive, so it refuses to run against NODE_ENV=production unless
 * `--force` is passed explicitly. Collections belonging to other applications
 * sharing the cluster are left alone — this only touches the models in the
 * registry.
 */
void runScript('db:drop', async () => {
  if (env.isProduction && !hasFlag('--force')) {
    throw new Error(
      'Refusing to drop collections with NODE_ENV=production. ' +
        'Re-run with --force if this is genuinely what you want.'
    )
  }

  for (const [name, model] of Object.entries(models)) {
    try {
      await model.collection.drop()
      console.log(`  dropped ${name}`)
    } catch (error) {
      // "ns not found" simply means the collection was never created.
      if (error instanceof Error && /ns not found/i.test(error.message)) {
        console.log(`  skipped ${name} (did not exist)`)
        continue
      }
      throw error
    }
  }
})
