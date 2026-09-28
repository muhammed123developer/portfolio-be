import type { CreateTechnologyInput, Technology, UpdateTechnologyInput } from '../types/domain'
import type { ProjectRepository, TechnologyRepository } from '../repositories/types'
import { notFound } from '../utils/AppError'
import { slugify } from '../utils/slug'

/**
 * Technology business logic.
 *
 * Owns the referential cleanup that a relational database would have given us
 * for free through ON DELETE CASCADE — see `remove()`.
 */
export class TechnologyService {
  constructor(
    private readonly technologies: TechnologyRepository,
    private readonly projects: ProjectRepository
  ) {}

  async list(): Promise<Technology[]> {
    return this.technologies.findAll()
  }

  async getById(id: string): Promise<Technology> {
    const technology = await this.technologies.findById(id)
    if (!technology) throw notFound('Technology not found')
    return technology
  }

  async create(input: CreateTechnologyInput): Promise<Technology> {
    // The repository throws 409 if the name or slug is taken.
    return this.technologies.create({ ...input, slug: slugify(input.name) })
  }

  async update(id: string, input: UpdateTechnologyInput): Promise<Technology> {
    // Keep the slug in step with the name — unlike a project, a technology's
    // slug is a filter parameter rather than a shared permalink, so it is safe
    // to regenerate.
    const payload = input.name !== undefined ? { ...input, slug: slugify(input.name) } : input

    const updated = await this.technologies.update(id, payload)
    if (!updated) throw notFound('Technology not found')
    return updated
  }

  /**
   * Deletes a technology, first detaching it from every project.
   *
   * This is the replacement for SQL's ON DELETE CASCADE. MongoDB has no
   * foreign keys, so nothing else would clean up the references.
   *
   * The detach runs BEFORE the delete on purpose: if the delete then fails,
   * the technology is merely unlinked and the admin can retry. The reverse
   * order would leave projects holding references to a technology that no
   * longer exists.
   */
  async remove(id: string): Promise<{ detachedFrom: number }> {
    const existing = await this.technologies.findById(id)
    if (!existing) throw notFound('Technology not found')

    const detachedFrom = await this.projects.detachTechnology(id)

    const deleted = await this.technologies.delete(id)
    if (!deleted) throw notFound('Technology not found')

    return { detachedFrom }
  }
}
