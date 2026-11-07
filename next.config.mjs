import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { withPostHogConfig } from '@posthog/nextjs-config';
import posthogProxyConfig from './lib/posthog-proxy.js';

const { POSTHOG_PROXY_PATH, POSTHOG_INGEST_HOST, POSTHOG_ASSETS_HOST } = posthogProxyConfig;
const POSTHOG_PROXY_MODE = process.env.POSTHOG_PROXY_MODE;
const require = createRequire(import.meta.url);
const { version } = require('./package.json');
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const posthogPersonalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const posthogProjectId = process.env.POSTHOG_PROJECT_ID;
const posthogSourcemapsEnabled = Boolean(posthogPersonalApiKey && posthogProjectId);
const robotsIndexingEnabled = process.env.ROBOTS_INDEXING !== 'false';
const missingPostHogSourcemapVars = [
  !posthogPersonalApiKey ? 'POSTHOG_PERSONAL_API_KEY' : null,
  !posthogProjectId ? 'POSTHOG_PROJECT_ID' : null,
].filter(Boolean);

if (process.env.NODE_ENV === 'production' && !posthogSourcemapsEnabled) {
  console.warn(`
============================================================
POSTHOG SOURCEMAPS DISABLED
============================================================
PostHog sourcemap upload is OFF for this production build.
Missing environment variables: ${missingPostHogSourcemapVars.join(', ')}

To enable sourcemap upload, set:
  POSTHOG_PERSONAL_API_KEY
  POSTHOG_PROJECT_ID

Build will continue, but new frontend/server errors in PostHog
will not resolve to uploaded sourcemaps for this deployment.
============================================================
`);
}

const exposeTestingApi = process.env.EXPOSE_TESTING_API === '1';

if (exposeTestingApi) {
  console.warn(`
============================================================
EXPOSE_TESTING_API=1: INSTANT-NAVIGATION TEST HOOK IS COMPILED IN
============================================================
This build exposes a testing API in the production bundle.
Use it only for e2e/instant-navigation.spec.ts, never deploy it.
============================================================
`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    // Inlined at build time: the footer must not call `new Date()` while rendering, which would move it out
    // of the prerendered HTML (the year is as fresh as the deployment).
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15
  productionBrowserSourceMaps: true,
  compress: true,
  poweredByHeader: false,
  // Avoid redirecting /assets/v2/ -> /assets/v2 which can break PostHog proxying
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ocubnwzybybcbrhsnqqs.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  cacheComponents: true,
  // Part of the Cache Components model (default in Next.js 17): each <Link> prefetches the route's static
  // App Shell instead of the whole page. Revert to `false` to get the previous prefetching behaviour.
  partialPrefetching: true,
  experimental: {
    // Only for the test build that runs e2e/instant-navigation.spec.ts (EXPOSE_TESTING_API=1 next build).
    // Off by default: it exposes a testing hook in the production bundle.
    exposeTestingApiInProductionBuild: exposeTestingApi,
    scrollRestoration: true,
    optimizePackageImports: [
      'recharts',
      'lucide-react',
      'framer-motion',
      'date-fns',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-dropdown-menu',
    ],
  },
  async rewrites() {
    // If Cloudflare edge rewrites are problematic, force the route-handler proxy instead.
    if (POSTHOG_PROXY_MODE === "route") {
      return [];
    }

    // Use an opaque path to reduce ad-block targeting; keep static assets first.
    return {
      beforeFiles: [
        {
          source: `${POSTHOG_PROXY_PATH}/static/:path*`,
          destination: `${POSTHOG_ASSETS_HOST}/static/:path*`,
        },
        {
          source: `${POSTHOG_PROXY_PATH}/:path*`,
          destination: `${POSTHOG_INGEST_HOST}/:path*`,
        },
      ],
    };
  },
  async headers() {
    if (robotsIndexingEnabled) {
      return [];
    }

    return [
      {
        // Apply noindex to all routes except internal assets and common static files
        source: '/((?!api/|_next/|favicon.ico|robots.txt).*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
  },
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: posthogPersonalApiKey,
  projectId: posthogProjectId,
  host: process.env.POSTHOG_HOST,
  sourcemaps: {
    enabled: posthogSourcemapsEnabled,
  },
});
