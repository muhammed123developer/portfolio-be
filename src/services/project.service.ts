import type { CreateProjectInput, Project, UpdateProjectInput } from '../types/domain'
import type {
  Paginated,
  ProjectFilter,
  ProjectRepository,
  TechnologyRepository,
} from '../repositories/types'
import { badRequest, notFound } from '../utils/AppError'
import { generateUniqueSlug, slugify } from '../utils/slug'

/**
 * Project business logic.
 *
 * Owns the rules that used to live in schema validators — slug generation and
 * uniqueness, and verifying that referenced technologies actually exist. They
 * sit here rather than in a repository so they hold identically whichever
 * storage backend is wired up.
 */
export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly technologies: TechnologyRepository
  ) {}

  async list(filter: ProjectFilter): Promise<Paginated<Project>> {
    return this.projects.findMany(filter)
  }

  async getBySlug(slug: string): Promise<Project> {
    const project = await this.projects.findBySlug(slug)
    if (!project) throw notFound('Project not found')
    return project
  }

  async getById(id: string): Promise<Project> {
    const project = await this.projects.findById(id)
    if (!project) throw notFound('Project not found')
    return project
  }

  async create(input: CreateProjectInput): Promise<Project> {
    await this.assertTechnologiesExist(input.technologyIds)

    // An explicit slug is honoured but still de-duplicated, so a caller cannot
    // create two projects that resolve to the same public URL.
    const slug = await generateUniqueSlug(input.slug || input.title, (candidate) =>
      this.projects.slugExists(candidate)
    )

    return this.projects.create({ ...input, slug })
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.projects.findById(id)
    if (!existing) throw notFound('Project not found')

    await this.assertTechnologiesExist(input.technologyIds)

    const payload: UpdateProjectInput = { ...input }

    // Only recompute the slug when the caller explicitly supplied one. A
    // renamed project keeps its original URL, because silently changing it
    // would break every link already shared to that project.
    if (input.slug !== undefined) {
      const desired = slugify(input.slug)
      if (desired !== existing.slug) {
        payload.slug = await generateUniqueSlug(desired, (candidate) =>
          this.projects.slugExists(candidate, id)
        )
      } else {
        delete payload.slug
      }
    }

    const updated = await this.projects.update(id, payload)
    if (!updated) throw notFound('Project not found')
    return updated
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.projects.delete(id)
    if (!deleted) throw notFound('Project not found')
  }

  /**
   * Rejects references to technologies that do not exist.
   *
   * Without this the project would save with ids that resolve to nothing, and
   * the failure would surface later as silently missing badges on the detail
   * page — a confusing bug to trace back to its cause.
   */
  private async assertTechnologiesExist(ids: string[] | undefined): Promise<void> {
    if (!ids || ids.length === 0) return

    const unique = [...new Set(ids)]
    const found = await this.technologies.findManyByIds(unique)

    if (found.length !== unique.length) {
      const foundIds = new Set(found.map((technology) => technology.id))
      const missing = unique.filter((id) => !foundIds.has(id))
      throw badRequest(`Unknown technology ${missing.length > 1 ? 'ids' : 'id'}: ${missing.join(', ')}`)
    }
  }
}
