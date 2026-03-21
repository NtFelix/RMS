const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

function resolvePostHogHost(env = process.env, fallback = DEFAULT_POSTHOG_HOST) {
  const serverHost = env.POSTHOG_HOST;
  const publicHost = env.NEXT_PUBLIC_POSTHOG_HOST;
  const candidate = serverHost || publicHost;

  if (!candidate || candidate.startsWith('/')) {
    return serverHost || fallback;
  }

  return candidate;
}

module.exports = resolvePostHogHost;
