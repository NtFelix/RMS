const { POSTHOG_INGEST_HOST } = require('./posthog-proxy.js');

const DEFAULT_POSTHOG_HOST = POSTHOG_INGEST_HOST;

function resolvePostHogHost(env = process.env, fallback = DEFAULT_POSTHOG_HOST) {
  const serverHost = env.POSTHOG_HOST;
  const publicHost = env.NEXT_PUBLIC_POSTHOG_HOST;
  const candidate = serverHost || publicHost;

  if (!candidate || candidate.startsWith('/')) {
    return fallback;
  }

  return candidate;
}

module.exports = resolvePostHogHost;
