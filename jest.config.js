module.exports = {
  // preset: 'ts-jest', // Relying on babel-jest via transform
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle CSS imports (if you use CSS modules)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle module aliases (if you have them in tsconfig.json)
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Setup files after env
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Transform files with babel-jest, pointing to babel.config.js
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  // Ignore transform for node_modules, except for specific ES modules if needed
  transformIgnorePatterns: [
    '/node_modules/',
    // Add exceptions here if you have ES modules in node_modules that need transpiling
    // Example: '/node_modules/(?!(module-to-transpile|another-module)/)'
  ],
  // Collect coverage from
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!<rootDir>/.next/**',
    '!<rootDir>/*.config.js',
    '!<rootDir>/coverage/**',
  ],
  // globals: { // Deprecated: ts-jest config moved to transform
  //   'ts-jest': {
  //     tsconfig: 'tsconfig.json',
  //   },
  // },
};
