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

  // Experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Disable Edge Runtime for the entire application
    disableOptimizedLoading: true,
    // Disable Edge Runtime for API routes
    disableEdgeRuntime: true,
  },
  
  // Use standalone output for better compatibility
  output: 'standalone',
  
  // Configure experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Disable Edge Runtime by default
    disableOptimizedLoading: true,
    // Disable Edge Runtime for API routes
    disableEdgeRuntime: true,
    // External packages for server components
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
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
        ws: false,
      },
      fallback: {
        ...(config.resolve.fallback || {}),
        ws: false,
      },
    };

    // Handle WebSocket module
    config.resolve.alias.ws = path.resolve(__dirname, 'ws.mock.js');
    
    // Add fallback for WebSocket
    config.resolve.fallback = {
      ...config.resolve.fallback,
      ws: require.resolve('ws')
    };
    
    // Add externals for WebSocket to prevent bundling issues
    config.externals = config.externals || [];
    config.externals.push({
      'ws': 'ws',  // Use the 'ws' module from node_modules
      'isomorphic-ws': 'ws'  // Alias isomorphic-ws to ws
    });
    
    return config;
  },
};

// Export with PostHog configuration
module.exports = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
  envId: process.env.POSTHOG_ENV_ID,
  host: process.env.POSTHOG_HOST,
});
