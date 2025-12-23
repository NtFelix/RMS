import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle CSS imports (if you use CSS modules)
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle module aliases (if you have them in tsconfig.json)
    // These should match paths in tsconfig.json
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1', // Added specific mapping for hooks
  },
  // If you're using TypeScript with a baseUrl to set up directory aliases,
  // you need to tell Jest about these paths too.
  moduleDirectories: ['node_modules', '<rootDir>/'],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!<rootDir>/.next/**',
    '!<rootDir>/*.config.{js,mjs}', // Updated to include mjs
    '!<rootDir>/coverage/**',
    '!**/__tests__/**', // Exclude test files from coverage
    '!**/*.test.{ts,tsx}', // Exclude test files from coverage
    '!**/*.spec.{ts,tsx}', // Exclude spec files from coverage
  ],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase/ssr|@supabase/realtime-js|@supabase/supabase-js|marked)/)"
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Memory optimization settings
  maxWorkers: 1, // Limit the number of worker processes to prevent hanging
  workerIdleMemoryLimit: '256MB', // Restart workers when they use too much memory
  // Increase timeout for slow tests
  testTimeout: 5000,
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles that prevent Jest from exiting
  detectOpenHandles: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig)
