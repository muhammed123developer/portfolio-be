import type {
  CreateExperienceInput,
  Experience,
  UpdateExperienceInput,
} from '../../types/domain'
import type { ExperienceRepository } from '../types'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { byDisplayOrder, clone } from './helpers'

/**
 * In-memory experience repository.
 *
 * Always returned in timeline order: `displayOrder` first so the admin can
 * pin an entry, then newest start date, so a fresh record without an explicit
 * order still lands sensibly.
 */
export class MemoryExperienceRepository implements ExperienceRepository {
  async findAll(): Promise<Experience[]> {
    return clone(
      [...getStore().experience].sort((a, b) =>
        byDisplayOrder(a, b, (x, y) => y.startDate.localeCompare(x.startDate))
      )
    )
  }

  async findById(id: string): Promise<Experience | null> {
    const found = getStore().experience.find((entry) => entry.id === id)
    return found ? clone(found) : null
  }

  async create(input: CreateExperienceInput): Promise<Experience> {
    const timestamp = nowIso()
    const entry: Experience = {
      id: generateId(),
      company: input.company,
      position: input.position,
      location: input.location ?? null,
      startDate: input.startDate,
      // null means "present" — this is the current role.
      endDate: input.endDate ?? null,
      description: input.description ?? null,
      technologies: input.technologies ?? [],
      companyUrl: input.companyUrl ?? null,
      displayOrder: input.displayOrder ?? getStore().experience.length,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    getStore().experience.push(entry)
    persist()
    return clone(entry)
  }

  async update(id: string, input: UpdateExperienceInput): Promise<Experience | null> {
    const entry = getStore().experience.find((each) => each.id === id)
    if (!entry) return null

    for (const [key, value] of Object.entries(input)) {
      // `endDate` may legitimately be set to null, so only `undefined` is skipped.
      if (value !== undefined) Object.assign(entry, { [key]: value })
    }

    entry.updatedAt = nowIso()
    persist()
    return clone(entry)
  }

  async delete(id: string): Promise<boolean> {
    const store = getStore()
    const index = store.experience.findIndex((entry) => entry.id === id)
    if (index === -1) return false
    store.experience.splice(index, 1)
    persist()
    return true
  }

  async count(): Promise<number> {
    return getStore().experience.length
  }
}
