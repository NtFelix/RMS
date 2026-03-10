import { withPostHogConfig } from "@posthog/nextjs-config";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Expose the app version as a public env var (was in the unused next.config.js)
    NEXT_PUBLIC_APP_VERSION: version,
  },
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
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
    // Rewrites barrel-file imports to direct sub-path imports for these packages.
    // This reduces bundle size and can improve cold-start times by ~10-40%.
    // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports
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
  webpack: (config, { webpack }) => {
    // Stub and ignore the 'ws' module — it's a Node.js-only WebSocket lib that
    // isn't compatible with browser/edge runtimes and doesn't need to be bundled.
    // Note: '@/*' path aliases are handled automatically by Next.js reading the
    // `paths` key in tsconfig.json, so we don't need to add them here.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ws: false,
    };

    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      ws: false,
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
