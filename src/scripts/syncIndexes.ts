import { models } from '../models'
import { runScript } from './runScript'

/**
 * Reconciles the database's indexes with the ones declared on the Mongoose
 * schemas: creates what is missing, drops what the schemas no longer declare.
 *
 * Index creation is an explicit, observable step rather than something that
 * happens implicitly on first write — `autoIndex` is off in
 * src/config/database.ts — so building an index can never silently block a
 * production request. Run this after any schema change, and as part of deploy.
 *
 * The trade-off, documented in the README: there is no ordered rollback
 * history. The schemas are the source of truth, and this brings the database
 * into line with them.
 */
void runScript('db:indexes', async () => {
  for (const [name, model] of Object.entries(models)) {
    // `autoCreate` is off, so a collection that has never been written to does
    // not exist yet and cannot be indexed.
    await model.createCollection().catch((error: unknown) => {
      const isAlreadyExists =
        error instanceof Error && /already exists|NamespaceExists/i.test(error.message)
      if (!isAlreadyExists) throw error
    })

    const dropped = await model.syncIndexes()
    const current = await model.collection.indexes()

    // Every collection has the implicit _id index; only our own are worth listing.
    const declared = current
      .map((index) => index.name)
      .filter((indexName): indexName is string => Boolean(indexName) && indexName !== '_id_')

    console.log(`  ${name}`)
    console.log(`    indexes : ${declared.length > 0 ? declared.join(', ') : '(none beyond _id)'}`)
    if (dropped.length > 0) {
      console.log(`    dropped : ${dropped.join(', ')}`)
    }
  }
})
