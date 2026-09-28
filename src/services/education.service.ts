import type { CreateEducationInput, Education, UpdateEducationInput } from '../types/domain'
import type { EducationRepository } from '../repositories/types'
import { notFound, validationFailed } from '../utils/AppError'
import { isChronological, toDateOnly } from '../utils/dates'

/**
 * Education business logic.
 *
 * Mirrors ExperienceService deliberately — same date handling, same "null
 * endDate means ongoing" convention — so both timelines behave identically for
 * the shared frontend component that renders them.
 */
export class EducationService {
  constructor(private readonly education: EducationRepository) {}

  async list(): Promise<Education[]> {
    return this.education.findAll()
  }

  async getById(id: string): Promise<Education> {
    const entry = await this.education.findById(id)
    if (!entry) throw notFound('Education entry not found')
    return entry
  }

  async create(input: CreateEducationInput): Promise<Education> {
    const startDate = this.normaliseRequired(input.startDate)
    const endDate = this.normaliseOptional(input.endDate)

    this.assertChronological(startDate, endDate)

    return this.education.create({ ...input, startDate, endDate })
  }

  async update(id: string, input: UpdateEducationInput): Promise<Education> {
    const existing = await this.education.findById(id)
    if (!existing) throw notFound('Education entry not found')

    const payload: UpdateEducationInput = { ...input }

    if (input.startDate !== undefined) payload.startDate = this.normaliseRequired(input.startDate)
    if (input.endDate !== undefined) payload.endDate = this.normaliseOptional(input.endDate)

    // Validate the merged result — see the equivalent note in ExperienceService.
    this.assertChronological(
      payload.startDate ?? existing.startDate,
      payload.endDate !== undefined ? payload.endDate : existing.endDate
    )

    const updated = await this.education.update(id, payload)
    if (!updated) throw notFound('Education entry not found')
    return updated
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.education.delete(id)
    if (!deleted) throw notFound('Education entry not found')
  }

  private normaliseRequired(value: string): string {
    const parsed = toDateOnly(value)
    if (!parsed) {
      throw validationFailed({ startDate: 'Must be a valid date in YYYY-MM-DD format' })
    }
    return parsed
  }

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
