import type { ContactMessage, CreateContactMessageInput } from '../types/domain'
import type {
  ContactMessageFilter,
  ContactMessageRepository,
  Paginated,
} from '../repositories/types'
import type { MessageStatus } from '../types/enums'
import { notFound } from '../utils/AppError'

/**
 * Contact message business logic.
 *
 * The only service reachable by an unauthenticated visitor (via `submit`),
 * which is why that path is rate limited at the route and stores the caller's
 * IP for abuse tracing. Everything else here is admin-only inbox management.
 */
export class ContactService {
  constructor(private readonly messages: ContactMessageRepository) {}

  /** Public. Always creates an unread message; status is not caller-settable. */
  async submit(input: CreateContactMessageInput): Promise<ContactMessage> {
    return this.messages.create(input)
  }

  /** Admin-only: this is inbox data, not public content. */
  async list(filter: ContactMessageFilter): Promise<Paginated<ContactMessage>> {
    return this.messages.findMany(filter)
  }

  async getById(id: string): Promise<ContactMessage> {
    const message = await this.messages.findById(id)
    if (!message) throw notFound('Message not found')
    return message
  }

  /**
   * Opening a message marks it read.
   *
   * Done here rather than expecting the frontend to fire a second request, so
   * the unread count cannot drift from what the admin has actually seen.
   */
  async getAndMarkRead(id: string): Promise<ContactMessage> {
    const message = await this.getById(id)
    if (message.status !== 'unread') return message

    const updated = await this.messages.update(id, { status: 'read' })
    return updated ?? message
  }

  async setStatus(id: string, status: MessageStatus): Promise<ContactMessage> {
    const updated = await this.messages.update(id, { status })
    if (!updated) throw notFound('Message not found')
    return updated
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.messages.delete(id)
    if (!deleted) throw notFound('Message not found')
  }
}
