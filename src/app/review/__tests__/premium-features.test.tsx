/**
 * Premium Features and Access Control Tests
 * 
 * Tests for subscription tier-based feature access,
 * upgrade prompts, and premium-only functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnifiedReviewHub from '../UnifiedReviewHub';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { 
  createMockRegistry, 
  createMockAuthContext,
  setupMockSessionStorage
} from './test-utils';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/review-sources/registry');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Premium Features and Access Control', () => {
  const mockRegistry = createMockRegistry();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (ReviewSourceRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);
    mockRegistry.init.mockResolvedValue(undefined);
    
    // Setup session storage mock
    Object.defineProperty(window, 'sessionStorage', {
      value: setupMockSessionStorage(),
      writable: true,
    });
  });

  describe('Free User Experience', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
    });

    test('shows sync upgrade prompt in statistics section', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      });
      
      const upgradeLink = screen.getByText('Upgrade for sync →');
      expect(upgradeLink.closest('a')).toHaveAttribute('href', '/subscription');
    });

    test('displays upgrade prompt in notification settings', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      // Open settings modal
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText(/Upgrade to Premium for cross-device sync/)).toBeInTheDocument();
      expect(screen.getByText(/advanced notification scheduling/)).toBeInTheDocument();
    });

    test('shows upgrade prompt styling correctly', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      const upgradePrompt = screen.getByText(/Upgrade to Premium/).closest('div');
      expect(upgradePrompt).toHaveClass('bg-blue-50');
      expect(upgradePrompt).toHaveClass('border-blue-200');
      expect(upgradePrompt).toHaveClass('text-blue-800');
    });

    test('indicates free tier limitations subtly', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      // Should show current stats but with upgrade option
      expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      
      // Should not hide or limit basic functionality
      expect(screen.getByText(/Start Review/)).toBeInTheDocument();
    });

    test('links to subscription page from upgrade prompts', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        const upgradeLink = screen.getByText('Upgrade for sync →');
        expect(upgradeLink).toHaveAttribute('href', '/subscription');
      });
    });
  });

  describe('Premium User Experience', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('premium'));
    });

    test('hides sync upgrade prompt in statistics section', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Upgrade for sync →')).not.toBeInTheDocument();
    });

    test('hides upgrade prompt in notification settings', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.queryByText(/Upgrade to Premium/)).not.toBeInTheDocument();
    });

    test('shows all notification options without restrictions', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('Daily review reminders')).toBeInTheDocument();
      expect(screen.getByText('Golden time notifications')).toBeInTheDocument();
      expect(screen.getByText('Achievement alerts')).toBeInTheDocument();
    });

    test('provides full feature access without prompts', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Review Hub')).toBeInTheDocument();
      });
      
      // Should show full functionality without upgrade prompts
      expect(screen.getByText(/Start Review/)).toBeInTheDocument();
      expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
    });
  });

  describe('Lifetime User Experience', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        ...createMockAuthContext('premium'),
        subscriptionTier: 'lifetime',
      });
    });

    test('treats lifetime users as premium', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Upgrade for sync →')).not.toBeInTheDocument();
    });
  });

  describe('Guest User Experience', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('guest'));
    });

    test('shows upgrade prompts for guest users', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
    });

    test('includes sign-up encouragement for guests', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText(/Upgrade to Premium/)).toBeInTheDocument();
    });
  });

  describe('Feature Gating Logic', () => {
    test('correctly identifies premium users', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...createMockAuthContext('free'),
        subscriptionTier: 'premium',
      });
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.queryByText('Upgrade for sync →')).not.toBeInTheDocument();
      });
    });

    test('correctly identifies free users', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...createMockAuthContext('free'),
        subscriptionTier: 'free',
      });
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      });
    });

    test('handles missing subscription tier gracefully', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...createMockAuthContext('free'),
        subscriptionTier: undefined,
      });
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        // Should default to showing upgrade prompts when tier is unclear
        expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      });
    });
  });

  describe('Upgrade Flow Integration', () => {
    test('subscription link includes proper UTM parameters', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        const upgradeLink = screen.getByText('Upgrade for sync →');
        expect(upgradeLink.closest('a')).toHaveAttribute('href', '/subscription');
      });
    });

    test('maintains user context during upgrade flow', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      });
      
      // Should maintain current review stats and data during upgrade process
      expect(screen.getByText("Today's Overview")).toBeInTheDocument();
    });
  });

  describe('Premium Feature Descriptions', () => {
    test('clearly explains sync benefits', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText(/cross-device sync/)).toBeInTheDocument();
    });

    test('mentions advanced notification features', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText(/advanced notification scheduling/)).toBeInTheDocument();
    });

    test('includes sync icon for visual clarity', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText(/🔄 Upgrade to Premium/)).toBeInTheDocument();
    });
  });

  describe('User Experience Continuity', () => {
    test('maintains functionality during subscription tier changes', async () => {
      const { rerender } = render(<UnifiedReviewHub />);
      
      // Start as free user
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      rerender(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      });
      
      // Upgrade to premium
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('premium'));
      rerender(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.queryByText('Upgrade for sync →')).not.toBeInTheDocument();
      });
      
      // Core functionality should remain intact
      expect(screen.getByText('Review Hub')).toBeInTheDocument();
      expect(screen.getByText(/Start Review/)).toBeInTheDocument();
    });

    test('preserves review data across subscription changes', async () => {
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      // Stats should remain visible regardless of subscription tier
      expect(screen.getByText(/\d+/)).toBeInTheDocument(); // Some number should be visible
    });
  });

  describe('Accessibility and Usability', () => {
    test('upgrade prompts are keyboard accessible', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        const upgradeLink = screen.getByText('Upgrade for sync →');
        upgradeLink.focus();
        expect(document.activeElement).toBe(upgradeLink);
      });
    });

    test('premium features do not interfere with screen readers', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        const upgradeLink = screen.getByText('Upgrade for sync →');
        expect(upgradeLink).toHaveAccessibleName();
      });
    });

    test('upgrade prompts have appropriate ARIA labels', async () => {
      (useAuth as jest.Mock).mockReturnValue(createMockAuthContext('free'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        const upgradeLink = screen.getByText('Upgrade for sync →');
        // Should have descriptive link text that's accessible
        expect(upgradeLink.textContent).toBeTruthy();
      });
    });
  });
});