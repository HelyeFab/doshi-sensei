/**
 * Core types for the Unified Review Engine (URE)
 * 
 * This file defines the fundamental data structures and interfaces
 * that power the unified review system across all content types.
 */

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Supported content types in the review system
 */
export enum ContentType {
  KANJI = 'kanji',
  VOCABULARY = 'vocabulary', 
  FLASHCARD = 'flashcard',
  GRAMMAR = 'grammar',
  SENTENCE = 'sentence',
  RADICAL = 'radical',
  CUSTOM = 'custom'
}

/**
 * Available spaced repetition algorithms
 */
export enum AlgorithmType {
  FSRS = 'fsrs',
  SM2 = 'sm2', 
  ANKI = 'anki',
  SIMPLE = 'simple'
}

/**
 * Review response ratings (standardized across algorithms)
 */
export enum ReviewRating {
  AGAIN = 1,     // Complete failure
  HARD = 2,      // Incorrect but some knowledge
  GOOD = 3,      // Correct with effort
  EASY = 4       // Correct with ease
}

/**
 * Study modes for different learning approaches
 */
export enum StudyMode {
  RECOGNITION = 'recognition',  // See kanji/word → recall meaning
  PRODUCTION = 'production',    // See meaning → produce kanji/word
  READING = 'reading',         // See kanji → recall reading
  LISTENING = 'listening',     // Hear word → recall meaning/writing
  TYPING = 'typing'           // Type the word/reading
}

/**
 * Session mixing strategies
 */
export enum MixStrategy {
  INTERLEAVED = 'interleaved',  // Mix all types randomly
  BLOCKED = 'blocked',          // Group by type
  ADAPTIVE = 'adaptive'         // Smart mixing based on performance
}

// ============================================================================
// Core Data Structures
// ============================================================================

/**
 * Universal representation of any reviewable content
 */
export interface ReviewItem {
  /** Unique identifier */
  id: string;
  
  /** Content type classification */
  type: ContentType;
  
  /** Type-specific content data */
  content: KanjiContent | VocabularyContent | FlashcardContent | any;
  
  /** Additional metadata */
  metadata: {
    /** Source of the content (textbook, user-created, etc.) */
    source?: string;
    /** Tags for categorization */
    tags?: string[];
    /** Difficulty level (1-10) */
    difficulty?: number;
    /** Review priority (higher = more important) */
    priority?: number;
    /** References to related items */
    relatedItems?: string[];
    /** Custom properties per content type */
    properties?: Record<string, any>;
  };
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * User's progress for a specific review item
 */
export interface ReviewProgress {
  /** Reference to the review item */
  itemId: string;
  
  /** User identifier */
  userId: string;
  
  /** Active spaced repetition algorithm */
  algorithm: AlgorithmType;
  
  /** Algorithm-specific state data */
  algorithmData: FSRSData | SM2Data | AnkiData | SimpleData;
  
  // ---- Review Scheduling ----
  /** Next scheduled review time */
  nextReview: Date;
  
  /** Last review completion time */
  lastReview?: Date;
  
  /** Total number of reviews completed */
  reviewCount: number;
  
  // ---- Performance Metrics ----
  /** Overall mastery level (0-100) */
  masteryLevel: number;
  
  /** Success rate across all reviews */
  retentionRate: number;
  
  /** Average response time in seconds */
  averageResponseTime: number;
  
  /** Study mode specific statistics */
  studyModes: Record<StudyMode, ModeStats>;
  
  // ---- Tracking ----
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Last successful cloud sync timestamp */
  syncedAt?: Date;
  
  /** Whether this item is marked for deletion */
  deleted?: boolean;
}

/**
 * Performance statistics for a specific study mode
 */
export interface ModeStats {
  /** Total attempts in this mode */
  attempts: number;
  
  /** Successful attempts */
  successes: number;
  
  /** Average response time in seconds */
  averageTime: number;
  
  /** Last attempt timestamp */
  lastAttempt?: Date;
  
  /** Consecutive correct answers */
  streak: number;
}

// ============================================================================
// Content Type Definitions
// ============================================================================

/**
 * Kanji-specific content structure
 */
export interface KanjiContent {
  /** The kanji character */
  character: string;
  
  /** Grade level (1-6 for elementary, 7+ for secondary) */
  grade?: number;
  
  /** JLPT level (N1-N5) */
  jlpt?: string;
  
  /** Stroke count */
  strokes: number;
  
  /** On-yomi readings */
  onyomi: string[];
  
  /** Kun-yomi readings */
  kunyomi: string[];
  
  /** English meanings */
  meanings: string[];
  
  /** Radicals that compose this kanji */
  radicals?: string[];
  
  /** Example words using this kanji */
  examples?: {
    word: string;
    reading: string;
    meaning: string;
  }[];
}

/**
 * Vocabulary-specific content structure
 */
export interface VocabularyContent {
  /** The word in Japanese */
  word: string;
  
  /** Reading (hiragana/katakana) */
  reading: string;
  
  /** English definitions */
  meanings: string[];
  
  /** Part of speech */
  partOfSpeech: string[];
  
  /** JLPT level (N1-N5) */
  jlpt?: string;
  
  /** Audio file URL or blob */
  audio?: string | Blob;
  
  /** Example sentences */
  examples?: {
    japanese: string;
    english: string;
    reading?: string;
  }[];
  
  /** Word frequency ranking */
  frequency?: number;
}

/**
 * Flashcard-specific content structure
 */
export interface FlashcardContent {
  /** Front side content */
  front: {
    text: string;
    image?: string | Blob;
    audio?: string | Blob;
  };
  
  /** Back side content */
  back: {
    text: string;
    image?: string | Blob;
    audio?: string | Blob;
  };
  
  /** Additional notes */
  notes?: string;
  
  /** Deck this card belongs to */
  deck?: string;
}

// ============================================================================
// Algorithm Data Structures  
// ============================================================================

/**
 * FSRS algorithm state data
 */
export interface FSRSData {
  /** Memory stability */
  stability: number;
  
  /** Memory difficulty */
  difficulty: number;
  
  /** Days since last review */
  daysSinceLastReview: number;
  
  /** State: New, Learning, Review, or Relearning */
  state: 'new' | 'learning' | 'review' | 'relearning';
  
  /** Due date */
  due: Date;
  
  /** Number of reviews */
  reps: number;
  
  /** Number of lapses */
  lapses: number;
}

/**
 * SuperMemo 2 algorithm state data
 */
export interface SM2Data {
  /** Ease factor */
  easeFactor: number;
  
  /** Interval in days */
  interval: number;
  
  /** Number of repetitions */
  repetitions: number;
  
  /** Due date */
  due: Date;
  
  /** Number of lapses */
  lapses: number;
}

/**
 * Anki-style algorithm state data
 */
export interface AnkiData {
  /** Ease factor (modified SM2) */
  easeFactor: number;
  
  /** Current interval in days */
  interval: number;
  
  /** Step index for new/relearning cards */
  step: number;
  
  /** Card type: new, learning, review, or relearning */
  type: 'new' | 'learning' | 'review' | 'relearning';
  
  /** Due date */
  due: Date;
  
  /** Queue position for new cards */
  queue: number;
  
  /** Left steps for learning cards */
  left: number;
}

/**
 * Simple intervals algorithm state data
 */
export interface SimpleData {
  /** Current level (0-7 corresponding to intervals) */
  level: number;
  
  /** Due date */
  due: Date;
  
  /** Number of correct answers in a row */
  streak: number;
}

// ============================================================================
// Algorithm Interface
// ============================================================================

/**
 * Interface that all spaced repetition algorithms must implement
 */
export interface ReviewAlgorithm {
  /** Algorithm name */
  readonly name: string;
  
  /** Algorithm version */
  readonly version: string;
  
  /**
   * Process a review response and update progress
   */
  processReview(
    item: ReviewItem,
    rating: ReviewRating,
    responseTime: number,
    progress?: ReviewProgress
  ): ReviewProgress;
  
  /**
   * Calculate the next review date for an item
   */
  calculateNextReview(progress: ReviewProgress): Date;
  
  /**
   * Get items due for review
   */
  getDueItems(
    items: ReviewProgress[],
    limit?: number,
    now?: Date
  ): ReviewProgress[];
  
  /**
   * Optimize the review schedule (optional)
   */
  optimizeSchedule?(items: ReviewProgress[]): ReviewProgress[];
  
  /**
   * Adjust difficulty based on performance (optional)
   */
  adjustDifficulty?(
    item: ReviewItem,
    performance: PerformanceMetrics
  ): number;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Configuration for a review session
 */
export interface SessionPreferences {
  /** Maximum number of items to review */
  maxItems?: number;
  
  /** Maximum session duration in minutes */
  maxDuration?: number;
  
  /** Content types to include */
  contentTypes?: ContentType[];
  
  /** Study modes to include */
  studyModes?: StudyMode[];
  
  /** How to mix different content types */
  mixStrategy?: MixStrategy;
  
  /** Algorithm preference */
  preferredAlgorithm?: AlgorithmType;
  
  /** Include new items */
  includeNew?: boolean;
  
  /** New items limit */
  newItemsLimit?: number;
}

/**
 * Current state of a review session
 */
export interface SessionState {
  /** Session identifier */
  sessionId: string;
  
  /** User identifier */
  userId: string;
  
  /** Items in this session */
  items: ReviewProgress[];
  
  /** Current item index */
  currentIndex: number;
  
  /** Session start time */
  startTime: Date;
  
  /** Session preferences used */
  preferences: SessionPreferences;
  
  /** Items completed so far */
  completed: ReviewResult[];
  
  /** Session statistics */
  stats: SessionStats;
}

/**
 * Result of processing a single review
 */
export interface ReviewResult {
  /** Item that was reviewed */
  itemId: string;
  
  /** User's response */
  response: ReviewResponse;
  
  /** Updated progress */
  progress: ReviewProgress;
  
  /** Processing timestamp */
  timestamp: Date;
}

/**
 * User's response to a review item
 */
export interface ReviewResponse {
  /** Rating given by user */
  rating: ReviewRating;
  
  /** Time taken to respond (seconds) */
  responseTime: number;
  
  /** Study mode used */
  studyMode: StudyMode;
  
  /** Whether hints were used */
  hintsUsed: boolean;
  
  /** User's typed answer (if applicable) */
  userAnswer?: string;
  
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Statistics for a review session
 */
export interface SessionStats {
  /** Total items reviewed */
  totalReviewed: number;
  
  /** Items answered correctly */
  correctAnswers: number;
  
  /** Average response time */
  averageResponseTime: number;
  
  /** Items by rating */
  ratingDistribution: Record<ReviewRating, number>;
  
  /** Study mode breakdown */
  studyModeStats: Record<StudyMode, ModeStats>;
}

/**
 * Session completion summary
 */
export interface SessionSummary extends SessionStats {
  /** Session duration in minutes */
  duration: number;
  
  /** Items that need more practice */
  itemsNeedingWork: string[];
  
  /** Estimated time until next review */
  nextReviewEstimate: Date;
  
  /** Performance improvement suggestions */
  suggestions: string[];
}

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * Performance metrics for analysis
 */
export interface PerformanceMetrics {
  /** Accuracy percentage */
  accuracy: number;
  
  /** Average response time */
  responseTime: number;
  
  /** Consistency score */
  consistency: number;
  
  /** Improvement trend */
  trend: 'improving' | 'stable' | 'declining';
  
  /** Weak areas that need focus */
  weakAreas: string[];
}

// ============================================================================
// Notification System
// ============================================================================

/**
 * Notification channel types
 */
export type NotificationChannelType = 'in-app' | 'push' | 'email';

/**
 * Notification options
 */
export interface NotificationOptions {
  /** Title of the notification */
  title: string;
  
  /** Message body */
  message: string;
  
  /** Optional image */
  image?: string;
  
  /** Action buttons */
  actions?: NotificationAction[];
  
  /** Time to live (TTL) in seconds */
  ttl?: number;
  
  /** Priority level */
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Notification action button
 */
export interface NotificationAction {
  /** Action identifier */
  action: string;
  
  /** Button title */
  title: string;
  
  /** Optional icon */
  icon?: string;
}

// ============================================================================
// Storage and Sync
// ============================================================================

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Database name */
  dbName: string;
  
  /** Database version */
  dbVersion: number;
  
  /** Enable cloud sync */
  enableSync: boolean;
  
  /** Sync interval in minutes */
  syncInterval: number;
  
  /** Maximum offline storage in MB */
  maxOfflineStorage: number;
}

/**
 * Sync status
 */
export interface SyncStatus {
  /** Whether sync is enabled */
  enabled: boolean;
  
  /** Last successful sync */
  lastSync?: Date;
  
  /** Pending changes count */
  pendingChanges: number;
  
  /** Current sync state */
  state: 'idle' | 'syncing' | 'error';
  
  /** Last error message */
  lastError?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * URE-specific error types
 */
export class UREError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'UREError';
  }
}

/**
 * Storage operation errors
 */
export class StorageError extends UREError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', cause);
    this.name = 'StorageError';
  }
}

/**
 * Algorithm processing errors
 */
export class AlgorithmError extends UREError {
  constructor(message: string, cause?: Error) {
    super(message, 'ALGORITHM_ERROR', cause);
    this.name = 'AlgorithmError';
  }
}

/**
 * Sync operation errors
 */
export class SyncError extends UREError {
  constructor(message: string, cause?: Error) {
    super(message, 'SYNC_ERROR', cause);
    this.name = 'SyncError';
  }
}