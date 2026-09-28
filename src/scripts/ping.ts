import { mongoose } from '../config/database'
import { models } from '../models'
import { runScript } from './runScript'

/**
 * Connectivity check: proves the Atlas URI, the credentials and the IP
 * allowlist are all correct, and reports what is currently in the database.
 *
 * Run this first when anything database-related misbehaves — it separates
 * "cannot reach Atlas" from "the application logic is wrong", which are very
 * different problems with very similar symptoms.
 */
void runScript('db:ping', async () => {
  const connection = mongoose.connection
  const admin = connection.db?.admin()

  if (admin) {
    const info = (await admin.serverInfo()) as { version?: string }
    console.log(`  server version : ${info.version ?? 'unknown'}`)
  }

  console.log(`  database       : ${connection.name}`)
  console.log(`  host           : ${connection.host}`)
  console.log('')
  console.log('  Document counts:')

  for (const [name, model] of Object.entries(models)) {
    const count = await model.estimatedDocumentCount()
    console.log(`    ${name.padEnd(16)} ${String(count).padStart(5)}`)
  }
})
