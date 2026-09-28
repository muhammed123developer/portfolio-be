import type { CreateEducationInput, Education, UpdateEducationInput } from '../../types/domain'
import type { EducationRepository } from '../types'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { byDisplayOrder, clone } from './helpers'

/**
 * In-memory education repository.
 *
 * Mirrors the experience repository deliberately — same ordering rules, same
 * "null endDate means ongoing" convention — so both timelines can share one
 * frontend component.
 */
export class MemoryEducationRepository implements EducationRepository {
  async findAll(): Promise<Education[]> {
    return clone(
      [...getStore().education].sort((a, b) =>
        byDisplayOrder(a, b, (x, y) => y.startDate.localeCompare(x.startDate))
      )
    )
  }

  async findById(id: string): Promise<Education | null> {
    const found = getStore().education.find((entry) => entry.id === id)
    return found ? clone(found) : null
  }

  async create(input: CreateEducationInput): Promise<Education> {
    const timestamp = nowIso()
    const entry: Education = {
      id: generateId(),
      institution: input.institution,
      degree: input.degree,
      field: input.field ?? null,
      location: input.location ?? null,
      startDate: input.startDate,
      // null means still studying.
      endDate: input.endDate ?? null,
      grade: input.grade ?? null,
      description: input.description ?? null,
      displayOrder: input.displayOrder ?? getStore().education.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    getStore().education.push(entry)
    persist()
    return clone(entry)
  }

  async update(id: string, input: UpdateEducationInput): Promise<Education | null> {
    const entry = getStore().education.find((each) => each.id === id)
    if (!entry) return null

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) Object.assign(entry, { [key]: value })
    }

    entry.updatedAt = nowIso()
    persist()
    return clone(entry)
  }

  async delete(id: string): Promise<boolean> {
    const store = getStore()
    const index = store.education.findIndex((entry) => entry.id === id)
    if (index === -1) return false
    store.education.splice(index, 1)
    persist()
    return true
  }

  async count(): Promise<number> {
    return getStore().education.length
  }
}
