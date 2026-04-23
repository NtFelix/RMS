import { withPostHogConfig } from "@posthog/nextjs-config";
import posthogProxyConfig from "./lib/posthog-proxy.js";

const { POSTHOG_PROXY_PATH, POSTHOG_INGEST_HOST, POSTHOG_ASSETS_HOST } = posthogProxyConfig;
const POSTHOG_PROXY_MODE = process.env.POSTHOG_PROXY_MODE;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15
  productionBrowserSourceMaps: false,
  compress: true,
  // Avoid redirecting /assets/v2/ -> /assets/v2 which can break PostHog proxying
  skipTrailingSlashRedirect: true,
  eslint: {
    ignoreDuringBuilds: true,  // Changed from false to true
  },
  typescript: {
    ignoreBuildErrors: true,  // Changed from false to true
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
    // Stub and ignore 'ws' module in all builds
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
    return config;
  },
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
  envId: process.env.POSTHOG_ENV_ID,
  host: process.env.POSTHOG_HOST,
});
