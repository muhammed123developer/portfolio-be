import { Education as EducationModel } from '../../models'
import type { CreateEducationInput, Education, UpdateEducationInput } from '../../types/domain'
import type { EducationRepository } from '../types'
import { definedFields, isLookupableId, toEntity } from './helpers'

const DATE_ONLY = ['startDate', 'endDate'] as const

/**
 * MongoDB education repository.
 *
 * Mirrors the experience repository deliberately — same ordering, same
 * "null endDate means ongoing" convention.
 */
export class MongoEducationRepository implements EducationRepository {
  async findAll(): Promise<Education[]> {
    const docs = await EducationModel.find().sort({ displayOrder: 1, startDate: -1, _id: 1 }).lean()
    return docs.map((doc) => toEntity<Education>(doc, DATE_ONLY))
  }

  async findById(id: string): Promise<Education | null> {
    if (!isLookupableId(id)) return null
    const doc = await EducationModel.findById(id).lean()
    return doc ? toEntity<Education>(doc, DATE_ONLY) : null
  }

  async create(input: CreateEducationInput): Promise<Education> {
    const displayOrder = input.displayOrder ?? (await EducationModel.estimatedDocumentCount())
    const doc = await EducationModel.create({ ...definedFields(input), displayOrder })
    return toEntity<Education>(doc.toObject({ transform: false, virtuals: false }), DATE_ONLY)
  }

  async update(id: string, input: UpdateEducationInput): Promise<Education | null> {
    if (!isLookupableId(id)) return null
    const doc = await EducationModel.findById(id)
    if (!doc) return null

    doc.set(definedFields(input))
    await doc.save()
    return toEntity<Education>(doc.toObject({ transform: false, virtuals: false }), DATE_ONLY)
  }

  async delete(id: string): Promise<boolean> {
    if (!isLookupableId(id)) return false
    const result = await EducationModel.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  async count(): Promise<number> {
    return EducationModel.countDocuments()
  }
}
