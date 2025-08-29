/**
 * Test Setup
 * Global setup for all Review Hub tests
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock Firebase (if not already mocked)
jest.mock('@/lib/firebase', () => ({
  db: {
    collection: jest.fn(),
    doc: jest.fn()
  },
  auth: {
    currentUser: null
  }
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error
};

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now()
  } as any;
}

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});