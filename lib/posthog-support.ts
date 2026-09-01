import type { PostHog } from 'posthog-js'
import type { User } from '@supabase/supabase-js'

export const SUPPORT_POLL_INTERVAL_MS = 10_000

export interface SupportIdentityResponse {
  distinctId: string
  hash: string
}

export const MAX_SUPPORT_MESSAGE_LENGTH = 10_000
export const WARN_SUPPORT_MESSAGE_LENGTH = 8_000

export interface SupportTicket {
  id: string
  status: 'new' | 'open' | 'pending' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | string
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
  status?: 'sending' | 'sent' | 'failed'
  error?: string
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

export interface RestoreResult {
  status: 'success' | 'invalid'
  widget_session_id?: string
  migrated_ticket_ids?: string[]
  code?: string
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
  restoreFromUrlToken?: () => Promise<RestoreResult | null>
}

export function getSupportErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    if (
      error.includes('10000') ||
      error.toLowerCase().includes('character') ||
      error.toLowerCase().includes('too large') ||
      error.toLowerCase().includes('invalid request data')
    ) {
      return 'Die Nachricht ist zu lang (maximal 10.000 Zeichen erlaubt). Bitte kürzen Sie Ihren Text.'
    }
    return error
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
  }
  if (error instanceof Error) {
    const msg = error.message
    const lower = msg.toLowerCase()
    if (lower.includes('too many requests') || lower.includes('429') || (error as any).kind === 'rate_limit') {
      return 'Zu viele Anfragen. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.'
    }
    if (
      msg.includes('10000') ||
      lower.includes('character') ||
      lower.includes('too large') ||
      lower.includes('invalid request data') ||
      msg.includes('413')
    ) {
      return 'Die Nachricht ist zu lang (maximal 10.000 Zeichen erlaubt). Bitte kürzen Sie Ihren Text.'
    }
    return msg
  }
  return 'Die Nachricht konnte nicht gesendet werden. Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.'
}

export function isRateLimitedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Too many requests') || error.message.includes('429')
  }
  return false
}

const supportIdentityCache = new Map<string, Promise<SupportIdentityResponse | null>>()

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

let conversationsBundlePromise: Promise<void> | null = null

export async function loadConversationsBundle(): Promise<void> {
  if (typeof window === 'undefined') return
  if ((window as any).__PosthogExtensions__?.initConversations) {
    return
  }
  if (conversationsBundlePromise) {
    return conversationsBundlePromise
  }

  const sources = [
    '/assets/v2/static/conversations.js',
    'https://eu-assets.i.posthog.com/static/conversations.js',
    'https://us-assets.i.posthog.com/static/conversations.js',
  ]

  conversationsBundlePromise = (async () => {
    for (const src of sources) {
      try {
        const res = await fetch(src)
        if (res.ok) {
          const code = await res.text()
          const fn = new Function(code)
          fn()
          if ((window as any).__PosthogExtensions__?.initConversations) {
            return
          }
        }
      } catch (err) {
        console.warn(`[Support] Failed loading conversations bundle from ${src}:`, err)
      }
    }
    throw new Error('Could not load conversations bundle from any source')
  })().finally(() => {
    conversationsBundlePromise = null
  })

  return conversationsBundlePromise
}

export async function ensureConversationsReady(posthog: PostHog | null | undefined): Promise<boolean> {
  if (!posthog || typeof window === 'undefined') return false

  const conv = (posthog as any)?.conversations
  if (conv?.isAvailable?.()) {
    return true
  }

  try {
    await loadConversationsBundle()
    const initConversations = (window as any).__PosthogExtensions__?.initConversations

    if (!initConversations) {
      return false
    }

    let remoteConfig = conv?._remoteConfig
    if (!remoteConfig || !remoteConfig.token) {
      const phKey = (posthog as any)?.config?.token || process.env.NEXT_PUBLIC_POSTHOG_KEY
      const phHost = (posthog as any)?.config?.api_host || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
      const configHost = phHost.startsWith('http') ? phHost : 'https://eu.i.posthog.com'

      if (phKey) {
        try {
          const configRes = await fetch(`${configHost}/array/${phKey}/config`)
          if (configRes.ok) {
            const configJson = await configRes.json()
            if (configJson?.conversations) {
              remoteConfig = configJson.conversations
              if (conv) {
                conv._remoteConfig = configJson.conversations
                conv._isConversationsEnabled = Boolean(configJson.conversations.enabled)
              }
            }
          }
        } catch (fetchErr) {
          console.warn('[Support] Could not fetch remote config directly:', fetchErr)
        }
      }
    }

    if (remoteConfig && initConversations && conv) {
      conv._remoteConfig = remoteConfig
      conv._isConversationsEnabled = true
      conv._conversationsManager = initConversations(remoteConfig, posthog)
      return Boolean(conv.isAvailable?.())
    }
  } catch (err) {
    console.error('[Support] Error ensuring conversations readiness:', err)
  }

  return Boolean(conv?.isAvailable?.())
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

  const cachedPromise = supportIdentityCache.get(distinctId)
  if (cachedPromise) {
    const identity = await cachedPromise
    if (identity) {
      supportPosthog.setIdentity(identity.distinctId, identity.hash)
    }
    return identity
  }

  const fetchPromise = (async () => {
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

      return payload
    } catch {
      return null
    }
  })()

  supportIdentityCache.set(distinctId, fetchPromise)

  const identity = await fetchPromise
  if (identity) {
    supportPosthog.setIdentity(identity.distinctId, identity.hash)
  } else {
    supportIdentityCache.delete(distinctId)
  }

  return identity
}
