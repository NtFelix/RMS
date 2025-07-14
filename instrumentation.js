export function register() {
  // No-op for initialization
}

export const onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getPostHogServer } = require('./app/posthog-server')
    const posthog = await getPostHogServer()
    let distinctId = null
    if (request.headers.cookie) {
      const cookieString = request.headers.cookie
      const postHogCookieMatch =
        cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)
      if (postHogCookieMatch && postHogCookieMatch[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1])
          const postHogData = JSON.parse(decodedCookie)
          distinctId = postHogData.distinct_id
        } catch (e) {
          console.error('Error parsing PostHog cookie:', e)
        }
      }
    }
    await posthog.captureException(err, distinctId || undefined)
  }
}
