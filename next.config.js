/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ocubnwzybybcbrhsnqqs.supabase.co'],
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    // Enable package imports optimization for better tree shaking
    optimizePackageImports: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-underline',
      '@tiptap/extension-mention',
      '@tiptap/extension-bubble-menu',
      '@tiptap/extension-floating-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'framer-motion'
    ],
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // Performance optimizations
  swcMinify: true, // Use SWC for minification (faster than Terser)
  
  // Bundle analyzer configuration (only in development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../bundle-analysis.html',
          })
        );
      }
      return config;
    },
  }),
  
  webpack: (config, { isServer, dev }) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/app': path.resolve(__dirname, './app'),
    };

    // Performance optimizations for template system
    if (!isServer) {
      // Optimize bundle splitting for template components
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // TipTap editor bundle
            tiptap: {
              test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
              name: 'tiptap',
              chunks: 'all',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Template editor components
            templateEditor: {
              test: /[\\/]components[\\/]editor[\\/]/,
              name: 'template-editor',
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Template system utilities
            templateUtils: {
              test: /[\\/]lib[\\/]template-/,
              name: 'template-utils',
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Radix UI components
            radixUI: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 15,
              reuseExistingChunk: true,
            },
            // Framer Motion
            framerMotion: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: 'framer-motion',
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Tree shaking optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Performance monitoring in development
      if (dev && process.env.NODE_ENV === 'development') {
        // Add performance monitoring webpack plugin
        const PerformanceMonitorPlugin = class {
          apply(compiler) {
            compiler.hooks.done.tap('PerformanceMonitorPlugin', (stats) => {
              const { time, assets } = stats.toJson({ assets: true, timings: true });
              
              console.log('\n📊 Build Performance:');
              console.log(`⏱️  Build Time: ${time}ms`);
              
              // Show largest assets
              const largeAssets = assets
                .filter(asset => asset.size > 100000) // > 100KB
                .sort((a, b) => b.size - a.size)
                .slice(0, 5);
              
              if (largeAssets.length > 0) {
                console.log('📦 Largest Assets:');
                largeAssets.forEach(asset => {
                  console.log(`   ${asset.name}: ${(asset.size / 1024).toFixed(1)}KB`);
                });
              }
              
              // Performance warnings
              if (time > 10000) {
                console.warn('⚠️  Slow build detected (>10s). Consider optimizing imports.');
              }
              
              const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
              if (totalSize > 5000000) { // > 5MB
                console.warn('⚠️  Large bundle size detected (>5MB). Consider code splitting.');
              }
            });
          }
        };
        
        config.plugins.push(new PerformanceMonitorPlugin());
      }
    }

    // Optimize imports for better tree shaking
    config.resolve.mainFields = ['module', 'main'];
    
    return config;
  },
  
  // Headers for performance optimization
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Cache static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // Preload critical resources
          {
            key: 'Link',
            value: '</fonts/inter.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          // API response caching
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=600', // 5min client, 10min CDN
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
