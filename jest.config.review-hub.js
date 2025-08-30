/**
 * Jest Configuration for Review Hub Testing
 * Complete test suite configuration with coverage reporting
 */

module.exports = {
  // Use Next.js Jest preset
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/services/__tests__/setup.ts'
  ],
  
  // Module paths
  moduleNameMapper: {
    // Handle CSS imports
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(css|sass|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
    
    // Handle image imports
    '^.+\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // Test patterns
  testMatch: [
    // Unit tests
    '<rootDir>/src/services/review-events/__tests__/*.test.ts',
    '<rootDir>/src/services/review-store/__tests__/*.test.ts',
    '<rootDir>/src/services/access-control/__tests__/*.test.ts',
    
    // Integration tests
    '<rootDir>/src/services/__tests__/*.integration.test.ts',
    
    // E2E tests
    '<rootDir>/src/services/__tests__/*.e2e.test.ts',
    
    // Performance tests
    '<rootDir>/src/services/__tests__/*.performance.test.ts',
    
    // Component tests
    '<rootDir>/src/app/review-hub/__tests__/*.test.tsx',
    '<rootDir>/src/components/review-hub/__tests__/*.test.tsx',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    // Include all source files
    'src/services/review-events/**/*.{ts,tsx}',
    'src/services/review-store/**/*.{ts,tsx}',
    'src/services/access-control/**/*.{ts,tsx}',
    'src/services/cache/**/*.{ts,tsx}',
    'src/services/database/**/*.{ts,tsx}',
    'src/services/monitoring/**/*.{ts,tsx}',
    'src/services/offline/**/*.{ts,tsx}',
    'src/services/websocket/**/*.{ts,tsx}',
    'src/services/review-integration/**/*.{ts,tsx}',
    'src/app/review-hub/**/*.{ts,tsx}',
    'src/components/review-hub/**/*.{ts,tsx}',
    
    // Exclude test files and types
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/types.ts',
    '!**/index.ts',
    '!**/*.d.ts',
  ],
  
  // Coverage thresholds
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    './src/services/review-events/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/services/review-store/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/access-control/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura',
  ],
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage/review-hub',
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/out/',
    '/public/',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};