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
const posthogProjectId = process.env.POSTHOG_PROJECT_ID || process.env.POSTHOG_ENV_ID;
const posthogSourcemapsEnabled = Boolean(posthogPersonalApiKey && posthogProjectId);
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  // Avoid redirecting /assets/v2/ -> /assets/v2 which can break PostHog proxying
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
    optimizeCss: true,
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
  webpack: (config, { webpack }) => {
    // Preserve the existing project aliases while also stubbing ws.
    config.resolve = {
      ...(config.resolve || {}),
      alias: {
        ...(config.resolve.alias || {}),
        '@': path.resolve(projectRoot, './'),
        '@/components': path.resolve(projectRoot, './components'),
        '@/app': path.resolve(projectRoot, './app'),
        ws: false,
      },
      fallback: {
        ...(config.resolve.fallback || {}),
        ws: false,
      },
    };
    config.plugins = config.plugins || [];
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^ws$/ }));
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
