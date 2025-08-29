/**
 * Test Utilities for Unified Review Hub
 * 
 * Shared mocks, fixtures, and helper functions for testing the review system.
 */

import { 
  ReviewSource, 
  SourcePriority, 
  SourceStatus,
  AggregatedStats,
  GroupedReviewItems,
  SourceStats,
  ReviewItem,
  ReviewSourceType
} from '@/lib/review-sources/review-source.interface';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// ============================================================================
// Mock Review Sources
// ============================================================================

export const createMockTextbookVocabularySource = (overrides?: Partial<ReviewSource>): ReviewSource => ({
  id: 'textbook-vocabulary',
  name: 'Textbook Vocabulary',
  type: ReviewSourceType.TEXTBOOK_VOCABULARY,
  icon: '📖',
  description: 'Vocabulary from Japanese textbooks (Genki, Minna no Nihongo)',
  paths: {
    main: '/tools/textbook-vocabulary',
    settings: '/tools/textbook-vocabulary/settings',
    stats: '/tools/textbook-vocabulary/stats',
  },
  supportedContentTypes: [ContentType.VOCABULARY],
  status: SourceStatus.ACTIVE,
  config: {
    enabled: true,
    priorityMultiplier: 1.0,
    settings: {
      textbooks: ['genki-1', 'genki-2'],
      includeAudio: true,
      showFurigana: true,
    },
  },
  init: jest.fn().mockResolvedValue(undefined),
  getDueItems: jest.fn().mockResolvedValue([]),
  getStats: jest.fn().mockResolvedValue(createMockSourceStats()),
  updateConfig: jest.fn().mockResolvedValue(undefined),
  processReview: jest.fn().mockResolvedValue(undefined),
  searchItems: jest.fn().mockResolvedValue([]),
  getItem: jest.fn().mockResolvedValue(null),
  healthCheck: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockKanjiMasterySource = (overrides?: Partial<ReviewSource>): ReviewSource => ({
  id: 'kanji-mastery',
  name: 'Kanji Mastery',
  type: ReviewSourceType.KANJI_MASTERY,
  icon: '🈳',
  description: 'Comprehensive kanji learning with stroke order and radicals',
  paths: {
    main: '/tools/kanji-mastery',
    settings: '/tools/kanji-mastery/settings',
    stats: '/tools/kanji-mastery/stats',
  },
  supportedContentTypes: [ContentType.KANJI],
  status: SourceStatus.ACTIVE,
  config: {
    enabled: true,
    priorityMultiplier: 1.2,
    settings: {
      levels: ['n5', 'n4', 'n3'],
      includeStrokeOrder: true,
      showRadicals: true,
    },
  },
  init: jest.fn().mockResolvedValue(undefined),
  getDueItems: jest.fn().mockResolvedValue([]),
  getStats: jest.fn().mockResolvedValue(createMockSourceStats('kanji')),
  updateConfig: jest.fn().mockResolvedValue(undefined),
  processReview: jest.fn().mockResolvedValue(undefined),
  searchItems: jest.fn().mockResolvedValue([]),
  getItem: jest.fn().mockResolvedValue(null),
  healthCheck: jest.fn().mockResolvedValue(true),
  ...overrides,
});

export const createMockFlashcardsSource = (overrides?: Partial<ReviewSource>): ReviewSource => ({
  id: 'flashcards',
  name: 'Custom Flashcards',
  type: ReviewSourceType.FLASHCARDS,
  icon: '🎯',
  description: 'User-created custom flashcards and imported Anki decks',
  paths: {
    main: '/tools/flashcards',
    settings: '/tools/flashcards/settings',
  },
  supportedContentTypes: [ContentType.VOCABULARY, ContentType.KANJI, ContentType.GRAMMAR],
  status: SourceStatus.ACTIVE,
  config: {
    enabled: true,
    priorityMultiplier: 0.8,
    settings: {
      autoImportAnki: true,
      allowUserCreation: true,
      maxDailyNew: 20,
    },
  },
  init: jest.fn().mockResolvedValue(undefined),
  getDueItems: jest.fn().mockResolvedValue([]),
  getStats: jest.fn().mockResolvedValue(createMockSourceStats('flashcards')),
  updateConfig: jest.fn().mockResolvedValue(undefined),
  processReview: jest.fn().mockResolvedValue(undefined),
  searchItems: jest.fn().mockResolvedValue([]),
  getItem: jest.fn().mockResolvedValue(null),
  healthCheck: jest.fn().mockResolvedValue(true),
  ...overrides,
});

// ============================================================================
// Mock Data Generators
// ============================================================================

export const createMockSourceStats = (type: 'vocabulary' | 'kanji' | 'flashcards' = 'vocabulary'): SourceStats => {
  const baseStats = {
    vocabulary: {
      totalItems: 120,
      dueToday: 15,
      overdue: 3,
      scheduled: 102,
      newItems: 0,
      averageMastery: 75,
      retentionRate: 0.85,
      studyStreak: 7,
    },
    kanji: {
      totalItems: 80,
      dueToday: 12,
      overdue: 2,
      scheduled: 66,
      newItems: 0,
      averageMastery: 65,
      retentionRate: 0.78,
      studyStreak: 5,
    },
    flashcards: {
      totalItems: 50,
      dueToday: 8,
      overdue: 1,
      scheduled: 41,
      newItems: 0,
      averageMastery: 70,
      retentionRate: 0.82,
      studyStreak: 3,
    },
  };

  const stats = baseStats[type];

  return {
    ...stats,
    itemsByType: {
      [ContentType.VOCABULARY]: type === 'vocabulary' ? stats.totalItems : 0,
      [ContentType.KANJI]: type === 'kanji' ? stats.totalItems : 0,
      [ContentType.GRAMMAR]: type === 'flashcards' ? Math.floor(stats.totalItems * 0.3) : 0,
    },
    itemsByPriority: {
      [SourcePriority.LOW]: Math.floor(stats.totalItems * 0.2),
      [SourcePriority.MEDIUM]: Math.floor(stats.totalItems * 0.5),
      [SourcePriority.HIGH]: Math.floor(stats.totalItems * 0.3),
      [SourcePriority.URGENT]: Math.floor(stats.totalItems * 0.1),
    },
    lastReviewSession: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    trends: {
      accuracy: 'improving' as const,
      speed: 'stable' as const,
      retention: 'improving' as const,
    },
  };
};

export const createMockAggregatedStats = (overrides?: Partial<AggregatedStats>): AggregatedStats => ({
  totals: {
    items: 250,
    dueToday: 35,
    overdue: 6,
    sources: 3,
    activeSources: 3,
  },
  byContentType: {
    [ContentType.VOCABULARY]: {
      total: 135,
      dueToday: 20,
      overdue: 4,
      averageMastery: 73,
      retentionRate: 0.84,
    },
    [ContentType.KANJI]: {
      total: 80,
      dueToday: 12,
      overdue: 2,
      averageMastery: 65,
      retentionRate: 0.78,
    },
    [ContentType.GRAMMAR]: {
      total: 35,
      dueToday: 3,
      overdue: 0,
      averageMastery: 80,
      retentionRate: 0.88,
    },
  },
  bySource: {
    'textbook-vocabulary': createMockSourceStats('vocabulary'),
    'kanji-mastery': createMockSourceStats('kanji'),
    'flashcards': createMockSourceStats('flashcards'),
  },
  performance: {
    averageMastery: 72,
    overallRetention: 0.82,
    studyStreak: 7,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  distribution: {
    today: 35,
    tomorrow: 28,
    thisWeek: 85,
    nextWeek: 65,
    later: 37,
  },
  insights: {
    mostActiveSource: 'textbook-vocabulary',
    strugglingAreas: [ContentType.KANJI],
    recommendations: [
      'Focus on kanji practice to improve retention',
      'Consider reviewing during golden time for better results',
      'Add more grammar items to balance your study routine',
    ],
    nextReviewEstimate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  },
  ...overrides,
});

export const createMockReviewItem = (overrides?: Partial<ReviewItem>): ReviewItem => ({
  id: 'item-' + Math.random().toString(36).substr(2, 9),
  sourceId: 'textbook-vocabulary',
  contentType: ContentType.VOCABULARY,
  content: {
    primary: '食べる',
    secondary: 'to eat',
    context: 'Basic verb - Group 2 (Ichidan)',
    formatted: {
      primary: '食べる',
      secondary: 'to eat',
    },
  },
  dueDate: new Date(),
  priority: 5,
  availableStudyModes: [StudyMode.RECOGNITION, StudyMode.RECALL],
  metadata: {
    difficulty: 3,
    tags: ['verbs', 'basic', 'food'],
    source: {
      textbook: 'genki-1',
      lesson: 3,
    },
  },
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
  updatedAt: new Date(),
  ...overrides,
});

export const createMockGroupedItems = (overrides?: Partial<GroupedReviewItems>): GroupedReviewItems => {
  const vocabularyItem = createMockReviewItem();
  const kanjiItem = createMockReviewItem({
    id: 'kanji-item-1',
    sourceId: 'kanji-mastery',
    contentType: ContentType.KANJI,
    content: {
      primary: '食',
      secondary: 'food, eat',
      context: 'Basic kanji for food-related words',
    },
  });

  return {
    bySource: {
      'textbook-vocabulary': {
        source: createMockTextbookVocabularySource(),
        items: [vocabularyItem],
        stats: createMockSourceStats('vocabulary'),
      },
      'kanji-mastery': {
        source: createMockKanjiMasterySource(),
        items: [kanjiItem],
        stats: createMockSourceStats('kanji'),
      },
    },
    byContentType: {
      [ContentType.VOCABULARY]: [vocabularyItem],
      [ContentType.KANJI]: [kanjiItem],
    },
    byPriority: {
      [SourcePriority.HIGH]: [vocabularyItem, kanjiItem],
    },
    byDueDate: {
      overdue: [],
      today: [vocabularyItem, kanjiItem],
      tomorrow: [],
      thisWeek: [],
      later: [],
    },
    totals: {
      items: 2,
      sources: 2,
      dueToday: 2,
      overdue: 0,
    },
    ...overrides,
  };
};

// ============================================================================
// Mock Registry
// ============================================================================

export const createMockRegistry = () => ({
  getInstance: jest.fn(),
  register: jest.fn().mockResolvedValue(undefined),
  init: jest.fn().mockResolvedValue(undefined),
  getAggregatedStats: jest.fn().mockResolvedValue(createMockAggregatedStats()),
  getAllDueItems: jest.fn().mockResolvedValue(createMockGroupedItems()),
  getPrioritizedSources: jest.fn().mockReturnValue([
    createMockTextbookVocabularySource(),
    createMockKanjiMasterySource(),
    createMockFlashcardsSource(),
  ]),
  getUserPreferences: jest.fn().mockReturnValue({
    enabled: {
      'textbook-vocabulary': true,
      'kanji-mastery': true,
      'flashcards': true,
    },
    priorities: {
      'textbook-vocabulary': SourcePriority.HIGH,
      'kanji-mastery': SourcePriority.HIGH,
      'flashcards': SourcePriority.MEDIUM,
    },
  }),
  updateSourcePriority: jest.fn(),
  setSourceEnabled: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  destroy: jest.fn().mockResolvedValue(undefined),
});

// ============================================================================
// Test Helper Functions
// ============================================================================

export const setupMockTime = (hour: number, minute: number = 0) => {
  const mockDate = new Date();
  mockDate.setHours(hour, minute, 0, 0);
  jest.setSystemTime(mockDate);
  return mockDate;
};

export const setupGoldenTimeMorning = () => setupMockTime(8); // 8 AM
export const setupGoldenTimeEvening = () => setupMockTime(19); // 7 PM
export const setupNonGoldenTime = () => setupMockTime(14); // 2 PM

export const createEmptyStats = (): AggregatedStats => ({
  ...createMockAggregatedStats(),
  totals: {
    items: 0,
    dueToday: 0,
    overdue: 0,
    sources: 0,
    activeSources: 0,
  },
});

export const createOverdueStats = (): AggregatedStats => ({
  ...createMockAggregatedStats(),
  totals: {
    items: 150,
    dueToday: 25,
    overdue: 15, // High overdue count
    sources: 3,
    activeSources: 3,
  },
});

export const setupErrorState = (registry: any, errorMessage: string) => {
  registry.init.mockRejectedValue(new Error(errorMessage));
  registry.getAggregatedStats.mockRejectedValue(new Error(errorMessage));
  registry.getAllDueItems.mockRejectedValue(new Error(errorMessage));
};

// ============================================================================
// Auth Context Mocks
// ============================================================================

export const createMockAuthContext = (userType: 'guest' | 'free' | 'premium' = 'free') => {
  const contexts = {
    guest: {
      user: null,
      userType: 'guest' as const,
      subscriptionTier: 'free' as const,
      loading: false,
    },
    free: {
      user: { uid: 'test-user-id', email: 'test@example.com' },
      userType: 'free' as const,
      subscriptionTier: 'free' as const,
      loading: false,
    },
    premium: {
      user: { uid: 'premium-user-id', email: 'premium@example.com' },
      userType: 'premium' as const,
      subscriptionTier: 'premium' as const,
      loading: false,
    },
  };

  return contexts[userType];
};

// ============================================================================
// Router Mocks
// ============================================================================

export const createMockRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
});

export const createMockSearchParams = (params: Record<string, string> = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return searchParams;
};

// ============================================================================
// Storage Mocks
// ============================================================================

export const setupMockSessionStorage = () => {
  const storage: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => storage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
  };
};

// ============================================================================
// Test Scenario Helpers
// ============================================================================

export const waitForHubToLoad = () => waitFor(() => {
  expect(screen.getByText('Review Hub')).toBeInTheDocument();
});

export const waitForLoadingToComplete = () => waitFor(() => {
  expect(screen.queryByText('Loading review system...')).not.toBeInTheDocument();
});

export const expectSourceCardVisible = (sourceName: string) => {
  expect(screen.getByText(sourceName)).toBeInTheDocument();
};

export const expectStatsVisible = (dueCount: number, totalItems: number) => {
  expect(screen.getByText(dueCount.toString())).toBeInTheDocument();
  expect(screen.getByText(totalItems.toString())).toBeInTheDocument();
};