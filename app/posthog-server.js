const { PostHog } = require('posthog-node')

let posthogInstance = null

function getPostHogServer() {
  if (!posthogInstance) {
    posthogInstance = new PostHog('phc_jfMUSdIAQg9y9uJNtHpT4vf8kdv0ZvT6aHfq7R4Kyx3', {
      host: 'https://eu.i.posthog.com',
      flushAt: 1,
      flushInterval: 0
    })
  }
  return posthogInstance
}

module.exports = {
  getPostHogServer
}
