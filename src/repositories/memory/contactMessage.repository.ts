import type {
  ContactMessage,
  CreateContactMessageInput,
  UpdateContactMessageInput,
} from '../../types/domain'
import type { ContactMessageFilter, ContactMessageRepository, Paginated } from '../types'
import { nowIso } from '../../utils/dates'
import { generateId } from './ids'
import { getStore, persist } from './store'
import { byNewest, clone, matches, normalisePaging, paginate } from './helpers'

/**
 * In-memory contact message repository.
 *
 * The inbox is always newest-first and is the only paginated public-facing
 * write target in the application, which is why the create path records an IP
 * address for abuse tracing.
 */
export class MemoryContactMessageRepository implements ContactMessageRepository {
  async findMany(filter: ContactMessageFilter): Promise<Paginated<ContactMessage>> {
    let messages = getStore().contactMessages

    if (filter.status) {
      messages = messages.filter((message) => message.status === filter.status)
    }

    if (filter.search) {
      const term = filter.search.trim()
      messages = messages.filter(
        (message) =>
          matches(message.name, term) ||
          matches(message.email, term) ||
          matches(message.subject, term) ||
          matches(message.message, term)
      )
    }

    const sorted = [...messages].sort(byNewest)
    const { page, limit } = normalisePaging(filter.page, filter.limit)
    return paginate(sorted, page, limit)
  }

  async findById(id: string): Promise<ContactMessage | null> {
    const found = getStore().contactMessages.find((message) => message.id === id)
    return found ? clone(found) : null
  }

  async create(input: CreateContactMessageInput): Promise<ContactMessage> {
    const timestamp = nowIso()
    const message: ContactMessage = {
      id: generateId(),
      name: input.name,
      email: input.email.toLowerCase(),
      subject: input.subject,
      message: input.message,
      status: 'unread',
      ipAddress: input.ipAddress ?? null,
      readAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    getStore().contactMessages.push(message)
    persist()
    return clone(message)
  }

  async update(id: string, input: UpdateContactMessageInput): Promise<ContactMessage | null> {
    const message = getStore().contactMessages.find((each) => each.id === id)
    if (!message) return null

    if (input.status !== undefined) {
      message.status = input.status
      // Stamp the first time it stops being unread, and clear it if an admin
      // deliberately marks a message unread again.
      if (input.status === 'unread') {
        message.readAt = null
      } else if (!message.readAt) {
        message.readAt = nowIso()
      }
    }

    message.updatedAt = nowIso()
    persist()
    return clone(message)
  }

  async delete(id: string): Promise<boolean> {
    const store = getStore()
    const index = store.contactMessages.findIndex((message) => message.id === id)
    if (index === -1) return false
    store.contactMessages.splice(index, 1)
    persist()
    return true
  }

  async countByStatus(): Promise<{ total: number; unread: number }> {
    const messages = getStore().contactMessages
    return {
      total: messages.length,
      unread: messages.filter((message) => message.status === 'unread').length,
    }
  }
}
