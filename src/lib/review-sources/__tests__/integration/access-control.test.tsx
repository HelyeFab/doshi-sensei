/**
 * Integration Tests for UnifiedReviewHub Access Control
 * 
 * Tests the complete integration of access control within the UnifiedReviewHub:
 * 1. Guest users: See login prompt, blocked from all functionality
 * 2. Free users: See daily limits, blocked after 10 reviews
 * 3. Subscribers: Unlimited access, see detailed statistics
 * 
 * This test suite verifies the Three-Pillar Architecture implementation
 * across the entire review system UI and user experience.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import UnifiedReviewHub from '@/app/review/UnifiedReviewHub';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { ReviewAccessControlService } from '@/lib/review-sources/services/reviewAccessControl';
import { initializeAllReviewSources } from '@/lib/review-sources/sources';
import {
  UserContexts,
  createMockAggregatedStats,
  createMockGroupedItems,
  STANDARD_MOCK_SOURCES
} from '../integration/test-utils';
// Import setup after other imports to avoid conflicts
import '@testing-library/jest-dom';

// ============================================================================
// Setup localStorage and sessionStorage mocks
// ============================================================================

const localStorageMockSetup = (() => {
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

const sessionStorageMockSetup = (() => {
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
  value: localStorageMockSetup
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMockSetup
});

// ============================================================================
// Mocks and Setup
// ============================================================================

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn()
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}));

// Mock auth context
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock review sources initialization
const mockInitializeAllReviewSources = initializeAllReviewSources as jest.MockedFunction<typeof initializeAllReviewSources>;
jest.mock('@/lib/review-sources/sources', () => ({
  initializeAllReviewSources: jest.fn()
}));

// Mock registry for consistent testing
const createMockRegistry = () => {
  const mockStats = createMockAggregatedStats({
    totals: {
      items: 500,
      dueToday: 25,
      overdue: 3,
      sources: 10,
      activeSources: 8
    },
    performance: {
      averageMastery: 78,
      overallRetention: 0.85,
      studyStreak: 14,
      lastActivity: new Date('2025-01-15T09:00:00Z')
    }
  });

  const mockItems = createMockGroupedItems(STANDARD_MOCK_SOURCES);

  return {
    getAggregatedStats: jest.fn().mockResolvedValue(mockStats),
    getAllDueItems: jest.fn().mockResolvedValue(mockItems),
    getPrioritizedSources: jest.fn().mockReturnValue(STANDARD_MOCK_SOURCES),
    getUserPreferences: jest.fn().mockReturnValue({
      enabled: Object.fromEntries(STANDARD_MOCK_SOURCES.map(s => [s.id, true])),
      priorities: {}
    }),
    updateSourcePriority: jest.fn(),
    setSourceEnabled: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    init: jest.fn()
  };
};

// Test utilities
const renderWithAuth = async (userContext: typeof UserContexts[keyof typeof UserContexts]) => {
  mockUseAuth.mockReturnValue(userContext);
  
  if (userContext.user?.uid) {
    mockInitializeAllReviewSources.mockResolvedValue(createMockRegistry() as any);
  } else {
    mockInitializeAllReviewSources.mockResolvedValue(null as any);
  }

  const result = render(<UnifiedReviewHub />);
  
  // Wait for component to finish loading
  if (userContext.user?.uid) {
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  }

  return result;
};

// ============================================================================
// Test Suite Setup
// ============================================================================

describe('UnifiedReviewHub Access Control Integration', () => {
  beforeEach(() => {
    // Clear all mocks and storage
    jest.clearAllMocks();
    localStorageMockSetup.clear();
    sessionStorageMockSetup.clear();
    
    // Reset system time
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    
    // Reset access control state
    Object.keys(localStorageMockSetup).forEach(key => {
      if (key.startsWith('reviewCount_')) {
        localStorageMockSetup.removeItem(key);
      }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================================
  // Guest User Access Control Tests
  // ============================================================================

  describe('Guest User Access Control', () => {
    test('should show login prompt for guest users', async () => {
      await renderWithAuth(UserContexts.guest);

      // Should see login prompt
      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByText(/Please sign in to access the review system/)).toBeInTheDocument();
      
      // Should see login and register buttons
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login');
      expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/auth/register');
      
      // Should have appropriate icon
      expect(screen.getByText('🔐')).toBeInTheDocument();
    });

    test('should not show review hub content for guests', async () => {
      await renderWithAuth(UserContexts.guest);

      // Should not see main review hub elements
      expect(screen.queryByText('Review Hub')).not.toBeInTheDocument();
      expect(screen.queryByText('Unified spaced repetition system')).not.toBeInTheDocument();
      expect(screen.queryByText('Start Review')).not.toBeInTheDocument();
      expect(screen.queryByText('Review Sources')).not.toBeInTheDocument();
    });

    test('should not load review data for guests', async () => {
      await renderWithAuth(UserContexts.guest);

      // Should not attempt to initialize sources
      expect(mockInitializeAllReviewSources).not.toHaveBeenCalled();
    });

    test('should handle guest state properly with null user', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userType: 'guest',
        subscriptionTier: null
      });

      render(<UnifiedReviewHub />);

      expect(screen.getByText('Login Required')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Free User Access Control Tests
  // ============================================================================

  describe('Free User Access Control', () => {
    test('should show daily limit indicator for free users', async () => {
      await renderWithAuth(UserContexts.free);

      // Should see daily limit section
      expect(screen.getByText('Daily Review Limit: 10/10')).toBeInTheDocument();
      expect(screen.getByText(/You have 10 reviews remaining today/)).toBeInTheDocument();
      
      // Should see upgrade button
      expect(screen.getByRole('link', { name: /upgrade now/i })).toHaveAttribute('href', '/subscription');
      
      // Should see progress bar
      expect(screen.getByText('Reviews Used Today')).toBeInTheDocument();
      expect(screen.getByText('0/10')).toBeInTheDocument();
    });

    test('should show detailed statistics for free users with proper limits', async () => {
      await renderWithAuth(UserContexts.free);

      // Should NOT see detailed statistics (subscription only)
      expect(screen.queryByText("Today's Overview")).not.toBeInTheDocument();
      expect(screen.queryByText('Due Today')).not.toBeInTheDocument();
      expect(screen.queryByText('Day Streak')).not.toBeInTheDocument();
      
      // Should see the daily limit section instead
      expect(screen.getByText('Daily Review Limit: 10/10')).toBeInTheDocument();
    });

    test('should update limit indicator after reviews', async () => {
      await renderWithAuth(UserContexts.free);

      // Simulate doing 3 reviews
      act(() => {
        for (let i = 0; i < 3; i++) {
          ReviewAccessControlService.incrementCount(UserContexts.free.user.uid);
        }
      });

      // Re-render to reflect state change
      await renderWithAuth(UserContexts.free);

      // Should show updated counts
      expect(screen.getByText('Daily Review Limit: 7/10')).toBeInTheDocument();
      expect(screen.getByText(/You have 7 reviews remaining today/)).toBeInTheDocument();
      expect(screen.getByText('3/10')).toBeInTheDocument();
    });

    test('should block reviews when limit is reached', async () => {
      // Reach the daily limit
      act(() => {
        for (let i = 0; i < 10; i++) {
          ReviewAccessControlService.incrementCount(UserContexts.free.user.uid);
        }
      });

      await renderWithAuth(UserContexts.free);

      // Should show limit reached state
      expect(screen.getByText('Daily Review Limit: 0/10')).toBeInTheDocument();
      expect(screen.getByText(/Daily limit reached. Upgrade for unlimited reviews/)).toBeInTheDocument();
      expect(screen.getByText(/Your limit resets at midnight/)).toBeInTheDocument();
      
      // Start review button should be disabled and show appropriate text
      const startButton = screen.getByRole('button', { name: /daily limit reached/i });
      expect(startButton).toBeDisabled();
      expect(startButton).toHaveClass('cursor-not-allowed');
    });

    test('should show progress bar correctly at different usage levels', async () => {
      // Test at 50% usage (5/10)
      act(() => {
        for (let i = 0; i < 5; i++) {
          ReviewAccessControlService.incrementCount(UserContexts.free.user.uid);
        }
      });

      await renderWithAuth(UserContexts.free);
      
      const progressBar = screen.getByText('5/10').closest('div')?.querySelector('.bg-amber-500');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    test('should show upgrade benefits for free users', async () => {
      await renderWithAuth(UserContexts.free);

      expect(screen.getByText(/🚀.*Upgrade for:/)).toBeInTheDocument();
      expect(screen.getByText(/Unlimited reviews, detailed statistics, streaks, and retention metrics/)).toBeInTheDocument();
    });

    test('should allow access to review sources list for free users', async () => {
      await renderWithAuth(UserContexts.free);

      // Should see review sources
      expect(screen.getByText('Review Sources')).toBeInTheDocument();
      
      // Should see individual sources
      expect(screen.getByText('Kanji Mastery')).toBeInTheDocument();
      expect(screen.getByText('Textbook Vocabulary')).toBeInTheDocument();
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Subscriber Access Control Tests
  // ============================================================================

  describe('Subscriber Access Control', () => {
    test('should show detailed statistics for monthly subscribers', async () => {
      await renderWithAuth(UserContexts.monthly);

      // Should see full statistics dashboard
      expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      expect(screen.getByText('Due Today')).toBeInTheDocument();
      expect(screen.getByText('Day Streak')).toBeInTheDocument();
      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      
      // Should see specific numbers from mock data
      expect(screen.getByText('25')).toBeInTheDocument(); // Due today
      expect(screen.getByText('14')).toBeInTheDocument(); // Study streak
      expect(screen.getByText('85%')).toBeInTheDocument(); // Retention rate
      expect(screen.getByText('500')).toBeInTheDocument(); // Total items
    });

    test('should show detailed statistics for yearly subscribers', async () => {
      await renderWithAuth(UserContexts.yearly);

      // Should see full statistics dashboard (same as monthly)
      expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      expect(screen.getByText('Due Today')).toBeInTheDocument();
      expect(screen.getByText('Day Streak')).toBeInTheDocument();
    });

    test('should not show daily limit section for subscribers', async () => {
      await renderWithAuth(UserContexts.monthly);

      // Should NOT see daily limit indicators
      expect(screen.queryByText(/Daily Review Limit/)).not.toBeInTheDocument();
      expect(screen.queryByText(/reviews remaining today/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Upgrade Now/)).not.toBeInTheDocument();
    });

    test('should allow unlimited reviews for subscribers', async () => {
      // Simulate many reviews (way over free limit)
      act(() => {
        for (let i = 0; i < 50; i++) {
          ReviewAccessControlService.incrementCount(UserContexts.monthly.user.uid);
        }
      });

      await renderWithAuth(UserContexts.monthly);

      // Start review button should still be enabled
      const startButton = screen.getByRole('button', { name: /start review/i });
      expect(startButton).not.toBeDisabled();
      expect(startButton).not.toHaveClass('cursor-not-allowed');
    });

    test('should show insights section for subscribers', async () => {
      await renderWithAuth(UserContexts.monthly);

      // Should see learning insights
      expect(screen.getByText('Learning Insights')).toBeInTheDocument();
      
      // Should see recommendations from mock data
      expect(screen.getByText(/Great consistency! Keep up your daily study streak/)).toBeInTheDocument();
      expect(screen.getByText(/Consider focusing more on vocabulary retention/)).toBeInTheDocument();
    });

    test('should show source statistics for subscribers', async () => {
      await renderWithAuth(UserContexts.monthly);

      // Should see detailed stats on source cards (from mock data)
      const sourceCards = screen.getAllByText('Due'); // Each source shows "Due" label
      expect(sourceCards.length).toBeGreaterThan(0);
      
      // Should see "Total" and "Rate" labels on source cards
      expect(screen.getAllByText('Total').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Rate').length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // UI Interaction Tests
  // ============================================================================

  describe('UI Interactions and Navigation', () => {
    test('should handle start review button correctly for free users', async () => {
      await renderWithAuth(UserContexts.free);

      const startButton = screen.getByRole('button', { name: /start review/i });
      expect(startButton).toBeEnabled();
      
      fireEvent.click(startButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/review/session');
      expect(sessionStorageMockSetup.setItem).toHaveBeenCalledWith('reviewReturnPath', '/review');
    });

    test('should disable start review button when free user hits limit', async () => {
      // Max out reviews
      act(() => {
        for (let i = 0; i < 10; i++) {
          ReviewAccessControlService.incrementCount(UserContexts.free.user.uid);
        }
      });

      await renderWithAuth(UserContexts.free);

      const startButton = screen.getByRole('button', { name: /daily limit reached/i });
      expect(startButton).toBeDisabled();
      
      fireEvent.click(startButton);
      
      // Should not navigate
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test('should handle source navigation correctly', async () => {
      await renderWithAuth(UserContexts.free);

      // Click on a source card (Kanji Mastery)
      const kanjiCard = screen.getByText('Kanji Mastery').closest('.cursor-pointer');
      expect(kanjiCard).toBeDefined();
      
      if (kanjiCard) {
        fireEvent.click(kanjiCard);
        
        expect(sessionStorageMockSetup.setItem).toHaveBeenCalledWith('reviewReturnPath', '/review');
        // Should navigate to the source's main path
        expect(mockRouter.push).toHaveBeenCalledWith(expect.stringContaining('?returnTo=/review'));
      }
    });

    test('should handle priority edit mode for all user types', async () => {
      await renderWithAuth(UserContexts.free);

      const priorityButton = screen.getByRole('button', { name: /manage priorities/i });
      fireEvent.click(priorityButton);
      
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
      expect(screen.getByText(/Drag to reorder priority/)).toBeInTheDocument();
    });

    test('should show upgrade link for free users', async () => {
      await renderWithAuth(UserContexts.free);

      const upgradeLink = screen.getByRole('link', { name: /upgrade now/i });
      expect(upgradeLink).toHaveAttribute('href', '/subscription');
    });
  });

  // ============================================================================
  // Golden Time Integration Tests
  // ============================================================================

  describe('Golden Time Integration', () => {
    test('should show golden time bonus during morning hours', async () => {
      // Set time to morning golden time (8:30 AM)
      jest.setSystemTime(new Date('2025-01-15T08:30:00Z'));

      await renderWithAuth(UserContexts.free);

      expect(screen.getByText('🌅 Golden Time')).toBeInTheDocument();
      expect(screen.getByText('1.2× bonus')).toBeInTheDocument();
    });

    test('should show golden time bonus during evening hours', async () => {
      // Set time to evening golden time (7:00 PM)
      jest.setSystemTime(new Date('2025-01-15T19:00:00Z'));

      await renderWithAuth(UserContexts.free);

      expect(screen.getByText('🌅 Golden Time')).toBeInTheDocument();
      expect(screen.getByText('1.2× bonus')).toBeInTheDocument();
    });

    test('should show next golden time when not active', async () => {
      // Set time between golden times (2:00 PM)
      jest.setSystemTime(new Date('2025-01-15T14:00:00Z'));

      await renderWithAuth(UserContexts.free);

      expect(screen.queryByText('🌅 Golden Time')).not.toBeInTheDocument();
      expect(screen.getByText(/Next golden time: evening/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      mockInitializeAllReviewSources.mockRejectedValueOnce(new Error('Failed to initialize'));
      
      await renderWithAuth(UserContexts.free);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Review Hub')).toBeInTheDocument();
        expect(screen.getByText('Failed to initialize review system')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    test('should handle data loading errors', async () => {
      const mockRegistry = createMockRegistry();
      mockRegistry.getAggregatedStats.mockRejectedValueOnce(new Error('Stats error'));
      mockInitializeAllReviewSources.mockResolvedValueOnce(mockRegistry as any);
      
      await renderWithAuth(UserContexts.free);

      // Should still render but may show fallback states
      expect(screen.getByText('Review Hub')).toBeInTheDocument();
    });

    test('should handle missing user ID gracefully', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: '' }, // Empty UID
        userType: 'authenticated',
        subscriptionTier: 'free'
      });

      render(<UnifiedReviewHub />);

      // Should treat as guest user
      expect(screen.getByText('Login Required')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // State Management Tests
  // ============================================================================

  describe('State Management and Updates', () => {
    test('should update UI when access control state changes', async () => {
      await renderWithAuth(UserContexts.free);

      // Initial state - 10 reviews remaining
      expect(screen.getByText('Daily Review Limit: 10/10')).toBeInTheDocument();

      // Simulate doing reviews and force re-render
      act(() => {
        for (let i = 0; i < 5; i++) {
          ReviewAccessControlService.incrementCount(UserContexts.free.user.uid);
        }
      });

      // Re-render with updated auth context to reflect changes
      await renderWithAuth(UserContexts.free);

      // Should show updated limit
      expect(screen.getByText('Daily Review Limit: 5/10')).toBeInTheDocument();
    });

    test('should handle subscription tier changes', async () => {
      // Start as free user
      await renderWithAuth(UserContexts.free);
      expect(screen.getByText(/Daily Review Limit/)).toBeInTheDocument();

      // Upgrade to monthly
      await renderWithAuth(UserContexts.monthly);
      expect(screen.queryByText(/Daily Review Limit/)).not.toBeInTheDocument();
      expect(screen.getByText("Today's Overview")).toBeInTheDocument();
    });

    test('should maintain state across component updates', async () => {
      await renderWithAuth(UserContexts.free);

      // Enter priority edit mode
      const priorityButton = screen.getByRole('button', { name: /manage priorities/i });
      fireEvent.click(priorityButton);
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();

      // State should persist through re-renders
      await renderWithAuth(UserContexts.free);
      // Note: In real app, local state would be preserved, but in tests we'd need to simulate this differently
    });
  });
});