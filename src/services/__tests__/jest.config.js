/**
 * Jest Configuration for Review Hub Tests
 */

module.exports = {
  displayName: 'Review Hub Tests',
  testEnvironment: 'node',
  testMatch: [
    '**/src/services/**/__tests__/**/*.test.ts',
    '**/src/services/__tests__/**/*.test.ts'
  ],
  coverageDirectory: '<rootDir>/coverage/review-hub',
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/**/__tests__/**',
    '!src/services/**/*.test.ts',
    '!src/services/**/*.benchmark.ts',
    '!src/services/**/types.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/services/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  }
};