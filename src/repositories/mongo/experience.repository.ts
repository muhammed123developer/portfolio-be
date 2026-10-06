import { Experience as ExperienceModel } from '../../models'
import type { CreateExperienceInput, Experience, UpdateExperienceInput } from '../../types/domain'
import type { ExperienceRepository } from '../types'
import { definedFields, isLookupableId, toEntity } from './helpers'

const DATE_ONLY = ['startDate', 'endDate'] as const

/**
 * MongoDB experience repository.
 *
 * Timeline order: `displayOrder` first, then newest start date — the same rule
 * as the in-memory backend. Writes go through `save()` so the schema's date
 * setters and its start/end cross-field validator always run.
 */
export class MongoExperienceRepository implements ExperienceRepository {
  async findAll(): Promise<Experience[]> {
    const docs = await ExperienceModel.find().sort({ displayOrder: 1, startDate: -1, _id: 1 }).lean()
    return docs.map((doc) => toEntity<Experience>(doc, DATE_ONLY))
  }

  async findById(id: string): Promise<Experience | null> {
    if (!isLookupableId(id)) return null
    const doc = await ExperienceModel.findById(id).lean()
    return doc ? toEntity<Experience>(doc, DATE_ONLY) : null
  }

  async create(input: CreateExperienceInput): Promise<Experience> {
    const displayOrder = input.displayOrder ?? (await ExperienceModel.estimatedDocumentCount())
    const doc = await ExperienceModel.create({ ...definedFields(input), displayOrder })
    return toEntity<Experience>(doc.toObject({ transform: false, virtuals: false }), DATE_ONLY)
  }

  async update(id: string, input: UpdateExperienceInput): Promise<Experience | null> {
    if (!isLookupableId(id)) return null
    const doc = await ExperienceModel.findById(id)
    if (!doc) return null

    // `endDate: null` is meaningful ("current role"), so only undefined is skipped.
    doc.set(definedFields(input))
    await doc.save()
    return toEntity<Experience>(doc.toObject({ transform: false, virtuals: false }), DATE_ONLY)
  }

  async delete(id: string): Promise<boolean> {
    if (!isLookupableId(id)) return false
    const result = await ExperienceModel.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  async count(): Promise<number> {
    return ExperienceModel.countDocuments()
  }
}
