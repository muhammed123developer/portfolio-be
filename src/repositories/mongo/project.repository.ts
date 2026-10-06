import type { QueryFilter, SortOrder } from 'mongoose'

import { Project as ProjectModel, Technology as TechnologyModel } from '../../models'
import type { ProjectAttributes } from '../../models'
import type { CreateProjectInput, Project, Technology, UpdateProjectInput } from '../../types/domain'
import type { Paginated, ProjectFilter, ProjectRepository } from '../types'
import {
  containsIgnoreCase,
  definedFields,
  isLookupableId,
  normalisePaging,
  toEntity,
  withConflictMapping,
} from './helpers'

const SLUG_TAKEN = 'A project with that slug already exists'

/** `_id` last in every sort, so paging is stable when the other keys tie. */
const SORTS: Record<NonNullable<ProjectFilter['sort']> | 'default', Record<string, SortOrder>> = {
  default: { featured: -1, createdAt: -1, _id: -1 },
  newest: { featured: -1, createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  order: { displayOrder: 1, createdAt: -1, _id: -1 },
}

/**
 * MongoDB project repository.
 *
 * Projects are stored with technology references and returned populated, so
 * services get the same `Project` shape as from the in-memory backend.
 * `populate()` drops references to deleted technologies, just as the memory
 * implementation does.
 */
export class MongoProjectRepository implements ProjectRepository {
  async findMany(filter: ProjectFilter): Promise<Paginated<Project>> {
    const query: QueryFilter<ProjectAttributes> = {}

    if (filter.featured !== undefined) query.featured = filter.featured
    if (filter.status) query.status = filter.status

    if (filter.technologySlug) {
      const technology = await TechnologyModel.findOne({ slug: filter.technologySlug })
        .select('_id')
        .lean()
      // An unknown technology slug matches nothing, rather than everything.
      if (!technology) {
        const { page, limit } = normalisePaging(filter.page, filter.limit)
        return { items: [], total: 0, page, limit }
      }
      query.technologies = technology._id
    }

    if (filter.search?.trim()) {
      const pattern = containsIgnoreCase(filter.search)
      query.$or = [
        { title: pattern },
        { shortDescription: pattern },
        { description: pattern },
      ]
    }

    const { page, limit } = normalisePaging(filter.page, filter.limit)
    const sort = SORTS[filter.sort ?? 'default']

    const [docs, total] = await Promise.all([
      ProjectModel.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('technologies')
        .lean(),
      ProjectModel.countDocuments(query),
    ])

    return { items: docs.map((doc) => this.toProject(doc)), total, page, limit }
  }

  async findById(id: string): Promise<Project | null> {
    if (!isLookupableId(id)) return null
    const doc = await ProjectModel.findById(id).populate('technologies').lean()
    return doc ? this.toProject(doc) : null
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const doc = await ProjectModel.findOne({ slug }).populate('technologies').lean()
    return doc ? this.toProject(doc) : null
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const query: QueryFilter<ProjectAttributes> = { slug }
    if (exceptId && isLookupableId(exceptId)) query._id = { $ne: exceptId }
    return (await ProjectModel.exists(query)) !== null
  }

  async create(input: CreateProjectInput & { slug: string }): Promise<Project> {
    const { technologyIds, ...fields } = input
    const displayOrder = input.displayOrder ?? (await ProjectModel.estimatedDocumentCount())

    const doc = await withConflictMapping(SLUG_TAKEN, () =>
      ProjectModel.create({
        ...definedFields(fields),
        displayOrder,
        technologies: technologyIds ?? [],
      })
    )

    const created = await this.findById(String(doc._id))
    if (!created) throw new Error('Project vanished immediately after being created')
    return created
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    if (!isLookupableId(id)) return null
    const doc = await ProjectModel.findById(id)
    if (!doc) return null

    const { technologyIds, ...fields } = input
    doc.set(definedFields(fields))
    if (technologyIds !== undefined) doc.set('technologies', technologyIds)

    await withConflictMapping(SLUG_TAKEN, () => doc.save())
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    if (!isLookupableId(id)) return false
    const result = await ProjectModel.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  async detachTechnology(technologyId: string): Promise<number> {
    if (!isLookupableId(technologyId)) return 0
    const result = await ProjectModel.updateMany(
      { technologies: technologyId },
      { $pull: { technologies: technologyId } }
    )
    return result.modifiedCount
  }

  async countAll(): Promise<{ total: number; featured: number }> {
    const [total, featured] = await Promise.all([
      ProjectModel.countDocuments(),
      ProjectModel.countDocuments({ featured: true }),
    ])
    return { total, featured }
  }

  private toProject(doc: object): Project {
    const { technologies, ...fields } = doc as Record<string, unknown>
    const populated = Array.isArray(technologies) ? technologies : []

    return {
      ...toEntity<Omit<Project, 'technologies'>>(fields),
      technologies: populated
        // A reference that did not populate is still a bare ObjectId — skip it.
        .filter((each): each is Record<string, unknown> => each !== null && 'name' in each)
        .map((each) => toEntity<Technology>(each)),
    }
  }
}
