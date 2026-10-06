import type { QueryFilter } from 'mongoose'

import { ContactMessage as ContactMessageModel } from '../../models'
import type { ContactMessageAttributes } from '../../models'
import type {
  ContactMessage,
  CreateContactMessageInput,
  UpdateContactMessageInput,
} from '../../types/domain'
import type { ContactMessageFilter, ContactMessageRepository, Paginated } from '../types'
import { containsIgnoreCase, isLookupableId, normalisePaging, toEntity } from './helpers'

/**
 * MongoDB contact message repository.
 *
 * The inbox is always newest-first; the {status, createdAt} index covers the
 * common "unread, newest first" query without a separate sort stage.
 */
export class MongoContactMessageRepository implements ContactMessageRepository {
  async findMany(filter: ContactMessageFilter): Promise<Paginated<ContactMessage>> {
    const query: QueryFilter<ContactMessageAttributes> = {}
    if (filter.status) query.status = filter.status

    if (filter.search?.trim()) {
      const pattern = containsIgnoreCase(filter.search)
      query.$or = [{ name: pattern }, { email: pattern }, { subject: pattern }, { message: pattern }]
    }

    const { page, limit } = normalisePaging(filter.page, filter.limit)
    const [docs, total] = await Promise.all([
      ContactMessageModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ContactMessageModel.countDocuments(query),
    ])

    return { items: docs.map((doc) => toEntity<ContactMessage>(doc)), total, page, limit }
  }

  async findById(id: string): Promise<ContactMessage | null> {
    if (!isLookupableId(id)) return null
    const doc = await ContactMessageModel.findById(id).lean()
    return doc ? toEntity<ContactMessage>(doc) : null
  }

  async create(input: CreateContactMessageInput): Promise<ContactMessage> {
    const doc = await ContactMessageModel.create({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      ipAddress: input.ipAddress ?? null,
    })
    return toEntity<ContactMessage>(doc.toObject({ transform: false, virtuals: false }))
  }

  async update(id: string, input: UpdateContactMessageInput): Promise<ContactMessage | null> {
    if (!isLookupableId(id)) return null
    const doc = await ContactMessageModel.findById(id)
    if (!doc) return null

    if (input.status !== undefined) {
      doc.status = input.status
      // Stamp the first time it stops being unread; clear it if an admin
      // deliberately marks the message unread again.
      if (input.status === 'unread') {
        doc.readAt = null
      } else if (!doc.readAt) {
        doc.readAt = new Date()
      }
    }

    // Always bump updatedAt, even when the status did not actually change.
    doc.updatedAt = new Date()
    await doc.save()
    return toEntity<ContactMessage>(doc.toObject({ transform: false, virtuals: false }))
  }

  async delete(id: string): Promise<boolean> {
    if (!isLookupableId(id)) return false
    const result = await ContactMessageModel.deleteOne({ _id: id })
    return result.deletedCount > 0
  }

  async countByStatus(): Promise<{ total: number; unread: number }> {
    const [total, unread] = await Promise.all([
      ContactMessageModel.countDocuments(),
      ContactMessageModel.countDocuments({ status: 'unread' }),
    ])
    return { total, unread }
  }
}
