import type {
  CreateProjectInput,
  Project,
  ProjectRecord,
  Technology,
  UpdateProjectInput,
} from '../../types/domain'
import type { Paginated, ProjectFilter, ProjectRepository } from '../types'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { byNewest, clone, matches, normalisePaging, paginate } from './helpers'

/**
 * In-memory project repository.
 *
 * Projects are *stored* with technologies as ids (`ProjectRecord`) and
 * *returned* with them resolved to full objects (`Project`) — the same
 * distinction MongoDB draws between a raw document and a populated one, so
 * services see an identical shape from either backend.
 */
export class MemoryProjectRepository implements ProjectRepository {
  async findMany(filter: ProjectFilter): Promise<Paginated<Project>> {
    const store = getStore()
    let records = store.projects

    if (filter.featured !== undefined) {
      records = records.filter((project) => project.featured === filter.featured)
    }

    if (filter.status) {
      records = records.filter((project) => project.status === filter.status)
    }

    if (filter.technologySlug) {
      const technology = store.technologies.find((item) => item.slug === filter.technologySlug)
      // An unknown technology slug matches nothing, rather than everything.
      const technologyId = technology?.id ?? '__no_such_technology__'
      records = records.filter((project) => project.technologyIds.includes(technologyId))
    }

    if (filter.search) {
      const term = filter.search.trim()
      records = records.filter(
        (project) =>
          matches(project.title, term) ||
          matches(project.shortDescription, term) ||
          matches(project.description, term)
      )
    }

    const sorted = [...records].sort((a, b) => {
      switch (filter.sort) {
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt)
        case 'order':
          return a.displayOrder - b.displayOrder || byNewest(a, b)
        default:
          // Featured projects lead, then newest first — what the public grid wants.
          return Number(b.featured) - Number(a.featured) || byNewest(a, b)
      }
    })

    const { page, limit } = normalisePaging(filter.page, filter.limit)
    const pageOfRecords = paginate(sorted, page, limit)

    return {
      ...pageOfRecords,
      items: pageOfRecords.items.map((record) => this.populate(record)),
    }
  }

  async findById(id: string): Promise<Project | null> {
    const found = getStore().projects.find((project) => project.id === id)
    return found ? this.populate(clone(found)) : null
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const found = getStore().projects.find((project) => project.slug === slug)
    return found ? this.populate(clone(found)) : null
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    return getStore().projects.some(
      (project) => project.slug === slug && project.id !== exceptId
    )
  }

  async create(input: CreateProjectInput & { slug: string }): Promise<Project> {
    const timestamp = nowIso()
    const record: ProjectRecord = {
      id: generateId(),
      title: input.title,
      slug: input.slug,
      shortDescription: input.shortDescription,
      description: input.description,
      problem: input.problem ?? null,
      solution: input.solution ?? null,
      features: input.features ?? [],
      architecture: input.architecture ?? null,
      challenges: input.challenges ?? null,
      lessonsLearned: input.lessonsLearned ?? null,
      image: input.image ?? null,
      screenshots: input.screenshots ?? [],
      githubUrl: input.githubUrl ?? null,
      liveUrl: input.liveUrl ?? null,
      featured: input.featured ?? false,
      status: input.status ?? 'completed',
      displayOrder: input.displayOrder ?? getStore().projects.length,
      technologyIds: input.technologyIds ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    getStore().projects.push(record)
    persist()
    return this.populate(clone(record))
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const record = getStore().projects.find((project) => project.id === id)
    if (!record) return null

    // Assign only the keys actually supplied, so a partial update cannot blank
    // a field the caller never mentioned.
    const { technologyIds, ...rest } = input
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        Object.assign(record, { [key]: value })
      }
    }
    if (technologyIds !== undefined) {
      record.technologyIds = technologyIds
    }

    record.updatedAt = nowIso()
    persist()
    return this.populate(clone(record))
  }

  async delete(id: string): Promise<boolean> {
    const store = getStore()
    const index = store.projects.findIndex((project) => project.id === id)
    if (index === -1) return false
    store.projects.splice(index, 1)
    persist()
    return true
  }

  /**
   * Removes a technology reference from every project.
   *
   * The replacement for SQL's ON DELETE CASCADE: MongoDB has no foreign keys,
   * so the technology service calls this before deleting a technology.
   */
  async detachTechnology(technologyId: string): Promise<number> {
    let affected = 0
    const timestamp = nowIso()

    for (const project of getStore().projects) {
      if (!project.technologyIds.includes(technologyId)) continue
      project.technologyIds = project.technologyIds.filter((each) => each !== technologyId)
      project.updatedAt = timestamp
      affected += 1
    }

    if (affected > 0) persist()
    return affected
  }

  async countAll(): Promise<{ total: number; featured: number }> {
    const projects = getStore().projects
    return {
      total: projects.length,
      featured: projects.filter((project) => project.featured).length,
    }
  }

  /**
   * Resolves technology ids into full objects.
   *
   * Unknown ids are dropped rather than producing a null entry, which is
   * exactly how Mongoose's `populate()` behaves for a missing reference. That
   * means a dangling id degrades to a missing badge, never a broken page.
   */
  private populate(record: ProjectRecord): Project {
    const byId = new Map<string, Technology>(
      getStore().technologies.map((technology) => [technology.id, technology])
    )

    const { technologyIds, ...fields } = record
    return {
      ...fields,
      technologies: technologyIds
        .map((id) => byId.get(id))
        .filter((technology): technology is Technology => technology !== undefined)
        .map(clone),
    }
  }
}
