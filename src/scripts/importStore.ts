import fs from 'node:fs'
import path from 'node:path'

import type { Model } from 'mongoose'

import { env } from '../config/env'
import {
  ContactMessage,
  Education,
  Experience,
  Profile,
  Project,
  Skill,
  Technology,
} from '../models'
import type { PersistedStore } from '../repositories/memory/store.types'
import { hasFlag, runScript } from './runScript'

/**
 * Copies the in-memory backend's JSON snapshot (data/store.json) into MongoDB.
 *
 * The one-off bridge between DATA_SOURCE=memory and DATA_SOURCE=mongo. Ids and
 * timestamps are kept exactly, so URLs, project→technology references and the
 * "newest first" ordering all survive the move.
 *
 * Refuses to touch collections that already hold documents, so it cannot
 * silently duplicate or overwrite production data. Pass `--replace` to empty
 * those collections first.
 *
 * Admins and sessions are not in the snapshot and are not imported: the
 * server creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD at boot.
 */

interface Snapshot {
  version: number
  data: PersistedStore
}

void runScript('db:import', async () => {
  const file = path.join(env.dataDir, 'store.json')
  if (!fs.existsSync(file)) throw new Error(`No snapshot found at ${file}`)

  const { data } = JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot

  // Dependency order: technologies before the projects that reference them.
  const plan: { name: string; model: Model<any>; rows: ({ id: string } & object)[] }[] = [
    { name: 'Profile', model: Profile, rows: data.profile ? [data.profile] : [] },
    { name: 'Technology', model: Technology, rows: data.technologies },
    {
      name: 'Project',
      model: Project,
      rows: data.projects.map(({ technologyIds, ...rest }) => ({
        ...rest,
        technologies: technologyIds,
      })),
    },
    { name: 'Experience', model: Experience, rows: data.experience },
    { name: 'Education', model: Education, rows: data.education },
    { name: 'Skill', model: Skill, rows: data.skills },
    { name: 'ContactMessage', model: ContactMessage, rows: data.contactMessages },
  ]

  const occupied: string[] = []
  for (const step of plan) {
    const count = await step.model.countDocuments()
    if (count > 0) occupied.push(`${step.name} (${count})`)
  }

  if (occupied.length > 0 && !hasFlag('--replace')) {
    throw new Error(
      `These collections already contain documents: ${occupied.join(', ')}.\n` +
        'Nothing was imported. Re-run with --replace to empty them first.'
    )
  }

  for (const step of plan) {
    if (hasFlag('--replace')) await step.model.deleteMany({})

    for (const { id, ...fields } of step.rows) {
      const doc = new step.model({ _id: id, ...fields })
      // Keep the snapshot's createdAt/updatedAt instead of stamping "now".
      await doc.save({ timestamps: false })
    }

    console.log(`  ${step.name.padEnd(16)} ${String(step.rows.length).padStart(5)} imported`)
  }

  console.log('')
  console.log('  Next: npm run db:indexes, then set DATA_SOURCE=mongo')
})
