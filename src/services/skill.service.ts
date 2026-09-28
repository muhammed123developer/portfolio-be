import type { CreateSkillInput, Skill, UpdateSkillInput } from '../types/domain'
import type { SkillFilter, SkillRepository } from '../repositories/types'
import { conflict, notFound } from '../utils/AppError'

/**
 * Skill business logic.
 *
 * Owns the compound {name, category} uniqueness rule. It is a *pair*, not a
 * name: "Docker" may legitimately appear under both DevOps and Tools, so
 * rejecting on name alone would be wrong.
 */
export class SkillService {
  constructor(private readonly skills: SkillRepository) {}

  async list(filter?: SkillFilter): Promise<Skill[]> {
    return this.skills.findAll(filter)
  }

  async getById(id: string): Promise<Skill> {
    const skill = await this.skills.findById(id)
    if (!skill) throw notFound('Skill not found')
    return skill
  }

  async create(input: CreateSkillInput): Promise<Skill> {
    if (await this.skills.existsByNameAndCategory(input.name, input.category)) {
      throw conflict(`"${input.name}" already exists in the ${input.category} category`)
    }
    return this.skills.create(input)
  }

  async update(id: string, input: UpdateSkillInput): Promise<Skill> {
    const existing = await this.skills.findById(id)
    if (!existing) throw notFound('Skill not found')

    // Check against the merged values: moving a skill to another category can
    // collide with an existing entry there even when the name is unchanged.
    const name = input.name ?? existing.name
    const category = input.category ?? existing.category

    if (await this.skills.existsByNameAndCategory(name, category, id)) {
      throw conflict(`"${name}" already exists in the ${category} category`)
    }

    const updated = await this.skills.update(id, input)
    if (!updated) throw notFound('Skill not found')
    return updated
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.skills.delete(id)
    if (!deleted) throw notFound('Skill not found')
  }
}
