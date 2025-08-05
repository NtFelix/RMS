/** @type {import('next').NextConfig} */
const { withPostHogConfig } = require("@posthog/nextjs-config");
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Image optimization
  images: {
    domains: ['ocubnwzybybcbrhsnqqs.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Build configurations
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Use standalone output for better compatibility
  output: 'standalone',
  
  // Configure experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Disable optimized loading for better compatibility
    disableOptimizedLoading: true,
  },
  
  // External packages for server components (moved from experimental)
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Configure page configurations
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'mdx'],
  
  // Disable Edge Runtime for specific API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Add path aliases
    config.resolve = {
      ...(config.resolve || {}),
      alias: {
        ...(config.resolve.alias || {}),
        '@': path.resolve(__dirname, './'),
        '@/components': path.resolve(__dirname, './components'),
        '@/app': path.resolve(__dirname, './app'),
        // Use WebSocket mock for server-side rendering
        ws: isServer ? path.resolve(__dirname, 'ws.mock.js') : 'ws'
      },
      fallback: {
        ...(config.resolve.fallback || {}),
        // Use WebSocket mock for server-side fallback
        ws: isServer ? path.resolve(__dirname, 'ws.mock.js') : false
      }
    };
    
    // Add externals for WebSocket to prevent bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'ws': 'ws',
        'isomorphic-ws': 'ws'
      });
    }
    
    return config;
  },
};

// Export with PostHog configuration
module.exports = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
  envId: process.env.POSTHOG_ENV_ID,
  host: process.env.POSTHOG_HOST,
});
