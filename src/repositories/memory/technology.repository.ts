import type { CreateTechnologyInput, Technology, UpdateTechnologyInput } from '../../types/domain'
import type { TechnologyRepository } from '../types'
import { conflict } from '../../utils/AppError'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { clone } from './helpers'

/**
 * In-memory technology repository.
 *
 * Name and slug are both unique. Detecting a duplicate and throwing
 * `conflict()` (409) is part of the repository contract — the MongoDB
 * implementation will translate driver error 11000 into exactly the same
 * error, so callers cannot tell the two backends apart.
 */
export class MemoryTechnologyRepository implements TechnologyRepository {
  async findAll(): Promise<Technology[]> {
    return clone(
      [...getStore().technologies].sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      )
    )
  }

  async findById(id: string): Promise<Technology | null> {
    const found = getStore().technologies.find((technology) => technology.id === id)
    return found ? clone(found) : null
  }

  async findBySlug(slug: string): Promise<Technology | null> {
    const found = getStore().technologies.find((technology) => technology.slug === slug)
    return found ? clone(found) : null
  }

  async findManyByIds(ids: string[]): Promise<Technology[]> {
    const wanted = new Set(ids)
    return clone(getStore().technologies.filter((technology) => wanted.has(technology.id)))
  }

  async create(input: CreateTechnologyInput & { slug: string }): Promise<Technology> {
    this.assertUnique(input.name, input.slug)

    const timestamp = nowIso()
    const technology: Technology = {
      id: generateId(),
      name: input.name,
      slug: input.slug,
      category: input.category ?? 'other',
      icon: input.icon ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    getStore().technologies.push(technology)
    persist()
    return clone(technology)
  }

  async update(
    id: string,
    input: UpdateTechnologyInput & { slug?: string }
  ): Promise<Technology | null> {
    const technology = getStore().technologies.find((each) => each.id === id)
    if (!technology) return null

    this.assertUnique(input.name, input.slug, id)

    if (input.name !== undefined) technology.name = input.name
    if (input.slug !== undefined) technology.slug = input.slug
    if (input.category !== undefined) technology.category = input.category
    if (input.icon !== undefined) technology.icon = input.icon

    technology.updatedAt = nowIso()
    persist()
    return clone(technology)
  }

  async delete(id: string): Promise<boolean> {
    const store = getStore()
    const index = store.technologies.findIndex((technology) => technology.id === id)
    if (index === -1) return false
    store.technologies.splice(index, 1)
    persist()
    return true
  }

  /** Throws 409 if the name or slug is already taken by a different record. */
  private assertUnique(name?: string, slug?: string, exceptId?: string): void {
    const technologies = getStore().technologies

    if (name !== undefined) {
      const target = name.trim().toLowerCase()
      const taken = technologies.some(
        (each) => each.id !== exceptId && each.name.toLowerCase() === target
      )
      if (taken) throw conflict(`A technology named "${name}" already exists`)
    }

    if (slug !== undefined) {
      const taken = technologies.some((each) => each.id !== exceptId && each.slug === slug)
      if (taken) throw conflict(`A technology with the slug "${slug}" already exists`)
    }
  }
}
