import { withPostHogConfig } from "@posthog/nextjs-config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15+
  productionBrowserSourceMaps: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60, // Keeping 60s instead of Next.js 16 default (4 hours)
    unoptimized: false,
  },
  // Removed experimental flags - optimizeCss and scrollRestoration are now stable/default
  
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      // Stub 'ws' module for Turbopack (equivalent to webpack config below)
      ws: false,
    },
  },
  
  // Webpack configuration (fallback for --webpack flag)
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
