/**
 * Setup and Configuration for UnifiedReviewHub Integration Tests
 * 
 * Provides global test setup, mocks, and configuration for
 * comprehensive integration testing of the review system.
 */

import '@testing-library/jest-dom';

// ============================================================================
// Global Mocks
// ============================================================================

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: jest.fn()
  },
  writable: true
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Keep error for important test failures, but quiet info/debug
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  console.warn = jest.fn();
  // Keep console.error for debugging test failures
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// ============================================================================
// Test Environment Setup
// ============================================================================

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Clear storage mocks
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();

  // Reset timers if using fake timers
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
  }
});

afterEach(() => {
  // Clean up any remaining timers
  if (jest.isMockFunction(setTimeout)) {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  }
});

// ============================================================================
// Custom Test Matchers
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveBeenCalledWithUserId(userId: string | null): R;
      toBeWithinTimeRange(startTime: Date, endTime: Date): R;
    }
  }
}

// Custom matcher to verify function calls with user ID
expect.extend({
  toHaveBeenCalledWithUserId(received: jest.MockedFunction<any>, userId: string | null) {
    const calls = received.mock.calls;
    const pass = calls.some(call => call[0] === userId);

    if (pass) {
      return {
        message: () => `Expected function NOT to have been called with userId: ${userId}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected function to have been called with userId: ${userId}`,
        pass: false
      };
    }
  },

  toBeWithinTimeRange(received: Date, startTime: Date, endTime: Date) {
    const pass = received >= startTime && received <= endTime;

    if (pass) {
      return {
        message: () => `Expected ${received.toISOString()} NOT to be within ${startTime.toISOString()} and ${endTime.toISOString()}`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${received.toISOString()} to be within ${startTime.toISOString()} and ${endTime.toISOString()}`,
        pass: false
      };
    }
  }
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for all pending promises to resolve
 */
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Wait for React to finish updating
 */
export const waitForReactUpdate = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Mock implementation that returns a promise
 */
export const mockAsyncFunction = <T>(returnValue: T, delay: number = 0) => {
  return jest.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(returnValue), delay))
  );
};

/**
 * Mock implementation that rejects with an error
 */
export const mockAsyncError = (error: Error, delay: number = 0) => {
  return jest.fn().mockImplementation(
    () => new Promise((_, reject) => setTimeout(() => reject(error), delay))
  );
};

// ============================================================================
// Common Test Data
// ============================================================================

export const TEST_USER_ID = 'test-user-12345';
export const TEST_SUBSCRIBER_USER_ID = 'subscriber-user-67890';
export const TEST_FREE_USER_ID = 'free-user-54321';

export const TEST_DATES = {
  now: new Date('2025-01-15T12:00:00Z'),
  morningGoldenTime: new Date('2025-01-15T08:30:00Z'),
  eveningGoldenTime: new Date('2025-01-15T19:00:00Z'),
  betweenGoldenTime: new Date('2025-01-15T14:00:00Z'),
  afterGoldenTime: new Date('2025-01-15T22:00:00Z'),
  yesterday: new Date('2025-01-14T12:00:00Z'),
  tomorrow: new Date('2025-01-16T12:00:00Z')
};

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Suppress console.error for specific tests that expect errors
 */
export const suppressConsoleError = (testFunction: () => void | Promise<void>) => {
  return async () => {
    const originalError = console.error;
    console.error = jest.fn();
    
    try {
      await testFunction();
    } finally {
      console.error = originalError;
    }
  };
};

/**
 * Capture console.error calls for assertions
 */
export const captureConsoleError = () => {
  const originalError = console.error;
  const errorSpy = jest.fn();
  console.error = errorSpy;
  
  return {
    errorSpy,
    restore: () => {
      console.error = originalError;
    }
  };
};

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Measure performance of a function
 */
export const measurePerformance = async (fn: () => Promise<void> | void): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

/**
 * Verify that a function completes within a time limit
 */
export const expectWithinTimeLimit = async (
  fn: () => Promise<void> | void,
  maxTimeMs: number
): Promise<void> => {
  const duration = await measurePerformance(fn);
  expect(duration).toBeLessThan(maxTimeMs);
};

// ============================================================================
// Memory Leak Detection
// ============================================================================

/**
 * Track objects for memory leak detection
 */
class MemoryTracker {
  private objects = new Set<object>();

  track<T extends object>(obj: T): T {
    this.objects.add(obj);
    return obj;
  }

  getTrackedCount(): number {
    return this.objects.size;
  }

  clear(): void {
    this.objects.clear();
  }
}

export const memoryTracker = new MemoryTracker();

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Force garbage collection (if available)
 */
export const forceGC = () => {
  if (global.gc) {
    global.gc();
  }
};

/**
 * Clean up all test resources
 */
export const cleanupTestResources = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear storage
  sessionStorageMock.clear();
  localStorageMock.clear();
  
  // Clear memory tracker
  memoryTracker.clear();
  
  // Force cleanup
  forceGC();
};

// Export common utilities
export {
  sessionStorageMock,
  localStorageMock
};