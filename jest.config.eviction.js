// Jest configuration for eviction system tests
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/cache/eviction/**/*.test.ts',
    '**/cache/eviction/**/*.test.tsx',
    '**/cache/**/*.eviction.test.ts',
    '**/hooks/**/*eviction*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/lib/cache/eviction/**/*.{ts,tsx}',
    'src/hooks/useEviction.ts',
    'src/lib/cache/articleCache.ts',
    'src/lib/cache/kanjiCache.ts',
    '!**/*.test.{ts,tsx}',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
};