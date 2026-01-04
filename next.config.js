/** @type {import('next').NextConfig} */
const path = require('path');
const { version } = require('./package.json');

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ocubnwzybybcbrhsnqqs.supabase.co',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Empty turbopack config to acknowledge Turbopack is the default bundler in Next.js 16
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Add path aliases (kept for compatibility, Turbopack uses tsconfig paths)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/app': path.resolve(__dirname, './app'),
    };
    return config;
  },
};

module.exports = nextConfig;
