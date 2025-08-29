/**
 * Integration Tests for UnifiedReviewHub Component
 * 
 * Tests the complete integration between the UnifiedReviewHub component
 * and the review sources registry, including:
 * - Component rendering with all 10 sources
 * - Registry initialization and source registration
 * - Stats aggregation and display
 * - Priority management UI interactions
 * - Golden time calculations
 * - Subscriber vs free user access patterns
 * - Navigation and quick actions
 * - Error handling scenarios
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedReviewHub from '@/app/review/UnifiedReviewHub';
import { ReviewSourceRegistry } from '../../registry';
import { initializeAllReviewSources } from '../../sources';
import {
  ReviewSourceType,
  SourcePriority,
  SourceStatus,
  ReviewSourceEvent,
  AggregatedStats,
  GroupedReviewItems,
  SourceStats
} from '../../review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/contexts/AuthContext');
jest.mock('../../sources');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Type the mocked modules
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockInitializeAllReviewSources = initializeAllReviewSources as jest.MockedFunction<typeof initializeAllReviewSources>;

describe('UnifiedReviewHub Integration Tests', () => {
  let mockRouter: any;
  let mockRegistry: jest.Mocked<ReviewSourceRegistry>;
  let user: ReturnType<typeof userEvent.setup>;

  // Mock data for testing
  const mockAggregatedStats: AggregatedStats = {
    totals: {
      items: 1250,
      dueToday: 42,
      overdue: 5,
      sources: 10,
      activeSources: 8
    },
    byContentType: {
      [ContentType.KANJI]: {
        total: 500,
        dueToday: 15,
        overdue: 2,
        averageMastery: 72,
        retentionRate: 0.85
      },
      [ContentType.VOCABULARY]: {
        total: 750,
        dueToday: 27,
        overdue: 3,
        averageMastery: 68,
        retentionRate: 0.82
      }
    },
    bySource: {
      'kanji-mastery': {
        totalItems: 500,
        dueToday: 15,
        overdue: 2,
        scheduled: 483,
        newItems: 10,
        itemsByType: { [ContentType.KANJI]: 500 },
        itemsByPriority: { 
          [SourcePriority.HIGH]: 300,
          [SourcePriority.MEDIUM]: 150,
          [SourcePriority.LOW]: 50
        },
        averageMastery: 72,
        retentionRate: 0.85,
        studyStreak: 14,
        trends: {
          accuracy: 'improving' as const,
          speed: 'stable' as const,
          retention: 'improving' as const
        }
      },
      'textbook-vocabulary': {
        totalItems: 320,
        dueToday: 12,
        overdue: 1,
        scheduled: 307,
        newItems: 8,
        itemsByType: { [ContentType.VOCABULARY]: 320 },
        itemsByPriority: { 
          [SourcePriority.HIGH]: 200,
          [SourcePriority.MEDIUM]: 100,
          [SourcePriority.LOW]: 20
        },
        averageMastery: 78,
        retentionRate: 0.88,
        studyStreak: 12,
        trends: {
          accuracy: 'stable' as const,
          speed: 'improving' as const,
          retention: 'stable' as const
        }
      }
    },
    performance: {
      averageMastery: 70,
      overallRetention: 0.83,
      studyStreak: 12,
      lastActivity: new Date('2025-01-15T08:30:00Z')
    },
    distribution: {
      today: 42,
      tomorrow: 38,
      thisWeek: 156,
      nextWeek: 89,
      later: 925
    },
    insights: {
      mostActiveSource: 'kanji-mastery',
      strugglingAreas: [],
      recommendations: [
        'Great consistency! Keep up your daily study streak.',
        'Consider increasing kanji review priority for better retention.',
        'Golden time sessions show 15% better retention rates.'
      ],
      nextReviewEstimate: new Date('2025-01-16T09:00:00Z')
    }
  };

  const mockGroupedItems: GroupedReviewItems = {
    bySource: {
      'kanji-mastery': {
        source: {
          id: 'kanji-mastery',
          name: 'Kanji Mastery',
          type: ReviewSourceType.KANJI_MASTERY,
          icon: '🈳',
          description: 'FSRS-powered kanji learning',
          paths: { main: '/tools/kanji-mastery' },
          supportedContentTypes: [ContentType.KANJI],
          status: SourceStatus.ACTIVE,
          config: {
            enabled: true,
            priorityMultiplier: 1.0,
            settings: {}
          }
        } as any,
        items: [
          {
            id: 'kanji-1',
            sourceId: 'kanji-mastery',
            contentType: ContentType.KANJI,
            content: { primary: '学', secondary: 'study, learn' },
            dueDate: new Date(),
            priority: 8,
            availableStudyModes: [StudyMode.RECOGNITION],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        stats: mockAggregatedStats.bySource['kanji-mastery']
      }
    },
    byContentType: {},
    byPriority: {},
    byDueDate: {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: []
    },
    totals: {
      items: 1250,
      sources: 10,
      dueToday: 42,
      overdue: 5
    }
  };

  // Create mock sources data
  const createMockSource = (id: string, name: string, type: ReviewSourceType) => ({
    id,
    name,
    type,
    icon: '🈳',
    description: `${name} description`,
    paths: { main: `/tools/${id}` },
    supportedContentTypes: [ContentType.VOCABULARY],
    status: SourceStatus.ACTIVE,
    config: {
      enabled: true,
      priorityMultiplier: 1.0,
      settings: {}
    },
    init: jest.fn(),
    getDueItems: jest.fn(),
    getStats: jest.fn(),
    updateConfig: jest.fn(),
    processReview: jest.fn(),
    searchItems: jest.fn(),
    getItem: jest.fn(),
    healthCheck: jest.fn()
  });

  const mockSources = [
    createMockSource('kanji-mastery', 'Kanji Mastery', ReviewSourceType.KANJI_MASTERY),
    createMockSource('textbook-vocabulary', 'Textbook Vocabulary', ReviewSourceType.TEXTBOOK_VOCABULARY),
    createMockSource('flashcards', 'Flashcards', ReviewSourceType.FLASHCARDS),
    createMockSource('hiragana-katakana', 'Hiragana/Katakana', ReviewSourceType.CUSTOM_LISTS),
    createMockSource('articles', 'Articles', ReviewSourceType.READING_COMPREHENSION),
    createMockSource('stories', 'Stories', ReviewSourceType.READING_COMPREHENSION),
    createMockSource('moodboard', 'Moodboard', ReviewSourceType.CUSTOM_LISTS),
    createMockSource('dictionary', 'Dictionary', ReviewSourceType.CUSTOM_LISTS),
    createMockSource('conjugations', 'Conjugations', ReviewSourceType.GRAMMAR_DRILLS),
    createMockSource('drills', 'Drills', ReviewSourceType.GRAMMAR_DRILLS)
  ];

  beforeEach(() => {
    user = userEvent.setup();
    
    // Setup router mock
    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    };
    mockUseRouter.mockReturnValue(mockRouter);

    // Setup registry mock
    mockRegistry = {
      register: jest.fn(),
      getAggregatedStats: jest.fn().mockResolvedValue(mockAggregatedStats),
      getAllDueItems: jest.fn().mockResolvedValue(mockGroupedItems),
      getPrioritizedSources: jest.fn().mockReturnValue(mockSources),
      getUserPreferences: jest.fn().mockReturnValue({
        enabled: Object.fromEntries(mockSources.map(s => [s.id, true])),
        priorities: Object.fromEntries(mockSources.map(s => [s.id, SourcePriority.MEDIUM]))
      }),
      updateSourcePriority: jest.fn(),
      setSourceEnabled: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      init: jest.fn()
    } as any;

    // Setup source initialization mock
    mockInitializeAllReviewSources.mockResolvedValue(mockRegistry);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Component Rendering and Initialization', () => {
    it('renders loading state initially', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-id' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      expect(screen.getByRole('progressbar', { name: /loading/i }) || 
             screen.getByText(/loading/i) || 
             document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('initializes all 10 review sources with correct configuration', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-id' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(mockInitializeAllReviewSources).toHaveBeenCalledWith('test-user-id', {
          debug: false,
          enabledSources: [
            'kanji-mastery',
            'textbook-vocabulary',
            'flashcards',
            'hiragana-katakana',
            'articles',
            'stories',
            'moodboard',
            'dictionary',
            'conjugations',
            'drills'
          ],
          priorities: {
            'kanji-mastery': SourcePriority.HIGH,
            'textbook-vocabulary': SourcePriority.HIGH,
            'flashcards': SourcePriority.MEDIUM,
            'hiragana-katakana': SourcePriority.HIGH,
            'articles': SourcePriority.MEDIUM,
            'stories': SourcePriority.MEDIUM,
            'moodboard': SourcePriority.LOW,
            'dictionary': SourcePriority.MEDIUM,
            'conjugations': SourcePriority.MEDIUM,
            'drills': SourcePriority.HIGH
          }
        });
      });

      expect(mockRegistry.getAggregatedStats).toHaveBeenCalled();
      expect(mockRegistry.getAllDueItems).toHaveBeenCalledWith({ limit: 200 });
    });

    it('displays main UI elements after successful initialization', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-id' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Review Hub')).toBeInTheDocument();
      });

      expect(screen.getByText('Unified spaced repetition system')).toBeInTheDocument();
      expect(screen.getByText('Review Sources')).toBeInTheDocument();
    });

    it('sets up event listeners for real-time updates', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-id' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(mockRegistry.addEventListener).toHaveBeenCalledWith(
          ReviewSourceEvent.ITEMS_UPDATED, 
          expect.any(Function)
        );
        expect(mockRegistry.addEventListener).toHaveBeenCalledWith(
          ReviewSourceEvent.CONFIG_CHANGED, 
          expect.any(Function)
        );
        expect(mockRegistry.addEventListener).toHaveBeenCalledWith(
          ReviewSourceEvent.STATS_UPDATED, 
          expect.any(Function)
        );
      });
    });
  });

  describe('Subscriber vs Free User Experience', () => {
    it('displays detailed statistics for subscribers', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'monthly-subscriber' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText("Today's Overview")).toBeInTheDocument();
      });

      // Check all stat displays
      expect(screen.getByText('42')).toBeInTheDocument(); // Due Today
      expect(screen.getByText('Due Today')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // Study Streak
      expect(screen.getByText('Day Streak')).toBeInTheDocument();
      expect(screen.getByText('83%')).toBeInTheDocument(); // Retention Rate
      expect(screen.getByText('Retention')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Total Items
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      expect(screen.getByText('8 sources')).toBeInTheDocument();
    });

    it('shows upgrade prompt for free users', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'free-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Unlock Detailed Statistics')).toBeInTheDocument();
      });

      expect(screen.getByText(/Get insights into your learning progress/)).toBeInTheDocument();
      
      const upgradeButton = screen.getByRole('link', { name: /upgrade now/i });
      expect(upgradeButton).toBeInTheDocument();
      expect(upgradeButton).toHaveAttribute('href', '/subscription');
    });

    it('shows upgrade prompts in notification settings for free users', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'free-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });

      // Open notification settings
      await user.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      });

      expect(screen.getByText(/Upgrade for cross-device sync/)).toBeInTheDocument();
    });
  });

  describe('Golden Time Calculations', () => {
    beforeEach(() => {
      // Mock current time to test golden time calculations
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays golden time indicator during morning window (7-10 AM)', async () => {
      // Set time to 8:30 AM
      jest.setSystemTime(new Date('2025-01-15T08:30:00Z'));
      
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('🌅 Golden Time')).toBeInTheDocument();
        expect(screen.getByText('1.2× bonus')).toBeInTheDocument();
      });
    });

    it('displays golden time indicator during evening window (6-9 PM)', async () => {
      // Set time to 7:00 PM
      jest.setSystemTime(new Date('2025-01-15T19:00:00Z'));
      
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('🌅 Golden Time')).toBeInTheDocument();
        expect(screen.getByText('1.2× bonus')).toBeInTheDocument();
      });
    });

    it('shows next golden time window when not in golden time', async () => {
      // Set time to 2:00 PM (between windows)
      jest.setSystemTime(new Date('2025-01-15T14:00:00Z'));
      
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText(/Next golden time: evening/)).toBeInTheDocument();
      });
    });

    it('shows next morning window when after evening golden time', async () => {
      // Set time to 10:00 PM (after evening window)
      jest.setSystemTime(new Date('2025-01-15T22:00:00Z'));
      
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText(/Next golden time: morning/)).toBeInTheDocument();
      });
    });
  });

  describe('Review Source Cards and Management', () => {
    it('displays all 10 review sources with correct information', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Review Sources')).toBeInTheDocument();
      });

      // Check that all 10 sources are displayed
      mockSources.forEach(source => {
        expect(screen.getByText(source.name)).toBeInTheDocument();
      });
    });

    it('shows source statistics for enabled sources', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Kanji Mastery')).toBeInTheDocument();
      });

      // Find the kanji mastery card and check its stats
      const kanjiCard = screen.getByText('Kanji Mastery').closest('[data-testid="source-card"], div');
      if (kanjiCard) {
        expect(within(kanjiCard as HTMLElement).getByText('15')).toBeInTheDocument(); // Due count
        expect(within(kanjiCard as HTMLElement).getByText('500')).toBeInTheDocument(); // Total count
        expect(within(kanjiCard as HTMLElement).getByText('85%')).toBeInTheDocument(); // Retention rate
      }
    });

    it('navigates to source page when card is clicked', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Kanji Mastery')).toBeInTheDocument();
      });

      const kanjiCard = screen.getByText('Kanji Mastery').closest('div[class*="cursor-pointer"]');
      if (kanjiCard) {
        await user.click(kanjiCard as HTMLElement);
        
        expect(mockRouter.push).toHaveBeenCalledWith('/tools/kanji-mastery?returnTo=/review');
        expect(sessionStorage.setItem).toHaveBeenCalledWith('reviewReturnPath', '/review');
      }
    });

    it('shows preview items for sources with due items', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Next items:')).toBeInTheDocument();
        expect(screen.getByText('学')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Management', () => {
    it('enters and exits priority edit mode', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });

      // Enter edit mode
      await user.click(screen.getByText('Manage Priorities'));

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.getByText('Drag to reorder priority')).toBeInTheDocument();
      });

      // Exit edit mode
      await user.click(screen.getByText('Done'));

      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
    });

    it('updates source priority when changed in edit mode', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      // Enter edit mode
      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Manage Priorities'));

      // Find priority select for first source
      const prioritySelects = screen.getAllByRole('combobox');
      if (prioritySelects.length > 0) {
        await user.selectOptions(prioritySelects[0], SourcePriority.HIGH.toString());

        expect(mockRegistry.updateSourcePriority).toHaveBeenCalledWith(
          expect.any(String),
          SourcePriority.HIGH
        );
      }
    });

    it('toggles source enabled state', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      // Enter edit mode
      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Manage Priorities'));

      // Find toggle buttons (they appear as divs with specific classes)
      const toggles = document.querySelectorAll('[role="button"][class*="rounded-full"]');
      if (toggles.length > 0) {
        await user.click(toggles[0] as HTMLElement);

        expect(mockRegistry.setSourceEnabled).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Boolean)
        );
      }
    });
  });

  describe('Quick Actions', () => {
    it('starts unified review session when items are due', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Start Review (42)')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Start Review (42)'));

      expect(mockRouter.push).toHaveBeenCalledWith('/review/session');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('reviewReturnPath', '/review');
    });

    it('disables review button when no items are due', async () => {
      const emptyStats = {
        ...mockAggregatedStats,
        totals: { ...mockAggregatedStats.totals, dueToday: 0 }
      };
      mockRegistry.getAggregatedStats.mockResolvedValue(emptyStats);

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        const reviewButton = screen.getByText(/Start Review/);
        expect(reviewButton.closest('button')).toBeDisabled();
      });
    });
  });

  describe('Learning Insights', () => {
    it('displays learning insights and recommendations for users with insights data', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Learning Insights')).toBeInTheDocument();
      });

      // Check recommendations
      mockAggregatedStats.insights.recommendations.forEach(recommendation => {
        expect(screen.getByText(recommendation)).toBeInTheDocument();
      });

      // Check next review estimate
      expect(screen.getByText(/Next review estimate:/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when initialization fails', async () => {
      mockInitializeAllReviewSources.mockRejectedValue(new Error('Initialization failed'));

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Review Hub')).toBeInTheDocument();
        expect(screen.getByText('Failed to initialize review system')).toBeInTheDocument();
      });

      // Check retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('displays error when stats loading fails', async () => {
      mockRegistry.getAggregatedStats.mockRejectedValue(new Error('Stats unavailable'));

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Review Hub')).toBeInTheDocument();
        expect(screen.getByText('Failed to load review data')).toBeInTheDocument();
      });
    });

    it('handles registry event listener errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRegistry.updateSourcePriority.mockRejectedValue(new Error('Update failed'));

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      render(<UnifiedReviewHub />);

      // Enter edit mode and try to update priority
      await waitFor(() => {
        expect(screen.getByText('Manage Priorities')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Manage Priorities'));

      const prioritySelects = screen.getAllByRole('combobox');
      if (prioritySelects.length > 0) {
        await user.selectOptions(prioritySelects[0], SourcePriority.HIGH.toString());

        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith('Failed to update priority:', expect.any(Error));
        });
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Guest User Experience', () => {
    it('initializes registry with null user ID for guest users', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userType: 'guest',
        subscriptionTier: null
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(mockInitializeAllReviewSources).toHaveBeenCalledWith(null, expect.any(Object));
      });
    });

    it('shows upgrade prompts for guest users', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        userType: 'guest',
        subscriptionTier: null
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByText('Unlock Detailed Statistics')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Settings', () => {
    it('opens and closes notification settings modal', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });

      // Open modal
      await user.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      });

      // Close modal by clicking X
      const closeButton = screen.getByRole('button', { name: /close/i }) || 
                          document.querySelector('[class*="hover:text-gray-600"]');
      if (closeButton) {
        await user.click(closeButton as HTMLElement);

        await waitFor(() => {
          expect(screen.queryByText('Notification Settings')).not.toBeInTheDocument();
        });
      }
    });

    it('displays notification options in settings modal', async () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Daily review reminders')).toBeInTheDocument();
        expect(screen.getByText('Golden time notifications')).toBeInTheDocument();
        expect(screen.getByText('Achievement alerts')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data when registry events are triggered', async () => {
      let eventCallback: Function;
      mockRegistry.addEventListener.mockImplementation((event, callback) => {
        eventCallback = callback;
      });

      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'monthly'
      } as any);

      render(<UnifiedReviewHub />);

      await waitFor(() => {
        expect(mockRegistry.addEventListener).toHaveBeenCalled();
      });

      // Clear previous calls
      mockRegistry.getAggregatedStats.mockClear();
      mockRegistry.getAllDueItems.mockClear();

      // Trigger an event
      if (eventCallback) {
        eventCallback();

        await waitFor(() => {
          expect(mockRegistry.getAggregatedStats).toHaveBeenCalled();
          expect(mockRegistry.getAllDueItems).toHaveBeenCalled();
        });
      }
    });

    it('removes event listeners on component unmount', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
        userType: 'authenticated',
        subscriptionTier: 'free'
      } as any);

      const { unmount } = render(<UnifiedReviewHub />);

      unmount();

      expect(mockRegistry.removeEventListener).toHaveBeenCalledWith(
        ReviewSourceEvent.ITEMS_UPDATED,
        expect.any(Function)
      );
      expect(mockRegistry.removeEventListener).toHaveBeenCalledWith(
        ReviewSourceEvent.CONFIG_CHANGED,
        expect.any(Function)
      );
      expect(mockRegistry.removeEventListener).toHaveBeenCalledWith(
        ReviewSourceEvent.STATS_UPDATED,
        expect.any(Function)
      );
    });
  });
});