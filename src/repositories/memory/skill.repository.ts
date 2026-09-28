import type { CreateSkillInput, Skill, UpdateSkillInput } from '../../types/domain'
import type { SkillFilter, SkillRepository } from '../types'
import type { SkillCategory } from '../../types/enums'
import { SKILL_CATEGORIES } from '../../types/enums'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { byDisplayOrder, clone } from './helpers'

/**
 * In-memory skill repository.
 *
 * Uniqueness is on the {name, category} pair, not the name alone: "Docker"
 * may legitimately appear under both DevOps and Tools.
 */
export class MemorySkillRepository implements SkillRepository {
  async findAll(filter?: SkillFilter): Promise<Skill[]> {
    let skills = getStore().skills

    if (filter?.category) {
      skills = skills.filter((skill) => skill.category === filter.category)
    }

    // Grouped by category in the declared order (frontend, backend, …) rather
    // than alphabetically, then by displayOrder within each group — so the
    // public page can render groups straight from this list.
    const categoryRank = new Map<SkillCategory, number>(
      SKILL_CATEGORIES.map((category, index) => [category, index])
    )

    return clone(
      [...skills].sort(
        (a, b) =>
          (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99) ||
          byDisplayOrder(a, b, (x, y) => x.name.localeCompare(y.name))
      )
    )
  }

  async findById(id: string): Promise<Skill | null> {
    const found = getStore().skills.find((skill) => skill.id === id)
    return found ? clone(found) : null
  }

  async existsByNameAndCategory(
    name: string,
    category: SkillCategory,
    exceptId?: string
  ): Promise<boolean> {
    const target = name.trim().toLowerCase()
    return getStore().skills.some(
      (skill) =>
        skill.id !== exceptId &&
        skill.category === category &&
        skill.name.toLowerCase() === target
    )
  }

  async create(input: CreateSkillInput): Promise<Skill> {
    const timestamp = nowIso()
    const store = getStore()
    const skill: Skill = {
      id: generateId(),
      name: input.name,
      category: input.category,
      icon: input.icon ?? null,
      proficiency: input.proficiency ?? 70,
      displayOrder:
        input.displayOrder ??
        store.skills.filter((each) => each.category === input.category).length,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    store.skills.push(skill)
    persist()
    return clone(skill)
  }

  async update(id: string, input: UpdateSkillInput): Promise<Skill | null> {
    const skill = getStore().skills.find((each) => each.id === id)
    if (!skill) return null

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) Object.assign(skill, { [key]: value })
    }

    skill.updatedAt = nowIso()
    persist()
    return clone(skill)
  }

  async delete(id: string): Promise<boolean> {
    const store = getStore()
    const index = store.skills.findIndex((skill) => skill.id === id)
    if (index === -1) return false
    store.skills.splice(index, 1)
    persist()
    return true
  }

  async count(): Promise<number> {
    return getStore().skills.length
  }
}
