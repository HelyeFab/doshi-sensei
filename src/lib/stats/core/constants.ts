/**
 * Constants for the stats system
 * Centralized configuration values
 */

import { StatsConfig, CircuitBreakerConfig } from './interfaces';

// Storage keys
export const STORAGE_KEYS = {
  STATS: 'statsV2',
  ACTIVITIES: 'dailyActivities',
  BACKUP: 'statsBackup',
  CACHE: 'statsCache'
} as const;

// Default configuration
export const DEFAULT_CONFIG: StatsConfig = {
  version: '2.1',
  syncInterval: 30000, // 30 seconds
  batchSize: 50,
  maxRetryAttempts: 3,
  initialRetryDelay: 1000, // 1 second
  cacheSize: 1000,
  cacheTtl: 300000 // 5 minutes
} as const;

// Circuit breaker configuration
export const CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 30000 // 30 seconds
} as const;

// Timeouts
export const TIMEOUTS = {
  CLOUD_LOAD: 10000, // 10 seconds
  CLOUD_SAVE: 15000, // 15 seconds
  SYNC_DEBOUNCE: 5000 // 5 seconds
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  MAX_SCORE: 1000000,
  MAX_DURATION: 86400000, // 24 hours in ms
  MAX_ACTIVITIES_PER_DAY: 1000,
  MIN_TIMESTAMP: 946684800000, // Year 2000
  MAX_TIMESTAMP: 4102444800000 // Year 2100
} as const;

// Array size limits to prevent unbounded growth (Issue #3)
export const ARRAY_SIZE_LIMITS = {
  MAX_LEARNED_KANJI: 10000,  // Maximum kanji that can be stored
  MAX_LEARNED_WORDS: 10000,  // Maximum words that can be stored
  MAX_CAUGHT_POKEMON: 1000,  // Maximum Pokemon that can be stored
  // Buffer size for FIFO operation - when limit is reached, trim to this size
  TRIM_TO_SIZE_KANJI: 8000,  // 80% of max, keeping most recent 8000 kanji
  TRIM_TO_SIZE_WORDS: 8000,  // 80% of max, keeping most recent 8000 words
  TRIM_TO_SIZE_POKEMON: 800, // 80% of max, keeping most recent 800 Pokemon
} as const;

// Cache keys
export const CACHE_KEYS = {
  DAILY_ACTIVITY: (date: string) => `daily_${date}`,
  ACTIVITIES_RANGE: (start: string, end: string) => `range_${start}_${end}`,
  POKEMON_COUNT: 'pokemon_count',
  SYNC_STATUS: 'sync_status'
} as const;

// Event names
export const EVENTS = {
  STATS_UPDATED: 'stats_updated',
  ACTIVITY_PROCESSED: 'activity_processed',
  STREAK_CHANGED: 'streak_changed',
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  CACHE_UPDATED: 'cache_updated',
  VALIDATION_FAILED: 'validation_failed'
} as const;

// Firebase collection paths
export const FIREBASE_PATHS = {
  USER_STATS: (userId: string) => `userStats/${userId}/current`,
  DAILY_ACTIVITIES: (userId: string) => `userStats/${userId}/dailyActivities`,
  USER_DOC: (userId: string) => `users/${userId}`
} as const;

// Activity type mappings
export const ACTIVITY_TYPE_MAPPINGS = {
  drill: 'drillsCompleted',
  story: 'storiesRead',
  article: 'articlesRead',
  kanji: 'kanjiStudySessions',
  game: 'gamesPlayed',
  vocab: 'vocabStudied',
  flashcard: 'flashcardsReviewed',
  practice: 'practiceSessionsCompleted'
} as const;

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  SYNC_ERROR: 'SYNC_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN'
} as const;

// Logging prefixes
export const LOG_PREFIXES = {
  STATS: '[Stats]',
  STORAGE: '[Storage]',
  SYNC: '[Sync]',
  CACHE: '[Cache]',
  VALIDATOR: '[Validator]',
  PROCESSOR: '[Processor]',
  STREAK: '[Streak]',
  AGGREGATOR: '[Aggregator]',
  EVENT_BUS: '[EventBus]'
} as const;