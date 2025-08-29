/**
 * Review Event System Type Definitions
 * Central types for the unified review event system
 */

// Event Types
export enum ReviewEventType {
  // Core review events
  ITEM_REVIEWED = 'item.reviewed',
  ITEM_SCHEDULED = 'item.scheduled',
  ITEM_ADDED = 'item.added',
  ITEM_REMOVED = 'item.removed',
  ITEM_UPDATED = 'item.updated',
  
  // Sync events
  SYNC_STARTED = 'sync.started',
  SYNC_COMPLETED = 'sync.completed',
  SYNC_FAILED = 'sync.failed',
  SYNC_CONFLICT = 'sync.conflict',
  
  // Access control events
  LIMIT_REACHED = 'access.limit_reached',
  SUBSCRIPTION_CHANGED = 'access.subscription_changed',
  USAGE_TRACKED = 'access.usage_tracked',
  
  // Analytics events
  SESSION_STARTED = 'session.started',
  SESSION_COMPLETED = 'session.completed',
  STREAK_UPDATED = 'streak.updated',
  ACHIEVEMENT_UNLOCKED = 'achievement.unlocked',
  
  // System events
  CACHE_INVALIDATED = 'system.cache_invalidated',
  ERROR_OCCURRED = 'system.error_occurred',
  MAINTENANCE_MODE = 'system.maintenance_mode'
}

// Event Priority Levels
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Review Sources
export enum ReviewSource {
  KANJI_MASTERY = 'kanji_mastery',
  TEXTBOOK_VOCAB = 'textbook_vocab',
  FLASHCARDS = 'flashcards',
  DRILL_PRACTICE = 'drill_practice',
  KANA_STUDY = 'kana_study',
  VOCABULARY_PAGE = 'vocabulary_page',
  KANJI_BROWSER = 'kanji_browser',
  REVIEW_HUB = 'review_hub',
  STORY_MODE = 'story_mode',
  GAMES = 'games'
}

// Review Actions
export enum ReviewAction {
  START = 'start',
  COMPLETE = 'complete',
  SKIP = 'skip',
  ABANDON = 'abandon',
  UNDO = 'undo'
}

// Review Results
export enum ReviewResult {
  CORRECT = 'correct',
  INCORRECT = 'incorrect',
  PARTIAL = 'partial',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout'
}

// Event Metadata
export interface EventMetadata {
  version: string;
  timestamp: number;
  environment: 'development' | 'staging' | 'production';
  deviceInfo?: {
    platform: string;
    userAgent: string;
    screen?: {
      width: number;
      height: number;
    };
  };
  sessionInfo?: {
    sessionId: string;
    duration: number;
    pageViews: number;
  };
}

// Review Event Data
export interface ReviewEventData {
  itemId: string;
  itemType: 'kanji' | 'vocabulary' | 'kana' | 'flashcard' | 'sentence';
  content?: {
    primary: string;
    secondary?: string;
    meaning?: string;
    reading?: string;
  };
  action?: ReviewAction;
  result?: ReviewResult;
  duration?: number;
  metadata?: Record<string, any>;
}

// Main Review Event Interface
export interface ReviewEvent {
  id: string;
  type: ReviewEventType;
  timestamp: number;
  source: ReviewSource;
  userId: string;
  data: ReviewEventData;
  priority: EventPriority;
  metadata: EventMetadata;
  retryCount?: number;
  processedAt?: number;
  error?: Error;
}

// Event Handler Type
export type EventHandler = (event: ReviewEvent) => Promise<void> | void;

// Subscription Options
export interface SubscriptionOptions {
  filter?: (event: ReviewEvent) => boolean;
  priority?: EventPriority;
  async?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// Unsubscribe Function
export type Unsubscribe = () => void;

// Event Queue Item
export interface QueueItem {
  event: ReviewEvent;
  priority: EventPriority;
  addedAt: number;
  attempts: number;
  lastAttempt?: number;
  error?: Error;
}

// Event Bus Configuration
export interface EventBusConfig {
  maxQueueSize?: number;
  processingInterval?: number;
  retryDelay?: number;
  maxRetries?: number;
  persistEvents?: boolean;
  enableLogging?: boolean;
}

// Event Processing Result
export interface ProcessingResult {
  success: boolean;
  event: ReviewEvent;
  error?: Error;
  duration: number;
  retries: number;
}

// Event Statistics
export interface EventStatistics {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  queuedEvents: number;
  averageProcessingTime: number;
  eventsByType: Record<ReviewEventType, number>;
  eventsBySource: Record<ReviewSource, number>;
}