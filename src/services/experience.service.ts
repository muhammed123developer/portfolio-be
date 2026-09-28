import type {
  CreateExperienceInput,
  Experience,
  UpdateExperienceInput,
} from '../types/domain'
import type { ExperienceRepository } from '../repositories/types'
import { notFound, validationFailed } from '../utils/AppError'
import { isChronological, toDateOnly } from '../utils/dates'

/**
 * Experience business logic.
 *
 * Owns the date-ordering rule. That used to be a database CHECK constraint and
 * then a Mongoose schema validator; neither runs against the in-memory store,
 * so it lives here where every storage backend inherits it.
 */
export class ExperienceService {
  constructor(private readonly experience: ExperienceRepository) {}

  async list(): Promise<Experience[]> {
    return this.experience.findAll()
  }

  async getById(id: string): Promise<Experience> {
    const entry = await this.experience.findById(id)
    if (!entry) throw notFound('Experience entry not found')
    return entry
  }

  async create(input: CreateExperienceInput): Promise<Experience> {
    const startDate = this.normaliseRequired(input.startDate, 'startDate')
    const endDate = this.normaliseOptional(input.endDate)

    this.assertChronological(startDate, endDate)

    return this.experience.create({ ...input, startDate, endDate })
  }

  async update(id: string, input: UpdateExperienceInput): Promise<Experience> {
    const existing = await this.experience.findById(id)
    if (!existing) throw notFound('Experience entry not found')

    const payload: UpdateExperienceInput = { ...input }

    if (input.startDate !== undefined) {
      payload.startDate = this.normaliseRequired(input.startDate, 'startDate')
    }
    if (input.endDate !== undefined) {
      payload.endDate = this.normaliseOptional(input.endDate)
    }

    // Validate the *merged* result, not just the supplied fields. Changing
    // only the start date can break the ordering against an end date that was
    // never part of this request.
    this.assertChronological(
      payload.startDate ?? existing.startDate,
      payload.endDate !== undefined ? payload.endDate : existing.endDate
    )

    const updated = await this.experience.update(id, payload)
    if (!updated) throw notFound('Experience entry not found')
    return updated
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.experience.delete(id)
    if (!deleted) throw notFound('Experience entry not found')
  }

  private normaliseRequired(value: string, field: string): string {
    const parsed = toDateOnly(value)
    if (!parsed) {
      throw validationFailed({ [field]: 'Must be a valid date in YYYY-MM-DD format' })
    }
    return parsed
  }

  /** null is meaningful here — it marks the current role. */
  private normaliseOptional(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') return null
    const parsed = toDateOnly(value)
    if (!parsed) {
      throw validationFailed({ endDate: 'Must be a valid date in YYYY-MM-DD format' })
    }
    return parsed
  }

  private assertChronological(startDate: string, endDate: string | null): void {
    if (!isChronological(startDate, endDate)) {
      throw validationFailed({ endDate: 'End date must be on or after the start date' })
    }
  }
}
