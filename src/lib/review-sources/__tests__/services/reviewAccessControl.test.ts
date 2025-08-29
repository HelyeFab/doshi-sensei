/**
 * Comprehensive Tests for ReviewAccessControl Service
 * 
 * Tests the Three-Pillar Architecture access control implementation:
 * 1. Guest users (no uid): NO ACCESS - authentication required
 * 2. Free users: LIMITED to 10 reviews per day across ALL sources
 * 3. Monthly/Yearly subscribers: UNLIMITED reviews
 * 
 * Coverage includes:
 * - Access checking for all user types
 * - Daily count tracking and persistence
 * - Date-based daily resets
 * - Storage error handling
 * - Edge cases and boundary conditions
 */

import { ReviewAccessControlService } from '../../services/reviewAccessControl';
import type { AccessControlResult } from '../../services/reviewAccessControl';

// ============================================================================
// Test Setup and Mocks
// ============================================================================

// Mock localStorage for consistent testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test data constants
const TEST_USER_ID = 'test-user-12345';
const TEST_FREE_USER_ID = 'free-user-67890';
const TEST_SUBSCRIBER_USER_ID = 'subscriber-user-54321';

// Mock console methods to reduce noise
const originalConsole = { ...console };
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('ReviewAccessControlService', () => {
  beforeEach(() => {
    // Clear all mocks and storage before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Use fake timers and set system time to a fixed date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
  });

  // ============================================================================
  // Access Control Tests - Guest Users
  // ============================================================================

  describe('Guest User Access Control', () => {
    test('should deny access for null userId', () => {
      const result = ReviewAccessControlService.checkAccess(null);
      
      expect(result).toEqual({
        canReview: false,
        reason: 'authentication_required'
      });
    });

    test('should deny access for undefined userId', () => {
      const result = ReviewAccessControlService.checkAccess(undefined);
      
      expect(result).toEqual({
        canReview: false,
        reason: 'authentication_required'
      });
    });

    test('should deny access for empty string userId', () => {
      const result = ReviewAccessControlService.checkAccess('');
      
      expect(result).toEqual({
        canReview: false,
        reason: 'authentication_required'
      });
    });

    test('should return 0 remaining reviews for guests', () => {
      expect(ReviewAccessControlService.getRemainingReviews(null)).toBe(0);
      expect(ReviewAccessControlService.getRemainingReviews(undefined)).toBe(0);
      expect(ReviewAccessControlService.getRemainingReviews('')).toBe(0);
    });
  });

  // ============================================================================
  // Access Control Tests - Free Users
  // ============================================================================

  describe('Free User Access Control', () => {
    test('should allow access for new free user with no reviews', () => {
      const result = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      
      expect(result).toEqual({
        canReview: true,
        remainingCount: 10,
        reason: undefined
      });
    });

    test('should track remaining reviews correctly', () => {
      // Simulate having done 3 reviews today
      ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);

      const result = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      
      expect(result).toEqual({
        canReview: true,
        remainingCount: 7,
        reason: undefined
      });
    });

    test('should deny access when daily limit is reached', () => {
      // Simulate reaching the daily limit (10 reviews)
      for (let i = 0; i < 10; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }

      const result = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      
      expect(result).toEqual({
        canReview: false,
        remainingCount: 0,
        reason: 'daily_limit_reached'
      });
    });

    test('should deny access when limit is exceeded', () => {
      // Simulate exceeding the daily limit (11 reviews)
      for (let i = 0; i < 11; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }

      const result = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      
      expect(result).toEqual({
        canReview: false,
        remainingCount: 0,
        reason: 'daily_limit_reached'
      });
    });

    test('should correctly calculate remaining reviews', () => {
      // Test various scenarios
      expect(ReviewAccessControlService.getRemainingReviews(TEST_FREE_USER_ID, 'free')).toBe(10);
      
      ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      expect(ReviewAccessControlService.getRemainingReviews(TEST_FREE_USER_ID, 'free')).toBe(9);
      
      // Add 8 more to reach limit
      for (let i = 0; i < 8; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }
      expect(ReviewAccessControlService.getRemainingReviews(TEST_FREE_USER_ID, 'free')).toBe(1);
      
      // Add one more to hit limit
      ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      expect(ReviewAccessControlService.getRemainingReviews(TEST_FREE_USER_ID, 'free')).toBe(0);
    });

    test('should handle boundary condition at exactly 10 reviews', () => {
      // Add exactly 9 reviews (one less than limit)
      for (let i = 0; i < 9; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }

      // Should still allow one more
      const beforeLimit = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      expect(beforeLimit.canReview).toBe(true);
      expect(beforeLimit.remainingCount).toBe(1);

      // Add the 10th review
      ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);

      // Should now be at limit
      const atLimit = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      expect(atLimit.canReview).toBe(false);
      expect(atLimit.remainingCount).toBe(0);
      expect(atLimit.reason).toBe('daily_limit_reached');
    });
  });

  // ============================================================================
  // Access Control Tests - Subscribers
  // ============================================================================

  describe('Subscriber Access Control', () => {
    test('should allow unlimited access for monthly subscribers', () => {
      const result = ReviewAccessControlService.checkAccess(TEST_SUBSCRIBER_USER_ID, 'monthly');
      
      expect(result).toEqual({
        canReview: true,
        remainingCount: undefined,
        reason: undefined
      });
    });

    test('should allow unlimited access for yearly subscribers', () => {
      const result = ReviewAccessControlService.checkAccess(TEST_SUBSCRIBER_USER_ID, 'yearly');
      
      expect(result).toEqual({
        canReview: true,
        remainingCount: undefined,
        reason: undefined
      });
    });

    test('should allow access even with high review counts', () => {
      // Simulate many reviews for a subscriber
      for (let i = 0; i < 100; i++) {
        ReviewAccessControlService.incrementCount(TEST_SUBSCRIBER_USER_ID);
      }

      const monthlyResult = ReviewAccessControlService.checkAccess(TEST_SUBSCRIBER_USER_ID, 'monthly');
      const yearlyResult = ReviewAccessControlService.checkAccess(TEST_SUBSCRIBER_USER_ID, 'yearly');
      
      expect(monthlyResult.canReview).toBe(true);
      expect(yearlyResult.canReview).toBe(true);
    });

    test('should return -1 for unlimited remaining reviews', () => {
      expect(ReviewAccessControlService.getRemainingReviews(TEST_SUBSCRIBER_USER_ID, 'monthly')).toBe(-1);
      expect(ReviewAccessControlService.getRemainingReviews(TEST_SUBSCRIBER_USER_ID, 'yearly')).toBe(-1);
    });
  });

  // ============================================================================
  // Count Tracking and Persistence Tests
  // ============================================================================

  describe('Count Tracking and Persistence', () => {
    test('should start with zero count for new users', () => {
      const { count, date } = ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      const expectedDate = new Date().toISOString().split('T')[0];
      
      expect(count).toBe(0);
      expect(date).toBe(expectedDate);
    });

    test('should increment count correctly', () => {
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(1);
      
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(2);
      
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(3);
    });

    test('should persist count to localStorage', () => {
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      const expectedDate = new Date().toISOString().split('T')[0];
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        `reviewCount_test-user-12345_${expectedDate}`,
        expect.stringContaining('"count":1')
      );
    });

    test('should restore count from localStorage', () => {
      // Manually set localStorage data
      const today = new Date().toISOString().split('T')[0]; // Use current mocked date
      const storageData = {
        count: 5,
        date: today,
        lastUpdated: Date.now()
      };
      localStorageMock.setItem(
        `reviewCount_test-user-12345_${today}`,
        JSON.stringify(storageData)
      );

      const { count, date } = ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      
      expect(count).toBe(5);
      expect(date).toBe(today);
    });

    test('should not increment count for guests', () => {
      ReviewAccessControlService.incrementCount(''); // Empty string (guest)
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('should handle multiple users independently', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      ReviewAccessControlService.incrementCount(user1);
      ReviewAccessControlService.incrementCount(user1);
      ReviewAccessControlService.incrementCount(user2);
      
      expect(ReviewAccessControlService.getTodayCount(user1).count).toBe(2);
      expect(ReviewAccessControlService.getTodayCount(user2).count).toBe(1);
    });
  });

  // ============================================================================
  // Daily Reset Tests (Date Changes)
  // ============================================================================

  describe('Daily Reset Functionality', () => {
    test('should reset count on date change', () => {
      // Set up data for today
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(2);
      
      // Move to next day
      jest.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      
      // Should start fresh
      const { count, date } = ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      const expectedDate = new Date().toISOString().split('T')[0];
      expect(count).toBe(0);
      expect(date).toBe(expectedDate);
    });

    test('should handle date mismatch in stored data', () => {
      // Manually store data for yesterday
      const today = new Date().toISOString().split('T')[0];
      const oldStorageData = {
        count: 8,
        date: '2025-01-14', // Yesterday (different from today)
        lastUpdated: Date.now()
      };
      localStorageMock.setItem(
        `reviewCount_test-user-12345_${today}`, // Today's key
        JSON.stringify(oldStorageData)
      );

      const { count, date } = ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      
      expect(count).toBe(0); // Should reset due to date mismatch
      expect(date).toBe(today); // Today
    });

    test('should allow full access after daily reset', () => {
      // Max out reviews for today
      for (let i = 0; i < 10; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }
      expect(ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free').canReview).toBe(false);
      
      // Move to next day
      jest.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      
      // Should have full access again
      const result = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      expect(result.canReview).toBe(true);
      expect(result.remainingCount).toBe(10);
    });

    test('should handle timezone changes correctly', () => {
      // Test with different time zones (UTC vs local time)
      jest.setSystemTime(new Date('2025-01-15T23:59:59Z')); // End of day UTC
      
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(1);
      
      // Move to next day UTC
      jest.setSystemTime(new Date('2025-01-16T00:00:01Z'));
      
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(0);
    });
  });

  // ============================================================================
  // Storage Error Handling Tests
  // ============================================================================

  describe('Storage Error Handling', () => {
    test('should handle localStorage read errors gracefully', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage read error');
      });

      const { count, date } = ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      
      expect(count).toBe(0);
      expect(date).toBe('2025-01-15');
      expect(console.error).toHaveBeenCalledWith(
        'Error reading review count from localStorage:',
        expect.any(Error)
      );
    });

    test('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json data');

      const { count, date } = ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      
      expect(count).toBe(0);
      expect(date).toBe('2025-01-15');
    });

    test('should handle localStorage write errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage write error');
      });

      // Should not throw error
      expect(() => {
        ReviewAccessControlService.incrementCount(TEST_USER_ID);
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Error saving review count to localStorage:',
        expect.any(Error)
      );
    });

    test('should handle missing localStorage gracefully', () => {
      // Mock localStorage as undefined (not supported)
      const originalLocalStorage = window.localStorage;
      delete (window as any).localStorage;

      // Should not crash
      expect(() => {
        ReviewAccessControlService.getTodayCount(TEST_USER_ID);
      }).not.toThrow();

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });
  });

  // ============================================================================
  // Utility Methods Tests
  // ============================================================================

  describe('Utility Methods', () => {
    test('should reset count for specific user', () => {
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(1);
      
      ReviewAccessControlService.resetCount(TEST_USER_ID);
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(0);
    });

    test('should clean up old storage entries', () => {
      // Set up old entries for different days
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      localStorageMock.setItem(`reviewCount_user1_${today}`, '{"count":1}');
      localStorageMock.setItem(`reviewCount_user1_${yesterday}`, '{"count":2}');
      localStorageMock.setItem(`reviewCount_user1_${twoDaysAgo}`, '{"count":3}');
      localStorageMock.setItem('other_key', 'other_value');
      
      expect(localStorageMock.length).toBe(4);
      
      ReviewAccessControlService.cleanupOldEntries();
      
      // Should remove entries older than yesterday but keep today's and yesterday's
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(`reviewCount_user1_${twoDaysAgo}`);
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(`reviewCount_user1_${today}`);
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(`reviewCount_user1_${yesterday}`);
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('other_key');
    });

    test('should handle cleanup errors gracefully', () => {
      // Mock the length property to simulate an error during iteration
      Object.defineProperty(localStorageMock, 'length', {
        get: () => {
          throw new Error('localStorage length error');
        },
        configurable: true
      });

      expect(() => {
        ReviewAccessControlService.cleanupOldEntries();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Error cleaning up old review count entries:',
        expect.any(Error)
      );
      
      // Restore normal length behavior
      Object.defineProperty(localStorageMock, 'length', {
        get: () => Object.keys(localStorageMock).length,
        configurable: true
      });
    });
  });

  // ============================================================================
  // Process Review Wrapper Tests
  // ============================================================================

  describe('Process Review Wrapper', () => {
    const mockProcessReview = jest.fn();
    const mockResult = { success: true, score: 85 };

    beforeEach(() => {
      mockProcessReview.mockReset();
      mockProcessReview.mockResolvedValue(mockResult);
    });

    test('should allow and process review for subscriber', async () => {
      const result = await ReviewAccessControlService.processReviewWithAccessControl(
        TEST_SUBSCRIBER_USER_ID,
        'monthly',
        mockProcessReview
      );

      expect(result).toEqual(mockResult);
      expect(mockProcessReview).toHaveBeenCalledTimes(1);
    });

    test('should allow and process review for free user under limit', async () => {
      const result = await ReviewAccessControlService.processReviewWithAccessControl(
        TEST_FREE_USER_ID,
        'free',
        mockProcessReview
      );

      expect(result).toEqual(mockResult);
      expect(mockProcessReview).toHaveBeenCalledTimes(1);
      
      // Should increment count after successful processing
      expect(ReviewAccessControlService.getTodayCount(TEST_FREE_USER_ID).count).toBe(1);
    });

    test('should deny processing for guest users', async () => {
      await expect(
        ReviewAccessControlService.processReviewWithAccessControl(
          null,
          'free',
          mockProcessReview
        )
      ).rejects.toThrow('Review access denied: authentication_required');

      expect(mockProcessReview).not.toHaveBeenCalled();
    });

    test('should deny processing when free user hits limit', async () => {
      // Max out the user's daily reviews
      for (let i = 0; i < 10; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }

      await expect(
        ReviewAccessControlService.processReviewWithAccessControl(
          TEST_FREE_USER_ID,
          'free',
          mockProcessReview
        )
      ).rejects.toThrow('Review access denied: daily_limit_reached');

      expect(mockProcessReview).not.toHaveBeenCalled();
    });

    test('should not increment count if processing fails', async () => {
      const processError = new Error('Processing failed');
      mockProcessReview.mockRejectedValueOnce(processError);

      await expect(
        ReviewAccessControlService.processReviewWithAccessControl(
          TEST_FREE_USER_ID,
          'free',
          mockProcessReview
        )
      ).rejects.toThrow('Processing failed');

      // Count should not be incremented due to failure
      expect(ReviewAccessControlService.getTodayCount(TEST_FREE_USER_ID).count).toBe(0);
    });

    test('should wrap function correctly with wrapProcessReview', async () => {
      const wrappedFunction = ReviewAccessControlService.wrapProcessReview(
        mockProcessReview,
        TEST_FREE_USER_ID,
        'free'
      );

      const result = await wrappedFunction('arg1', 'arg2');

      expect(result).toEqual(mockResult);
      expect(mockProcessReview).toHaveBeenCalledWith('arg1', 'arg2');
      expect(ReviewAccessControlService.getTodayCount(TEST_FREE_USER_ID).count).toBe(1);
    });
  });

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('Edge Cases and Integration', () => {
    test('should handle rapid successive calls correctly', async () => {
      // Simulate rapid review submissions
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          ReviewAccessControlService.processReviewWithAccessControl(
            TEST_FREE_USER_ID,
            'free',
            () => Promise.resolve({ success: true })
          )
        );
      }

      await Promise.all(promises);

      expect(ReviewAccessControlService.getTodayCount(TEST_FREE_USER_ID).count).toBe(5);
    });

    test('should handle default subscription tier correctly', () => {
      // Test with default 'free' tier (no tier specified)
      const result = ReviewAccessControlService.checkAccess(TEST_USER_ID);
      
      expect(result.canReview).toBe(true);
      expect(result.remainingCount).toBe(10);
    });

    test('should handle edge case with 0 remaining reviews display', () => {
      // Add 10 reviews to hit limit
      for (let i = 0; i < 10; i++) {
        ReviewAccessControlService.incrementCount(TEST_FREE_USER_ID);
      }

      const remaining = ReviewAccessControlService.getRemainingReviews(TEST_FREE_USER_ID, 'free');
      expect(remaining).toBe(0);
      
      const accessResult = ReviewAccessControlService.checkAccess(TEST_FREE_USER_ID, 'free');
      expect(accessResult.remainingCount).toBe(0);
      expect(accessResult.canReview).toBe(false);
    });

    test('should maintain separate counts across different dates', () => {
      // Add reviews on first day
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      
      // Verify first day count
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(2);
      
      // Move to next day and clear any conflicting storage
      jest.setSystemTime(new Date('2025-01-16T12:00:00Z'));
      
      // Clear any existing storage for the new date to avoid conflicts
      const newDate = new Date().toISOString().split('T')[0];
      localStorageMock.removeItem(`reviewCount_${TEST_USER_ID}_${newDate}`);
      
      // Add reviews on second day
      ReviewAccessControlService.incrementCount(TEST_USER_ID);
      
      // Check that today shows correct count for new day
      expect(ReviewAccessControlService.getTodayCount(TEST_USER_ID).count).toBe(1);
    });
  });
});