import { Technology as TechnologyModel } from '../../models'
import type { CreateTechnologyInput, Technology, UpdateTechnologyInput } from '../../types/domain'
import { conflict } from '../../utils/AppError'
import type { TechnologyRepository } from '../types'
import { definedFields, equalsIgnoreCase, isLookupableId, toEntity, withConflictMapping } from './helpers'

/** Sorts "react" and "React" together rather than by byte value. */
const COLLATION = { locale: 'en', strength: 2 } as const

/**
 * MongoDB technology repository.
 *
 * Name and slug are unique. The explicit check gives a precise, case-insensitive
 * message; the duplicate-key mapping covers the race the check cannot.
 */
export class MongoTechnologyRepository implements TechnologyRepository {
  async findAll(): Promise<Technology[]> {
    const docs = await TechnologyModel.find().sort({ category: 1, name: 1 }).collation(COLLATION).lean()
    return docs.map((doc) => toEntity<Technology>(doc))
  }

  async findById(id: string): Promise<Technology | null> {
    if (!isLookupableId(id)) return null
    const doc = await TechnologyModel.findById(id).lean()
    return doc ? toEntity<Technology>(doc) : null
  }

  async findBySlug(slug: string): Promise<Technology | null> {
    const doc = await TechnologyModel.findOne({ slug }).lean()
    return doc ? toEntity<Technology>(doc) : null
  }

  async findManyByIds(ids: string[]): Promise<Technology[]> {
    const valid = ids.filter(isLookupableId)
    if (valid.length === 0) return []
    const docs = await TechnologyModel.find({ _id: { $in: valid } }).lean()
    return docs.map((doc) => toEntity<Technology>(doc))
  }

  async create(input: CreateTechnologyInput & { slug: string }): Promise<Technology> {
    await this.assertUnique(input.name, input.slug)

    const doc = await withConflictMapping(`A technology named "${input.name}" already exists`, () =>
      TechnologyModel.create({
        name: input.name,
        slug: input.slug,
        category: input.category ?? 'other',
        icon: input.icon ?? null,
      })
    )
    return toEntity<Technology>(doc.toObject({ transform: false, virtuals: false }))
  }

  async update(
    id: string,
    input: UpdateTechnologyInput & { slug?: string }
  ): Promise<Technology | null> {
    if (!isLookupableId(id)) return null
    const doc = await TechnologyModel.findById(id)
    if (!doc) return null

    await this.assertUnique(input.name, input.slug, id)

    doc.set(definedFields(input))
    await withConflictMapping('A technology with that name already exists', () => doc.save())
    return toEntity<Technology>(doc.toObject({ transform: false, virtuals: false }))
  }

  /**
   * The project detach is done by the service first (see TechnologyService);
   * the model's delete hook repeats it, which is harmless.
   */
  async delete(id: string): Promise<boolean> {
    if (!isLookupableId(id)) return false
    const result = await TechnologyModel.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  private async assertUnique(name?: string, slug?: string, exceptId?: string): Promise<void> {
    const notSelf = exceptId ? { _id: { $ne: exceptId } } : {}

    if (name !== undefined) {
      const taken = await TechnologyModel.exists({ ...notSelf, name: equalsIgnoreCase(name) })
      if (taken) throw conflict(`A technology named "${name}" already exists`)
    }

    if (slug !== undefined) {
      const taken = await TechnologyModel.exists({ ...notSelf, slug })
      if (taken) throw conflict(`A technology with the slug "${slug}" already exists`)
    }
  }
}
