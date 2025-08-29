/**
 * Test Utilities for UnifiedReviewHub Integration Tests
 * 
 * Provides mock data, helper functions, and shared test utilities
 * for comprehensive testing of the UnifiedReviewHub component.
 */

import {
  ReviewSource,
  ReviewSourceType,
  SourcePriority,
  SourceStatus,
  AggregatedStats,
  GroupedReviewItems,
  SourceStats,
  ReviewItem,
  SourceConfig
} from '../../review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// ============================================================================
// Mock Data Factory Functions
// ============================================================================

/**
 * Creates a mock review source with configurable properties
 */
export function createMockReviewSource(
  id: string,
  overrides: Partial<ReviewSource> = {}
): jest.Mocked<ReviewSource> {
  const defaultSource: ReviewSource = {
    id,
    name: `Mock ${id}`,
    type: ReviewSourceType.KANJI_MASTERY,
    icon: '🈳',
    description: `Mock source for ${id}`,
    paths: { 
      main: `/tools/${id}`,
      settings: `/tools/${id}/settings`,
      stats: `/tools/${id}/stats`
    },
    supportedContentTypes: [ContentType.KANJI, ContentType.VOCABULARY],
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
  };

  return { ...defaultSource, ...overrides } as jest.Mocked<ReviewSource>;
}

/**
 * Creates mock source statistics
 */
export function createMockSourceStats(
  overrides: Partial<SourceStats> = {}
): SourceStats {
  return {
    totalItems: 100,
    dueToday: 10,
    overdue: 2,
    scheduled: 88,
    newItems: 5,
    itemsByType: {
      [ContentType.KANJI]: 50,
      [ContentType.VOCABULARY]: 50
    },
    itemsByPriority: {
      [SourcePriority.LOW]: 20,
      [SourcePriority.MEDIUM]: 60,
      [SourcePriority.HIGH]: 20
    },
    averageMastery: 75,
    retentionRate: 0.85,
    studyStreak: 7,
    trends: {
      accuracy: 'improving',
      speed: 'stable',
      retention: 'improving'
    },
    lastReviewSession: new Date('2025-01-15T08:00:00Z'),
    ...overrides
  };
}

/**
 * Creates a mock review item
 */
export function createMockReviewItem(
  id: string,
  sourceId: string,
  overrides: Partial<ReviewItem> = {}
): ReviewItem {
  return {
    id,
    sourceId,
    contentType: ContentType.KANJI,
    content: {
      primary: '学',
      secondary: 'study, learn',
      context: 'Common kanji for learning'
    },
    dueDate: new Date(),
    priority: 5,
    availableStudyModes: [StudyMode.RECOGNITION, StudyMode.PRODUCTION],
    metadata: {
      difficulty: 3,
      tags: ['jlpt-n5'],
      properties: {}
    },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-15T00:00:00Z'),
    ...overrides
  };
}

/**
 * Creates comprehensive mock aggregated statistics
 */
export function createMockAggregatedStats(
  overrides: Partial<AggregatedStats> = {}
): AggregatedStats {
  const defaultStats: AggregatedStats = {
    totals: {
      items: 1000,
      dueToday: 50,
      overdue: 8,
      sources: 10,
      activeSources: 8
    },
    byContentType: {
      [ContentType.KANJI]: {
        total: 400,
        dueToday: 20,
        overdue: 3,
        averageMastery: 72,
        retentionRate: 0.83
      },
      [ContentType.VOCABULARY]: {
        total: 600,
        dueToday: 30,
        overdue: 5,
        averageMastery: 68,
        retentionRate: 0.81
      }
    },
    bySource: {
      'kanji-mastery': createMockSourceStats({
        totalItems: 400,
        dueToday: 20,
        overdue: 3
      }),
      'textbook-vocabulary': createMockSourceStats({
        totalItems: 300,
        dueToday: 15,
        overdue: 2
      }),
      'flashcards': createMockSourceStats({
        totalItems: 200,
        dueToday: 10,
        overdue: 2
      }),
      'grammar-drills': createMockSourceStats({
        totalItems: 100,
        dueToday: 5,
        overdue: 1
      })
    },
    performance: {
      averageMastery: 70,
      overallRetention: 0.82,
      studyStreak: 12,
      lastActivity: new Date('2025-01-15T09:00:00Z')
    },
    distribution: {
      today: 50,
      tomorrow: 45,
      thisWeek: 180,
      nextWeek: 120,
      later: 605
    },
    insights: {
      mostActiveSource: 'kanji-mastery',
      strugglingAreas: [],
      recommendations: [
        'Great consistency! Keep up your daily study streak.',
        'Consider focusing more on vocabulary retention.',
        'Your kanji recognition is improving steadily.'
      ],
      nextReviewEstimate: new Date('2025-01-16T08:00:00Z')
    }
  };

  return { ...defaultStats, ...overrides };
}

/**
 * Creates mock grouped review items
 */
export function createMockGroupedItems(
  sources: ReviewSource[],
  overrides: Partial<GroupedReviewItems> = {}
): GroupedReviewItems {
  const bySource: GroupedReviewItems['bySource'] = {};
  
  sources.forEach((source, index) => {
    const items = Array.from({ length: 5 }, (_, i) => 
      createMockReviewItem(`${source.id}-item-${i}`, source.id)
    );
    
    bySource[source.id] = {
      source,
      items,
      stats: createMockSourceStats()
    };
  });

  const defaultGrouped: GroupedReviewItems = {
    bySource,
    byContentType: {
      [ContentType.KANJI]: [],
      [ContentType.VOCABULARY]: []
    },
    byPriority: {
      [SourcePriority.LOW]: [],
      [SourcePriority.MEDIUM]: [],
      [SourcePriority.HIGH]: [],
      [SourcePriority.URGENT]: []
    },
    byDueDate: {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: []
    },
    totals: {
      items: sources.length * 5,
      sources: sources.length,
      dueToday: 50,
      overdue: 8
    }
  };

  return { ...defaultGrouped, ...overrides };
}

// ============================================================================
// Mock Registry Factory
// ============================================================================

/**
 * Creates a fully mocked registry with realistic behavior
 */
export function createMockRegistry(
  sources: ReviewSource[],
  stats?: AggregatedStats,
  groupedItems?: GroupedReviewItems
): jest.Mocked<any> {
  const mockStats = stats || createMockAggregatedStats();
  const mockItems = groupedItems || createMockGroupedItems(sources);

  return {
    register: jest.fn(),
    getAggregatedStats: jest.fn().mockResolvedValue(mockStats),
    getAllDueItems: jest.fn().mockResolvedValue(mockItems),
    getPrioritizedSources: jest.fn().mockReturnValue(sources),
    getUserPreferences: jest.fn().mockReturnValue({
      enabled: Object.fromEntries(sources.map(s => [s.id, true])),
      priorities: Object.fromEntries(sources.map(s => [s.id, SourcePriority.MEDIUM]))
    }),
    updateSourcePriority: jest.fn(),
    setSourceEnabled: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    init: jest.fn()
  };
}

// ============================================================================
// Standard Mock Data Sets
// ============================================================================

/**
 * Standard set of 10 mock review sources matching the real sources
 */
export const STANDARD_MOCK_SOURCES = [
  createMockReviewSource('kanji-mastery', {
    name: 'Kanji Mastery',
    type: ReviewSourceType.KANJI_MASTERY,
    icon: '🈳',
    supportedContentTypes: [ContentType.KANJI]
  }),
  createMockReviewSource('textbook-vocabulary', {
    name: 'Textbook Vocabulary',
    type: ReviewSourceType.TEXTBOOK_VOCABULARY,
    icon: '📚',
    supportedContentTypes: [ContentType.VOCABULARY]
  }),
  createMockReviewSource('flashcards', {
    name: 'Flashcards',
    type: ReviewSourceType.FLASHCARDS,
    icon: '🗃️',
    supportedContentTypes: [ContentType.FLASHCARD]
  }),
  createMockReviewSource('hiragana-katakana', {
    name: 'Hiragana/Katakana',
    type: ReviewSourceType.CUSTOM_LISTS,
    icon: 'あ',
    supportedContentTypes: [ContentType.VOCABULARY]
  }),
  createMockReviewSource('articles', {
    name: 'Articles',
    type: ReviewSourceType.READING_COMPREHENSION,
    icon: '📰',
    supportedContentTypes: [ContentType.VOCABULARY, ContentType.SENTENCE]
  }),
  createMockReviewSource('stories', {
    name: 'Stories',
    type: ReviewSourceType.READING_COMPREHENSION,
    icon: '📖',
    supportedContentTypes: [ContentType.VOCABULARY, ContentType.SENTENCE]
  }),
  createMockReviewSource('moodboard', {
    name: 'Moodboard',
    type: ReviewSourceType.CUSTOM_LISTS,
    icon: '🎨',
    supportedContentTypes: [ContentType.VOCABULARY]
  }),
  createMockReviewSource('dictionary', {
    name: 'Dictionary',
    type: ReviewSourceType.CUSTOM_LISTS,
    icon: '📚',
    supportedContentTypes: [ContentType.VOCABULARY]
  }),
  createMockReviewSource('conjugations', {
    name: 'Conjugations',
    type: ReviewSourceType.GRAMMAR_DRILLS,
    icon: '📝',
    supportedContentTypes: [ContentType.GRAMMAR]
  }),
  createMockReviewSource('drills', {
    name: 'Drills',
    type: ReviewSourceType.GRAMMAR_DRILLS,
    icon: '🎯',
    supportedContentTypes: [ContentType.GRAMMAR, ContentType.SENTENCE]
  })
];

// ============================================================================
// Time Utilities for Golden Time Testing
// ============================================================================

/**
 * Time utilities for testing golden time calculations
 */
export const TimeTestUtils = {
  /**
   * Set system time to morning golden time (8:30 AM)
   */
  setMorningGoldenTime(): void {
    jest.setSystemTime(new Date('2025-01-15T08:30:00Z'));
  },

  /**
   * Set system time to evening golden time (7:00 PM)
   */
  setEveningGoldenTime(): void {
    jest.setSystemTime(new Date('2025-01-15T19:00:00Z'));
  },

  /**
   * Set system time between golden time windows (2:00 PM)
   */
  setBetweenGoldenTime(): void {
    jest.setSystemTime(new Date('2025-01-15T14:00:00Z'));
  },

  /**
   * Set system time after evening golden time (10:00 PM)
   */
  setAfterGoldenTime(): void {
    jest.setSystemTime(new Date('2025-01-15T22:00:00Z'));
  },

  /**
   * Set system time before morning golden time (5:00 AM)
   */
  setBeforeGoldenTime(): void {
    jest.setSystemTime(new Date('2025-01-15T05:00:00Z'));
  }
};

// ============================================================================
// User Context Utilities
// ============================================================================

/**
 * Standard user contexts for testing different subscription tiers
 */
export const UserContexts = {
  monthly: {
    user: { uid: 'monthly-subscriber-id' },
    userType: 'authenticated' as const,
    subscriptionTier: 'monthly' as const
  },

  yearly: {
    user: { uid: 'yearly-subscriber-id' },
    userType: 'authenticated' as const,
    subscriptionTier: 'yearly' as const
  },

  free: {
    user: { uid: 'free-user-id' },
    userType: 'authenticated' as const,
    subscriptionTier: 'free' as const
  },

  guest: {
    user: null,
    userType: 'guest' as const,
    subscriptionTier: null
  }
};

// ============================================================================
// Error Scenarios
// ============================================================================

/**
 * Common error scenarios for testing error handling
 */
export const ErrorScenarios = {
  initializationFailed: () => {
    throw new Error('Failed to initialize review sources');
  },

  statsUnavailable: () => {
    throw new Error('Statistics service unavailable');
  },

  networkError: () => {
    throw new Error('Network connection failed');
  },

  sourceNotFound: () => {
    throw new Error('Review source not found');
  }
};

// ============================================================================
// Test Assertion Helpers
// ============================================================================

/**
 * Assertion helpers for common test scenarios
 */
export const AssertionHelpers = {
  /**
   * Verify that all expected sources are displayed
   */
  expectAllSourcesDisplayed(sources: ReviewSource[]): void {
    sources.forEach(source => {
      expect(screen.getByText(source.name)).toBeInTheDocument();
    });
  },

  /**
   * Verify that statistics are correctly displayed
   */
  expectStatsDisplayed(stats: AggregatedStats): void {
    expect(screen.getByText(stats.totals.dueToday.toString())).toBeInTheDocument();
    expect(screen.getByText('Due Today')).toBeInTheDocument();
    expect(screen.getByText(stats.performance.studyStreak.toString())).toBeInTheDocument();
    expect(screen.getByText('Day Streak')).toBeInTheDocument();
  },

  /**
   * Verify that golden time is correctly displayed
   */
  expectGoldenTimeActive(): void {
    expect(screen.getByText('🌅 Golden Time')).toBeInTheDocument();
    expect(screen.getByText('1.2× bonus')).toBeInTheDocument();
  },

  /**
   * Verify that upgrade prompts are shown for non-subscription users
   */
  expectUpgradePrompt(): void {
    expect(screen.getByText('Unlock Detailed Statistics')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upgrade now/i })).toBeInTheDocument();
  }
};

// Re-export screen for convenience
export { screen } from '@testing-library/react';