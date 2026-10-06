import type { QueryFilter } from 'mongoose'

import { Skill as SkillModel } from '../../models'
import type { SkillAttributes } from '../../models'
import type { CreateSkillInput, Skill, UpdateSkillInput } from '../../types/domain'
import { SKILL_CATEGORIES, type SkillCategory } from '../../types/enums'
import type { SkillFilter, SkillRepository } from '../types'
import {
  definedFields,
  equalsIgnoreCase,
  isLookupableId,
  toEntity,
  withConflictMapping,
} from './helpers'

const DUPLICATE = 'A skill with that name already exists in this category'

const CATEGORY_RANK = new Map<SkillCategory, number>(
  SKILL_CATEGORIES.map((category, index) => [category, index])
)

/**
 * MongoDB skill repository.
 *
 * Uniqueness is on the {name, category} pair, backed by a unique compound
 * index. Results are grouped in the declared category order (frontend,
 * backend, …), which is not alphabetical, so that final ordering is done here
 * rather than by the database — the list is small.
 */
export class MongoSkillRepository implements SkillRepository {
  async findAll(filter?: SkillFilter): Promise<Skill[]> {
    const query: QueryFilter<SkillAttributes> = {}
    if (filter?.category) query.category = filter.category

    const docs = await SkillModel.find(query).lean()
    return docs
      .map((doc) => toEntity<Skill>(doc))
      .sort(
        (a, b) =>
          (CATEGORY_RANK.get(a.category) ?? 99) - (CATEGORY_RANK.get(b.category) ?? 99) ||
          a.displayOrder - b.displayOrder ||
          a.name.localeCompare(b.name)
      )
  }

  async findById(id: string): Promise<Skill | null> {
    if (!isLookupableId(id)) return null
    const doc = await SkillModel.findById(id).lean()
    return doc ? toEntity<Skill>(doc) : null
  }

  async existsByNameAndCategory(
    name: string,
    category: SkillCategory,
    exceptId?: string
  ): Promise<boolean> {
    const query: QueryFilter<SkillAttributes> = { category, name: equalsIgnoreCase(name) }
    if (exceptId && isLookupableId(exceptId)) query._id = { $ne: exceptId }
    return (await SkillModel.exists(query)) !== null
  }

  async create(input: CreateSkillInput): Promise<Skill> {
    const displayOrder =
      input.displayOrder ?? (await SkillModel.countDocuments({ category: input.category }))

    const doc = await withConflictMapping(DUPLICATE, () =>
      SkillModel.create({ ...definedFields(input), displayOrder })
    )
    return toEntity<Skill>(doc.toObject({ transform: false, virtuals: false }))
  }

  async update(id: string, input: UpdateSkillInput): Promise<Skill | null> {
    if (!isLookupableId(id)) return null
    const doc = await SkillModel.findById(id)
    if (!doc) return null

    doc.set(definedFields(input))
    await withConflictMapping(DUPLICATE, () => doc.save())
    return toEntity<Skill>(doc.toObject({ transform: false, virtuals: false }))
  }

  async delete(id: string): Promise<boolean> {
    if (!isLookupableId(id)) return false
    const result = await SkillModel.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  async count(): Promise<number> {
    return SkillModel.countDocuments()
  }
}
