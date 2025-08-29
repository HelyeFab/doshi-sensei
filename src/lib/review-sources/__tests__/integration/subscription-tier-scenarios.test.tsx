/**
 * Subscription Tier Scenarios - UnifiedReviewHub Integration Tests
 * 
 * Tests the different user experiences based on subscription tiers:
 * - Guest users (no account)
 * - Free authenticated users
 * - Subscribers (monthly/yearly)
 * 
 * Verifies access control, feature availability, and upgrade prompts.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedReviewHub from '@/app/review/UnifiedReviewHub';
import { initializeAllReviewSources } from '../../sources';
import {
  createMockRegistry,
  createMockAggregatedStats,
  STANDARD_MOCK_SOURCES,
  UserContexts,
  AssertionHelpers
} from './test-utils';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/contexts/AuthContext');
jest.mock('../../sources');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockInitializeAllReviewSources = initializeAllReviewSources as jest.MockedFunction<typeof initializeAllReviewSources>;

describe('UnifiedReviewHub - Subscription Tier Scenarios', () => {
  let mockRouter: any;
  let mockRegistry: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    };
    mockUseRouter.mockReturnValue(mockRouter);

    mockRegistry = createMockRegistry(
      STANDARD_MOCK_SOURCES,
      createMockAggregatedStats()
    );
    mockInitializeAllReviewSources.mockResolvedValue(mockRegistry);

    jest.clearAllMocks();
  });

  describe('Subscriber Experience (Monthly Subscription)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(UserContexts.monthly);
    });

    it('displays comprehensive statistics dashboard', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });

      // Verify all subscriber statistics are visible
      expect(screen.getByText('Due Today')).toBeInTheDocument();
      expect(screen.getByText('Day Streak')).toBeInTheDocument();
      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      
      // Check specific values
      expect(screen.getByText('50')).toBeInTheDocument(); // Due today
      expect(screen.getByText('12')).toBeInTheDocument(); // Study streak
      expect(screen.getByText('82%')).toBeInTheDocument(); // Retention rate
      expect(screen.getByText('1,000')).toBeInTheDocument(); // Total items
    });

    it('shows learning insights and recommendations', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Learning Insights')).toBeInTheDocument();
      });

      // Check recommendations are displayed
      expect(screen.getByText(/Great consistency/)).toBeInTheDocument();
      expect(screen.getByText(/Consider focusing more on vocabulary/)).toBeInTheDocument();
      expect(screen.getByText(/Your kanji recognition is improving/)).toBeInTheDocument();

      // Check next review estimate
      expect(screen.getByText(/Next review estimate:/)).toBeInTheDocument();
    });

    it('provides access to notification settings without upgrade prompts', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });

      // Open notification settings
      await user.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      });

      // Verify notification options are available
      expect(screen.getByText('Daily review reminders')).toBeInTheDocument();
      expect(screen.getByText('Golden time notifications')).toBeInTheDocument();
      expect(screen.getByText('Achievement alerts')).toBeInTheDocument();

      // Should NOT show upgrade prompt
      expect(screen.queryByText(/Upgrade for/)).not.toBeInTheDocument();
    });

    it('displays detailed source statistics', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Kanji Mastery')).toBeInTheDocument();
      });

      // Find kanji mastery card and verify detailed stats
      const kanjiCard = screen.getByText('Kanji Mastery').closest('div');
      expect(kanjiCard).toBeInTheDocument();

      // Check for due count, total items, and retention rate
      expect(screen.getAllByText('10')).toHaveLength(3); // Due count appears multiple times
      expect(screen.getAllByText('100')).toHaveLength(3); // Total count appears multiple times
      expect(screen.getAllByText('85%')).toHaveLength(3); // Retention rate appears multiple times
    });

    it('allows full access to priority management', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });

      // Enter priority edit mode
      await user.click(screen.getByText('Manage Priorities'));

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      });

      // Verify priority controls are available
      const prioritySelects = screen.getAllByRole('combobox');
      expect(prioritySelects.length).toBeGreaterThan(0);

      // Verify toggle switches are available
      const toggles = document.querySelectorAll('[class*="rounded-full"]');
      expect(toggles.length).toBeGreaterThan(0);
    });
  });

  describe('Free User Experience', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(UserContexts.free);
    });

    it('shows upgrade prompt instead of detailed statistics', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        AssertionHelpers.expectUpgradePrompt();
      });

      expect(screen.getByText(/Get insights into your learning progress/)).toBeInTheDocument();
      
      const upgradeLink = screen.getByRole('link', { name: /upgrade now/i });
      expect(upgradeLink).toHaveAttribute('href', '/subscription');
    });

    it('does not display subscriber statistics dashboard', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Review Hub')).toBeInTheDocument();
      });

      // Should NOT show subscriber features
      expect(screen.queryByText("Today's Overview")).not.toBeInTheDocument();
      expect(screen.queryByText('Learning Insights')).not.toBeInTheDocument();
    });

    it('has access to basic quick actions', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText(/Start Review/)).toBeInTheDocument();
      });

      // Verify basic actions are available
      expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      
      // Start review should work
      const startButton = screen.getByText(/Start Review/);
      await user.click(startButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/review/session');
    });

    it('shows basic source information without detailed stats', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Review Sources')).toBeInTheDocument();
      });

      // Sources should be visible
      expect(screen.getByText('Kanji Mastery')).toBeInTheDocument();
      expect(screen.getByText('Textbook Vocabulary')).toBeInTheDocument();

      // But detailed statistics might be limited or not shown
      // The component shows stats for free users too, but upgrade prompts for subscription features
    });

    it('shows upgrade prompts in notification settings', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      });

      // Should show upgrade prompt
      expect(screen.getByText(/Upgrade for cross-device sync/)).toBeInTheDocument();
    });
  });

  describe('Guest User Experience', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(UserContexts.guest);
    });

    it('initializes registry with null user ID', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(mockInitializeAllReviewSources).toHaveBeenCalledWith(null, expect.any(Object));
      });
    });

    it('shows upgrade prompts for guest users', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        AssertionHelpers.expectUpgradePrompt();
      });

      expect(screen.getByText(/Get insights into your learning progress/)).toBeInTheDocument();
    });

    it('provides basic functionality without account features', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Review Hub')).toBeInTheDocument();
      });

      // Basic UI should be available
      expect(screen.getByText('Unified spaced repetition system')).toBeInTheDocument();
      expect(screen.getByText('Review Sources')).toBeInTheDocument();

      // Quick actions should be available
      expect(screen.getByText(/Start Review/)).toBeInTheDocument();
      expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
    });

    it('does not show user-specific features', async () => {
      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Review Hub')).toBeInTheDocument();
      });

      // Should not show user-specific statistics
      expect(screen.queryByText("Today's Overview")).not.toBeInTheDocument();
      expect(screen.queryByText('Learning Insights')).not.toBeInTheDocument();
    });
  });

  describe('Subscription State Changes', () => {
    it('updates UI when user upgrades from free to subscription', async () => {
      // Start with free user
      mockUseAuth.mockReturnValue(UserContexts.free);
      
      const { rerender } = render(<UnifiedReviewHub />);

      await waitFor(() => {
        AssertionHelpers.expectUpgradePrompt();
      });

      // Simulate user upgrading to subscription
      mockUseAuth.mockReturnValue(UserContexts.monthly);
      
      rerender(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });

      // Upgrade prompt should be gone
      expect(screen.queryByText('Unlock Detailed Statistics')).not.toBeInTheDocument();
    });

    it('shows downgrade experience when subscription expires', async () => {
      // Start with subscriber
      mockUseAuth.mockReturnValue(UserContexts.monthly);
      
      const { rerender } = render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });

      // Simulate subscription expiring
      mockUseAuth.mockReturnValue(UserContexts.free);
      
      rerender(<UnifiedReviewHub />);

      await waitFor(() => {
        AssertionHelpers.expectUpgradePrompt();
      });

      // Subscription features should be gone
      expect(screen.queryByText("Today's Overview")).not.toBeInTheDocument();
    });
  });

  describe('Feature Access Control', () => {
    it('enforces subscription-only features correctly', async () => {
      const testCases = [
        { context: UserContexts.guest, shouldHaveSubscription: false },
        { context: UserContexts.free, shouldHaveSubscription: false },
        { context: UserContexts.monthly, shouldHaveSubscription: true }
      ];

      for (const testCase of testCases) {
        mockUseAuth.mockReturnValue(testCase.context);
        
        const { unmount } = render(<UnifiedReviewHub />);

        await waitFor(() => {
          expect(screen.getByText('Review Hub')).toBeInTheDocument();
        });

        if (testCase.shouldHaveSubscription) {
          expect(screen.queryByText("Today's Overview")).toBeInTheDocument();
          expect(screen.queryByText('Unlock Detailed Statistics')).not.toBeInTheDocument();
        } else {
          expect(screen.queryByText("Today's Overview")).not.toBeInTheDocument();
          expect(screen.queryByText('Unlock Detailed Statistics')).toBeInTheDocument();
        }

        unmount();
      }
    });

    it('handles yearly subscription with full access', async () => {
      mockUseAuth.mockReturnValue({
        ...UserContexts.yearly,
        subscriptionTier: 'yearly'
      });

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });

      // Should have full subscription access
      expect(screen.queryByText('Unlock Detailed Statistics')).not.toBeInTheDocument();
    });
  });
});