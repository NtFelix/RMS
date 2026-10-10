import 'posthog-js'
import type {
  SupportConversationsClient,
  SupportIdentityResponse,
} from './posthog-support'

declare module 'posthog-js' {
  interface PostHog {
    conversations?: SupportConversationsClient
    setIdentity?: (distinctId: string, hash: string) => void
    get_distinct_id?: () => string
  }
}

export type PostHogSupportIdentity = SupportIdentityResponse

