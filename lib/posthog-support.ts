import type { PostHog } from 'posthog-js'
import type { User } from '@supabase/supabase-js'

export const SUPPORT_POLL_INTERVAL_MS = 10_000
export const SUPPORT_CLOSED_POLL_INTERVAL_MS = 60_000

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

const TOO_LONG_MESSAGE =
  'Die Nachricht ist zu lang (maximal 10.000 Zeichen erlaubt). Bitte kürzen Sie Ihren Text.'

const RATE_LIMIT_PATTERN = /too many requests|rate.?limit/i
const TOO_LONG_PATTERN =
  /too (large|long)|invalid request data|exceeds?\b.*\b10[.,]?000|10[.,]?000\s*(characters|zeichen)/i

function getErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : undefined
}

export function isRateLimitedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    getErrorStatus(error) === 429 ||
    (error as { kind?: unknown }).kind === 'rate_limit' ||
    RATE_LIMIT_PATTERN.test(error.message)
  )
}

export function getSupportErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return TOO_LONG_PATTERN.test(error) ? TOO_LONG_MESSAGE : error
  }
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
  }
  if (error instanceof Error) {
    if (isRateLimitedError(error)) {
      return 'Zu viele Anfragen. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.'
    }
    if (getErrorStatus(error) === 413 || TOO_LONG_PATTERN.test(error.message)) {
      return TOO_LONG_MESSAGE
    }
    return error.message
  }
  return 'Die Nachricht konnte nicht gesendet werden. Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.'
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

/**
 * Points the SDK's active-ticket pointer at the given ticket (minified posthog-js internals `vp`/`Nf`).
 * Kept in one place so a posthog-js upgrade only needs fixing here.
 */
export function setActiveSdkTicket(posthog: PostHog | null | undefined, ticketId: string) {
  const conversations = posthog?.conversations as any
  if (typeof conversations?.vp === 'function') {
    conversations.vp(ticketId)
  }
  if (conversations?.Nf !== undefined) {
    conversations.Nf = ticketId
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
    'https://eu-assets.i.posthog.com/static/conversations.js',
    '/assets/v2/static/conversations.js',
    'https://us-assets.i.posthog.com/static/conversations.js',
  ]

  conversationsBundlePromise = (async () => {
    // Load as a regular <script> (reusing the page CSP nonce) instead of eval-ing fetched text.
    const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || undefined
    for (const src of sources) {
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = src
          script.async = true
          if (nonce) script.nonce = nonce
          script.onload = () => resolve()
          script.onerror = () => reject(new Error(`Script load failed: ${src}`))
          document.head.appendChild(script)
        })
        if ((window as any).__PosthogExtensions__?.initConversations) {
          return
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

  // Never initialise conversations when the user has not consented to / has opted out of PostHog.
  if (posthog.has_opted_out_capturing?.() || !posthog.has_opted_in_capturing?.()) {
    return false
  }

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
      if (!remoteConfig.enabled) {
        return false
      }
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

export function resetSupportIdentity(posthog: PostHog | null | undefined) {
  supportIdentityCache.clear()
  posthog?.reset?.()
}
