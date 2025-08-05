import { withPostHogConfig } from "@posthog/nextjs-config";
import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify is now enabled by default in Next.js 15
  productionBrowserSourceMaps: false,
  compress: true,
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
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  webpack(config, { isServer, webpack }) {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/app': path.resolve(__dirname, './app'),
    };

    // Add any additional webpack configurations here
    if (!isServer) {
      // Client-side only configurations
    }

    // Stub and ignore 'ws' module in all builds
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
