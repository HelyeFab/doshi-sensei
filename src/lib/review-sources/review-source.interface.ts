/**
 * Review Source Interface - Unified Review Hub Architecture
 * 
 * This file defines the core interfaces for the Unified Review Hub system.
 * Each review source (Kanji Mastery, Textbook Vocabulary, Flashcards, etc.)
 * implements these interfaces to provide a consistent experience.
 * 
 * Features:
 * - Unified interface for all review sources
 * - Flexible content type system
 * - Source-specific configuration options
 * - Performance analytics and statistics
 * - Priority and scheduling support
 */

import { ContentType, StudyMode } from '@/lib/unified-review/types';

// ============================================================================
// Core Enums and Types
// ============================================================================

/**
 * Review source types available in the system
 */
export enum ReviewSourceType {
  KANJI_MASTERY = 'kanji-mastery',
  TEXTBOOK_VOCABULARY = 'textbook-vocabulary', 
  FLASHCARDS = 'flashcards',
  GRAMMAR_DRILLS = 'grammar-drills',
  CUSTOM_LISTS = 'custom-lists',
  SHADOWING_PRACTICE = 'shadowing-practice',
  READING_COMPREHENSION = 'reading-comprehension',
  LISTENING_PRACTICE = 'listening-practice'
}

/**
 * Priority levels for review sources
 */
export enum SourcePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4
}

/**
 * Review source status
 */
export enum SourceStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DISABLED = 'disabled',
  ERROR = 'error'
}

// ============================================================================
// Review Item Interface
// ============================================================================

/**
 * Universal review item structure that all sources must provide
 */
export interface ReviewItem {
  /** Unique identifier for the item */
  id: string;
  
  /** Source this item comes from */
  sourceId: string;
  
  /** Content type classification */
  contentType: ContentType;
  
  /** Source-specific content data */
  content: ReviewItemContent;
  
  /** When this item is due for review */
  dueDate: Date;
  
  /** Priority level (1-10, higher = more important) */
  priority: number;
  
  /** Study modes available for this item */
  availableStudyModes: StudyMode[];
  
  /** Metadata specific to the source */
  metadata: {
    /** Source-specific properties */
    source?: Record<string, any>;
    /** Tags for categorization */
    tags?: string[];
    /** Difficulty level (1-10) */
    difficulty?: number;
    /** References to related items */
    relatedItems?: string[];
    /** Custom properties */
    properties?: Record<string, any>;
  };
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Content structure for review items
 */
export interface ReviewItemContent {
  /** Primary display content (question/front side) */
  primary: string;
  
  /** Secondary content (answer/back side) */
  secondary: string;
  
  /** Additional context or hints */
  context?: string;
  
  /** Audio content if available */
  audio?: {
    url?: string;
    blob?: Blob;
    autoPlay?: boolean;
  };
  
  /** Image content if available */
  image?: {
    url?: string;
    blob?: Blob;
    alt?: string;
  };
  
  /** Formatted content with furigana, highlighting, etc. */
  formatted?: {
    primary?: string;
    secondary?: string;
    context?: string;
  };
  
  /** Source-specific content extensions */
  extensions?: Record<string, any>;
}

// ============================================================================
// Source Statistics Interface
// ============================================================================

/**
 * Statistics for a review source
 */
export interface SourceStats {
  /** Total items in this source */
  totalItems: number;
  
  /** Items due today */
  dueToday: number;
  
  /** Overdue items */
  overdue: number;
  
  /** Items scheduled for future reviews */
  scheduled: number;
  
  /** New items not yet reviewed */
  newItems: number;
  
  /** Items by content type */
  itemsByType: Record<ContentType, number>;
  
  /** Items by priority level */
  itemsByPriority: Record<SourcePriority, number>;
  
  /** Average mastery level (0-100) */
  averageMastery: number;
  
  /** Retention rate (0-100) */
  retentionRate: number;
  
  /** Last review session timestamp */
  lastReviewSession?: Date;
  
  /** Study streak (days) */
  studyStreak: number;
  
  /** Performance trends */
  trends: {
    accuracy: 'improving' | 'stable' | 'declining';
    speed: 'improving' | 'stable' | 'declining';
    retention: 'improving' | 'stable' | 'declining';
  };
}

/**
 * Configuration options for a review source
 */
export interface SourceConfig {
  /** Whether the source is enabled */
  enabled: boolean;
  
  /** Maximum items to include in reviews */
  maxItems?: number;
  
  /** Priority multiplier for this source */
  priorityMultiplier: number;
  
  /** Preferred study modes */
  preferredStudyModes?: StudyMode[];
  
  /** Source-specific settings */
  settings: Record<string, any>;
  
  /** Scheduling preferences */
  scheduling?: {
    /** Review frequency preference */
    frequency?: 'low' | 'normal' | 'high';
    /** Time windows for reviews */
    timeWindows?: Array<{ start: string; end: string; weight: number }>;
    /** Minimum interval between reviews (minutes) */
    minInterval?: number;
  };
}

// ============================================================================
// Review Source Interface
// ============================================================================

/**
 * Core interface that all review sources must implement
 */
export interface ReviewSource {
  /** Unique identifier for this source */
  readonly id: string;
  
  /** Display name */
  readonly name: string;
  
  /** Source type */
  readonly type: ReviewSourceType;
  
  /** Icon identifier */
  readonly icon: string;
  
  /** Description */
  readonly description: string;
  
  /** Navigation paths */
  readonly paths: {
    /** Main page for this source */
    main: string;
    /** Settings page if available */
    settings?: string;
    /** Statistics page if available */
    stats?: string;
  };
  
  /** Supported content types */
  readonly supportedContentTypes: ContentType[];
  
  /** Current source status */
  readonly status: SourceStatus;
  
  /** Current configuration */
  config: SourceConfig;
  
  // ---- Core Methods ----
  
  /**
   * Initialize the review source
   */
  init(): Promise<void>;
  
  /**
   * Get items due for review
   */
  getDueItems(options?: {
    limit?: number;
    priority?: SourcePriority;
    contentTypes?: ContentType[];
    studyModes?: StudyMode[];
  }): Promise<ReviewItem[]>;
  
  /**
   * Get current statistics for this source
   */
  getStats(): Promise<SourceStats>;
  
  /**
   * Update source configuration
   */
  updateConfig(config: Partial<SourceConfig>): Promise<void>;
  
  /**
   * Process a review result from this source
   */
  processReview(itemId: string, result: ReviewResult): Promise<void>;
  
  /**
   * Search for specific items within this source
   */
  searchItems(query: string, options?: {
    contentTypes?: ContentType[];
    limit?: number;
  }): Promise<ReviewItem[]>;
  
  /**
   * Get item by ID
   */
  getItem(itemId: string): Promise<ReviewItem | null>;
  
  /**
   * Check if the source is available and healthy
   */
  healthCheck(): Promise<boolean>;
  
  // ---- Optional Methods ----
  
  /**
   * Bulk add items to this source (optional)
   */
  addItems?(items: Omit<ReviewItem, 'id' | 'sourceId' | 'createdAt' | 'updatedAt'>[]): Promise<string[]>;
  
  /**
   * Remove items from this source (optional)
   */
  removeItems?(itemIds: string[]): Promise<void>;
  
  /**
   * Export items from this source (optional)
   */
  exportItems?(format: 'json' | 'csv' | 'anki'): Promise<string | Blob>;
  
  /**
   * Import items to this source (optional)
   */
  importItems?(data: string | File, format: 'json' | 'csv' | 'anki'): Promise<number>;
  
  /**
   * Get detailed analytics (optional)
   */
  getDetailedAnalytics?(): Promise<DetailedSourceAnalytics>;
  
  /**
   * Cleanup resources when source is destroyed
   */
  destroy?(): Promise<void>;
}

/**
 * Result of processing a review
 */
export interface ReviewResult {
  /** Item that was reviewed */
  itemId: string;
  
  /** User's rating (1-4) */
  rating: number;
  
  /** Time taken to respond (seconds) */
  responseTime: number;
  
  /** Study mode used */
  studyMode: StudyMode;
  
  /** Whether hints were used */
  hintsUsed: boolean;
  
  /** User's typed answer (if applicable) */
  userAnswer?: string;
  
  /** Review timestamp */
  timestamp: Date;
  
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Detailed analytics for a review source
 */
export interface DetailedSourceAnalytics {
  /** Basic stats */
  stats: SourceStats;
  
  /** Performance over time */
  performance: {
    daily: Array<{ date: string; reviewed: number; accuracy: number }>;
    weekly: Array<{ week: string; reviewed: number; accuracy: number }>;
    monthly: Array<{ month: string; reviewed: number; accuracy: number }>;
  };
  
  /** Content type breakdown */
  contentAnalysis: Array<{
    type: ContentType;
    total: number;
    mastered: number;
    struggling: number;
    averageRetention: number;
  }>;
  
  /** Study mode effectiveness */
  studyModeAnalysis: Array<{
    mode: StudyMode;
    usage: number;
    accuracy: number;
    averageTime: number;
  }>;
  
  /** Difficulty distribution */
  difficultyAnalysis: Array<{
    level: number;
    count: number;
    accuracy: number;
  }>;
  
  /** Recommendations */
  recommendations: Array<{
    type: 'focus_area' | 'study_mode' | 'schedule' | 'difficulty';
    message: string;
    priority: 'low' | 'medium' | 'high';
    action?: string;
  }>;
}

// ============================================================================
// Grouped Review Items
// ============================================================================

/**
 * Items grouped by source for display
 */
export interface GroupedReviewItems {
  /** Items organized by source */
  bySource: Record<string, {
    source: ReviewSource;
    items: ReviewItem[];
    stats: SourceStats;
  }>;
  
  /** Items organized by content type */
  byContentType: Record<ContentType, ReviewItem[]>;
  
  /** Items organized by priority */
  byPriority: Record<SourcePriority, ReviewItem[]>;
  
  /** Items organized by due date */
  byDueDate: {
    overdue: ReviewItem[];
    today: ReviewItem[];
    tomorrow: ReviewItem[];
    thisWeek: ReviewItem[];
    later: ReviewItem[];
  };
  
  /** Total counts */
  totals: {
    items: number;
    sources: number;
    dueToday: number;
    overdue: number;
  };
}

// ============================================================================
// Aggregated Statistics
// ============================================================================

/**
 * Combined statistics from all sources
 */
export interface AggregatedStats {
  /** Overall totals */
  totals: {
    items: number;
    dueToday: number;
    overdue: number;
    sources: number;
    activeSources: number;
  };
  
  /** Combined statistics by content type */
  byContentType: Record<ContentType, {
    total: number;
    dueToday: number;
    overdue: number;
    averageMastery: number;
    retentionRate: number;
  }>;
  
  /** Combined statistics by source */
  bySource: Record<string, SourceStats>;
  
  /** Overall performance metrics */
  performance: {
    averageMastery: number;
    overallRetention: number;
    studyStreak: number;
    lastActivity?: Date;
  };
  
  /** Review load distribution */
  distribution: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    nextWeek: number;
    later: number;
  };
  
  /** Trends and insights */
  insights: {
    mostActiveSource: string;
    strugglingAreas: ContentType[];
    recommendations: string[];
    nextReviewEstimate?: Date;
  };
}

// ============================================================================
// Source Events
// ============================================================================

/**
 * Events that sources can emit for the registry to handle
 */
export enum ReviewSourceEvent {
  ITEMS_UPDATED = 'items_updated',
  CONFIG_CHANGED = 'config_changed',
  STATUS_CHANGED = 'status_changed',
  ERROR_OCCURRED = 'error_occurred',
  STATS_UPDATED = 'stats_updated'
}

/**
 * Event data structure
 */
export interface SourceEventData {
  sourceId: string;
  event: ReviewSourceEvent;
  data: any;
  timestamp: Date;
}

/**
 * Event listener function type
 */
export type SourceEventListener = (eventData: SourceEventData) => void;