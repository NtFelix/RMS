/** @type {import('next').NextConfig} */
const path = require('path');
const { version } = require('./package.json');

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  reactStrictMode: true,
  images: {
    domains: ['ocubnwzybybcbrhsnqqs.supabase.co'],
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
  webpack: (config, { isServer }) => {
    // Add path aliases
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
