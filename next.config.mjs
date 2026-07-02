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

// Pin the Server Action encryption key so action IDs stay stable across builds.
// Without a fixed key, Next.js generates a random one per build, which changes the
// hashed Server Action IDs on every deploy. Any client still holding a page from a
// previous deploy then hits "Failed to find Server Action ..." when it submits a
// form. Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY to the SAME value at build and
// runtime, and keep it identical across deploys. Generate one with:
//   openssl rand -base64 32
const serverActionsEncryptionKey = process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY;

if (process.env.NODE_ENV === 'production' && !serverActionsEncryptionKey) {
  console.warn(`
============================================================
SERVER ACTION ENCRYPTION KEY NOT SET
============================================================
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY is not set for this production build.

Next.js will generate a random key per build, so Server Action IDs
will change on every deploy. Clients holding a page from a previous
deploy will hit "Failed to find Server Action ..." when they submit
a form mid-deploy.

To fix, set the same value at build AND runtime (and keep it stable
across deploys):
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)
============================================================
`);
}

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  // Deterministic build ID keyed to the release version. Rolling replicas of the
  // same release share it, and it only changes when the version bumps. Combined
  // with a pinned Server Action encryption key, this keeps action IDs consistent.
  generateBuildId: async () => version,
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15
  productionBrowserSourceMaps: true,
  compress: true,
  poweredByHeader: false,
  // Avoid redirecting /assets/v2/ -> /assets/v2 which can break PostHog proxying
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
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
  experimental: {
    scrollRestoration: true,
    serverActions: {
      // See serverActionsEncryptionKey above. When undefined, Next.js falls back to
      // NEXT_SERVER_ACTIONS_ENCRYPTION_KEY / a generated key, so this is safe to pass.
      encryptionKey: serverActionsEncryptionKey,
    },
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
  webpack: (config, { isServer, webpack }) => {
    // Stub ws module on the client side only to prevent breaking server components
    if (!isServer) {
      config.resolve = {
        ...(config.resolve || {}),
        alias: {
          ...(config.resolve.alias || {}),
          ws: false,
        },
        fallback: {
          ...(config.resolve.fallback || {}),
          ws: false,
        },
      };
      config.plugins = config.plugins || [];
      config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^ws$/ }));
    }
    return config;
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
