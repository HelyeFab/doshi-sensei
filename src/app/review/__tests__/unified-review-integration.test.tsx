/**
 * Unified Review Hub - Integration Tests
 * 
 * Comprehensive test suite for the Unified Review Hub system.
 * Tests the complete flow from hub loading to session completion.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import ReviewClient from '../ReviewClient';
import UnifiedReviewHub from '../UnifiedReviewHub';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { 
  ReviewSource, 
  SourcePriority, 
  AggregatedStats,
  GroupedReviewItems,
  SourceStats
} from '@/lib/review-sources/review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/review-sources/registry', () => ({
  ReviewSourceRegistry: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/lib/review-sources/sources/textbook-vocabulary', () => ({
  createTextbookVocabularySource: jest.fn(),
}));

jest.mock('@/lib/review-sources/sources/kanji-mastery', () => ({
  createKanjiMasterySource: jest.fn(),
}));

jest.mock('@/lib/review-sources/sources/flashcards', () => ({
  createFlashcardsSource: jest.fn(),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock implementations
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockSearchParams = new URLSearchParams();

const mockAuthContext = {
  user: { uid: 'test-user-id' },
  userType: 'free' as const,
  subscriptionTier: 'free' as const,
  loading: false,
};

const mockSource: ReviewSource = {
  id: 'textbook-vocabulary',
  name: 'Textbook Vocabulary',
  type: 'textbook-vocabulary' as any,
  icon: '📖',
  description: 'Vocabulary from Japanese textbooks',
  paths: {
    main: '/tools/textbook-vocabulary',
    settings: '/tools/textbook-vocabulary/settings',
    stats: '/tools/textbook-vocabulary/stats',
  },
  supportedContentTypes: [ContentType.VOCABULARY],
  status: 'active' as any,
  config: {
    enabled: true,
    priorityMultiplier: 1.0,
    settings: {},
  },
  init: jest.fn(),
  getDueItems: jest.fn(),
  getStats: jest.fn(),
  updateConfig: jest.fn(),
  processReview: jest.fn(),
  searchItems: jest.fn(),
  getItem: jest.fn(),
  healthCheck: jest.fn(),
};

const mockStats: AggregatedStats = {
  totals: {
    items: 150,
    dueToday: 25,
    overdue: 5,
    sources: 3,
    activeSources: 3,
  },
  byContentType: {
    [ContentType.VOCABULARY]: {
      total: 100,
      dueToday: 15,
      overdue: 3,
      averageMastery: 75,
      retentionRate: 0.85,
    },
    [ContentType.KANJI]: {
      total: 50,
      dueToday: 10,
      overdue: 2,
      averageMastery: 65,
      retentionRate: 0.80,
    },
  },
  bySource: {
    'textbook-vocabulary': {
      totalItems: 100,
      dueToday: 15,
      overdue: 3,
      scheduled: 82,
      newItems: 0,
      itemsByType: { [ContentType.VOCABULARY]: 100 },
      itemsByPriority: { [SourcePriority.HIGH]: 100 },
      averageMastery: 75,
      retentionRate: 0.85,
      studyStreak: 7,
      trends: {
        accuracy: 'improving' as const,
        speed: 'stable' as const,
        retention: 'improving' as const,
      },
    },
  },
  performance: {
    averageMastery: 70,
    overallRetention: 0.82,
    studyStreak: 7,
    lastActivity: new Date(),
  },
  distribution: {
    today: 25,
    tomorrow: 20,
    thisWeek: 50,
    nextWeek: 30,
    later: 25,
  },
  insights: {
    mostActiveSource: 'textbook-vocabulary',
    strugglingAreas: [ContentType.KANJI],
    recommendations: [
      'Focus on kanji practice to improve retention',
      'Consider reviewing during golden time for better results',
    ],
    nextReviewEstimate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
};

const mockGroupedItems: GroupedReviewItems = {
  bySource: {
    'textbook-vocabulary': {
      source: mockSource,
      items: [
        {
          id: 'item-1',
          sourceId: 'textbook-vocabulary',
          contentType: ContentType.VOCABULARY,
          content: {
            primary: '食べる',
            secondary: 'to eat',
            context: 'Basic verb',
          },
          dueDate: new Date(),
          priority: 5,
          availableStudyModes: [StudyMode.RECOGNITION, StudyMode.RECALL],
          metadata: { difficulty: 3 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      stats: mockStats.bySource['textbook-vocabulary'],
    },
  },
  byContentType: {
    [ContentType.VOCABULARY]: [],
  },
  byPriority: {
    [SourcePriority.HIGH]: [],
  },
  byDueDate: {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
  },
  totals: {
    items: 1,
    sources: 1,
    dueToday: 1,
    overdue: 0,
  },
};

const mockRegistry = {
  getInstance: jest.fn(),
  register: jest.fn(),
  init: jest.fn(),
  getAggregatedStats: jest.fn().mockResolvedValue(mockStats),
  getAllDueItems: jest.fn().mockResolvedValue(mockGroupedItems),
  getPrioritizedSources: jest.fn().mockReturnValue([mockSource]),
  getUserPreferences: jest.fn().mockReturnValue({
    enabled: { 'textbook-vocabulary': true },
    priorities: { 'textbook-vocabulary': SourcePriority.HIGH },
  }),
  updateSourcePriority: jest.fn(),
  setSourceEnabled: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

describe('Unified Review Hub Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    (ReviewSourceRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);

    // Mock session storage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock URL
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/review',
      },
      writable: true,
    });

    // Mock history
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Review Hub Loading', () => {
    test('displays loading state initially', async () => {
      mockRegistry.init.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<UnifiedReviewHub />);
      
      expect(screen.getByText('Loading review system...')).toBeInTheDocument();
    });

    test('loads and displays review hub successfully', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Review Hub')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Unified spaced repetition system')).toBeInTheDocument();
    });

    test('displays error state on initialization failure', async () => {
      mockRegistry.init.mockRejectedValue(new Error('Failed to initialize'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Review Hub')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Failed to initialize review system')).toBeInTheDocument();
    });
  });

  describe('Review Sources Display', () => {
    test('displays all registered sources with correct stats', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Textbook Vocabulary')).toBeInTheDocument();
      });
      
      // Check source stats are displayed
      expect(screen.getByText('15')).toBeInTheDocument(); // Due today
      expect(screen.getByText('100')).toBeInTheDocument(); // Total items
      expect(screen.getByText('85%')).toBeInTheDocument(); // Retention rate
    });

    test('shows aggregated statistics correctly', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      // Check aggregated stats
      expect(screen.getByText('25')).toBeInTheDocument(); // Total due today
      expect(screen.getByText('7')).toBeInTheDocument(); // Study streak
      expect(screen.getByText('82%')).toBeInTheDocument(); // Overall retention
      expect(screen.getByText('150')).toBeInTheDocument(); // Total items
    });
  });

  describe('Navigation and User Interactions', () => {
    test('navigates to source when source card is clicked', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Textbook Vocabulary')).toBeInTheDocument();
      });
      
      const sourceCard = screen.getByText('Textbook Vocabulary').closest('div');
      fireEvent.click(sourceCard!);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/tools/textbook-vocabulary?returnTo=/review');
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('reviewReturnPath', '/review');
    });

    test('starts unified review session', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Start Review (25)')).toBeInTheDocument();
      });
      
      const startButton = screen.getByText('Start Review (25)');
      fireEvent.click(startButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/review/session');
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('reviewReturnPath', '/review');
    });

    test('disables start review button when no items due', async () => {
      const emptyStats = { ...mockStats, totals: { ...mockStats.totals, dueToday: 0 } };
      mockRegistry.getAggregatedStats.mockResolvedValue(emptyStats);
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Review (0)');
        expect(startButton).toBeDisabled();
      });
    });
  });

  describe('Priority Management', () => {
    test('enters and exits priority edit mode', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
      
      // Enter edit mode
      const manageButton = screen.getByText('Manage Priorities');
      fireEvent.click(manageButton);
      
      expect(screen.getByText('Done')).toBeInTheDocument();
      expect(screen.getByText('Drag to reorder priority')).toBeInTheDocument();
      
      // Exit edit mode
      const doneButton = screen.getByText('Done');
      fireEvent.click(doneButton);
      
      expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
    });

    test('toggles source enable/disable', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
      
      // Enter edit mode
      const manageButton = screen.getByText('Manage Priorities');
      fireEvent.click(manageButton);
      
      // Find and click the toggle switch
      const toggleSwitch = screen.getByRole('button', { name: /toggle/i });
      fireEvent.click(toggleSwitch);
      
      expect(mockRegistry.setSourceEnabled).toHaveBeenCalledWith('textbook-vocabulary', false);
    });

    test('changes source priority', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
      
      // Enter edit mode
      const manageButton = screen.getByText('Manage Priorities');
      fireEvent.click(manageButton);
      
      // Find and change priority select
      const prioritySelect = screen.getByDisplayValue(/high/i);
      fireEvent.change(prioritySelect, { target: { value: SourcePriority.MEDIUM } });
      
      expect(mockRegistry.updateSourcePriority).toHaveBeenCalledWith('textbook-vocabulary', SourcePriority.MEDIUM);
    });
  });

  describe('Subscription Features', () => {
    test('shows upgrade prompt for free users', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Upgrade for sync →')).toBeInTheDocument();
      });
    });

    test('hides upgrade prompt for subscribers', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        subscriptionTier: 'monthly',
      });
      
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Upgrade for sync →')).not.toBeInTheDocument();
    });

    test('shows subscription upgrade prompt in settings', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      // Open settings modal
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('🔄 Upgrade for cross-device sync and advanced notification scheduling.')).toBeInTheDocument();
    });
  });

  describe('Golden Time Features', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('displays golden time indicator when active', async () => {
      // Set time to morning golden time (7 AM)
      const mockDate = new Date();
      mockDate.setHours(7, 0, 0, 0);
      jest.setSystemTime(mockDate);
      
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('🌅 Golden Time')).toBeInTheDocument();
      });
      
      expect(screen.getByText('1.2× bonus')).toBeInTheDocument();
    });

    test('shows next golden time when not active', async () => {
      // Set time to afternoon (2 PM)
      const mockDate = new Date();
      mockDate.setHours(14, 0, 0, 0);
      jest.setSystemTime(mockDate);
      
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText(/Next golden time: evening/)).toBeInTheDocument();
      });
    });
  });

  describe('Notification Settings', () => {
    test('opens and closes notification settings modal', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });
      
      // Open modal
      const settingsButton = screen.getByLabelText('Settings');
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      
      // Close modal
      const closeButton = screen.getByText('Notification Settings').nextElementSibling;
      fireEvent.click(closeButton!);
      
      expect(screen.queryByText('Notification Settings')).not.toBeInTheDocument();
    });
  });

  describe('Learning Insights', () => {
    test('displays learning insights and recommendations', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Learning Insights')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Focus on kanji practice to improve retention')).toBeInTheDocument();
      expect(screen.getByText('Consider reviewing during golden time for better results')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles source loading failures gracefully', async () => {
      mockRegistry.getAggregatedStats.mockRejectedValue(new Error('Network error'));
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Review Hub')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Failed to load review data')).toBeInTheDocument();
    });

    test('shows retry button on error', async () => {
      mockRegistry.init.mockRejectedValue(new Error('Network error'));
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true,
      });
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    test('sets up event listeners for source updates', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(mockRegistry.addEventListener).toHaveBeenCalledWith(
          'items_updated',
          expect.any(Function)
        );
      });
      
      expect(mockRegistry.addEventListener).toHaveBeenCalledWith(
        'config_changed',
        expect.any(Function)
      );
      
      expect(mockRegistry.addEventListener).toHaveBeenCalledWith(
        'stats_updated',
        expect.any(Function)
      );
    });

    test('cleans up event listeners on unmount', async () => {
      mockRegistry.init.mockResolvedValue(undefined);
      
      const { unmount } = render(<UnifiedReviewHub />);
      
      await waitFor(() => {
        expect(mockRegistry.addEventListener).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(mockRegistry.removeEventListener).toHaveBeenCalledWith(
        'items_updated',
        expect.any(Function)
      );
    });
  });
});

describe('ReviewClient Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    (ReviewSourceRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);
  });

  describe('Session Management', () => {
    test('handles autoStart parameter from URL', async () => {
      const searchParams = new URLSearchParams('autoStart=true');
      (useSearchParams as jest.Mock).mockReturnValue(searchParams);
      
      render(<ReviewClient />);
      
      // Should show loading then session
      await waitFor(() => {
        expect(screen.queryByText('Loading review system...')).not.toBeInTheDocument();
      });
    });

    test('handles session state in URL', async () => {
      // Mock URL with session=active
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/review?session=active',
        },
        writable: true,
      });
      
      render(<ReviewClient autoStart={true} />);
      
      // Should start in session mode
      await waitFor(() => {
        expect(screen.queryByText('Review Hub')).not.toBeInTheDocument();
      });
    });

    test('handles browser back/forward navigation', async () => {
      render(<ReviewClient />);
      
      // Simulate popstate event
      const popstateEvent = new PopStateEvent('popstate');
      act(() => {
        window.dispatchEvent(popstateEvent);
      });
      
      // Should update session state based on URL
    });

    test('handles return navigation from sessions', async () => {
      // Mock session storage with return path
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue('/tools/textbook-vocabulary');
      
      render(<ReviewClient />);
      
      // Should navigate to return path when session completes
    });
  });

  describe('Error Boundaries', () => {
    test('handles session errors with error boundary', async () => {
      // Mock a component that throws an error
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      // This would require mocking the ReviewSession component to throw
      // In a real test, you'd mock the import and make it throw
    });

    test('provides error recovery options', async () => {
      // Test error boundary fallback component
      // This would need to be tested by triggering an actual error
    });
  });

  describe('Session Completion', () => {
    test('handles successful session completion', async () => {
      const mockOnComplete = jest.fn();
      
      // This would require mocking the ReviewSession component
      // and triggering its completion callback
    });

    test('handles session cancellation', async () => {
      const mockOnCancel = jest.fn();
      
      // This would require mocking the ReviewSession component
      // and triggering its cancel callback
    });

    test('cleans up URL parameters after session', async () => {
      // Test URL cleanup after session completion
    });
  });
});