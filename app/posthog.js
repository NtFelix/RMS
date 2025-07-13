import { PostHog } from 'posthog-node'

export default function PostHogClient() {
  const posthogClient = new PostHog('phc_jfMUSdIAQg9y9uJNtHpT4vf8kdv0ZvT6aHfq7R4Kyx3', {
    host: 'https://eu.i.posthog.com',
    flushAt: 1,
    flushInterval: 0
  })
  return posthogClient
}
