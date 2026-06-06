import type { PostHog } from 'posthog-js'
import type { User } from '@supabase/supabase-js'

export const SUPPORT_POLL_INTERVAL_MS = 10_000

export interface SupportIdentityResponse {
  distinctId: string
  hash: string
}

export interface SupportTicket {
  id: string
  status: 'new' | 'open' | 'pending' | 'on_hold' | 'resolved' | string
  last_message?: string
  last_message_at?: string
  message_count: number
  created_at: string
  unread_count?: number
}

export interface SupportMessage {
  id: string
  content: string
  author_type: 'customer' | 'AI' | 'human' | string
  author_name?: string
  created_at: string
  is_private: boolean
}

export interface SupportMessagesResponse {
  ticket_id: string
  ticket_status: string
  messages: SupportMessage[]
  has_more: boolean
  unread_count: number
}

export interface SupportTicketsResponse {
  count: number
  results: SupportTicket[]
}

export interface SupportConversationsClient {
  isAvailable?: () => boolean
  getTickets?: (options?: {
    status?: string
    limit?: number
    offset?: number
  }) => Promise<SupportTicketsResponse | null>
  getMessages?: (ticketId?: string, after?: string) => Promise<SupportMessagesResponse | null>
  markAsRead?: (ticketId?: string) => Promise<{ success: boolean; unread_count: number } | null>
  sendMessage?: (
    message: string,
    userTraits?: {
      name?: string
      email?: string
    },
    newTicket?: boolean
  ) => Promise<{
    ticket_id: string
    message_id: string
    ticket_status: string
    created_at: string
    unread_count: number
  } | null>
  getCurrentTicketId?: () => string | null
  getWidgetSessionId?: () => string | null
  requestRestoreLink?: (email: string) => Promise<void>
  restoreFromUrlToken?: () => Promise<unknown>
}

const supportIdentityCache = new Map<string, SupportIdentityResponse>()

export function buildSupportTraits(user: User | null | undefined) {
  if (!user) {
    return undefined
  }

  return {
    name:
      [user.user_metadata?.first_name, user.user_metadata?.last_name]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(' ')
      || user.user_metadata?.name
      || user.email
      || undefined,
    email: user.email || undefined,
  }
}

export async function syncSupportIdentity(
  posthog: PostHog | null | undefined,
  distinctId: string | null | undefined,
): Promise<SupportIdentityResponse | null> {
  const supportPosthog = posthog as PostHog & {
    setIdentity?: (distinctId: string, hash: string) => void
  }

  if (!supportPosthog || !distinctId || typeof supportPosthog.setIdentity !== 'function') {
    return null
  }

  const cachedIdentity = supportIdentityCache.get(distinctId)
  if (cachedIdentity) {
    supportPosthog.setIdentity(cachedIdentity.distinctId, cachedIdentity.hash)
    return cachedIdentity
  }

  try {
    const response = await fetch('/api/support/identity', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as SupportIdentityResponse

    if (!payload?.distinctId || !payload?.hash) {
      return null
    }

    supportIdentityCache.set(payload.distinctId, payload)
    supportPosthog.setIdentity(payload.distinctId, payload.hash)
    return payload
  } catch {
    return null
  }
}
