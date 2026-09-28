import { MongoMemoryServer } from 'mongodb-memory-server'
import { connectDatabase, disconnectDatabase, mongoose } from './src/config/database'
import { Project, Technology, Experience, models } from './src/models'

async function main() {
  const mem = await MongoMemoryServer.create()
  // Explicit dbName override — proves the new parameter works and that tests
  // can still target their own database.
  await connectDatabase(mem.getUri(), 'portfolio_probe')
  console.log('connected to db:', mongoose.connection.name, '(expected portfolio_probe)')

  for (const m of Object.values(models)) { await m.createCollection().catch(() => {}); await m.syncIndexes() }
  const idx = await Project.collection.indexes()
  console.log('project indexes:', idx.map(i => i.name).filter(n => n !== '_id_').join(', '))

  const t = await Technology.create({ name: 'React', slug: 'react', category: 'frontend' })
  const p = await Project.create({ title: 'S', slug: 's', shortDescription: 'x', description: 'y', technologies: [t._id] })
  await Technology.findOneAndDelete({ slug: 'react' })
  const after = await Project.findById(p._id)
  console.log('cascade still works:', after?.technologies.length === 0)
  const e = await Experience.create({ company: 'C', position: 'P', startDate: '2023-03-01' })
  console.log('dateOnly still works:', (e.toJSON() as any).startDate === '2023-03-01')

  await disconnectDatabase(); await mem.stop()
}
main().catch((e) => { console.error('FAILED:', e); process.exit(1) })
