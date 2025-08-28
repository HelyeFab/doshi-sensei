/**
 * Core interfaces and types for the modular stats system
 * Provides type safety and contracts for all modules
 */

import { User } from 'firebase/auth';
import { Subscription } from '../../subscriptions/types';

// Activity event types
export type ActivityType = 'drill' | 'story' | 'article' | 'kanji' | 'game' | 'vocab' | 'flashcard' | 'practice';

// Core activity event interface
export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId?: string;
  details: ActivityDetails;
}

// Activity details interface
export interface ActivityDetails {
  itemId?: string;
  itemTitle?: string;
  score?: number;
  duration?: number;
  correct?: number;
  total?: number;
  gameType?: string;
  feature?: string;
}

// Daily activity summary
export interface DailySummary {
  totalActivities: number;
  drillsCompleted: number;
  storiesRead: number;
  articlesRead: number;
  kanjiStudied: number;
  gamesPlayed: number;
  vocabStudied: number;
  flashcardsReviewed: number;
  practiceSessionsCompleted: number;
  totalScore: number;
  totalCorrect: number;
  totalQuestions: number;
}

// Daily activity container
export interface DailyActivity {
  date: string; // YYYY-MM-DD format
  activities: ActivityEvent[];
  summary: DailySummary;
  lastUpdated?: number;
}

// Activity-specific stats
export interface ActivityStats {
  totalQuestions: number;
  totalCorrect: number;
}

// Complete user stats
export interface UserStatsV2 {
  // User identification
  userId: string;
  
  // Core stats
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string;
  firstActiveDate: string;
  
  // Activity totals
  totalActivities: number;
  drillsCompleted: number;
  storiesRead: number;
  articlesRead: number;
  kanjiStudySessions: number;
  gamesPlayed: number;
  vocabStudied: number;
  flashcardsReviewed: number;
  practiceSessionsCompleted: number;
  
  // Performance metrics
  overallAccuracy: number;
  drillAccuracy: number;
  kanjiAccuracy: number;
  gameAccuracy: number;
  
  // Totals
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalKanjiLearned: number;
  totalWordsLearned: number;
  totalGameScore: number;
  
  // Pokemon specific
  pokemonCaught: number;
  
  // Unique items tracking
  learnedKanjiSet: string[];
  learnedWordsSet: string[];
  caughtPokemonSet: string[];
  
  // Activity-specific metrics
  drillStats: ActivityStats;
  kanjiStats: ActivityStats;
  gameStats: ActivityStats;
  
  // Metadata
  lastUpdated: number;
  version: string;
}

// Storage strategy interface
export interface IStorageStrategy {
  load(): Promise<UserStatsV2 | null>;
  save(stats: UserStatsV2): Promise<void>;
  clear(): Promise<void>;
  getName(): string;
}

// Storage repository interface
export interface IStatsStorage {
  getStats(): Promise<UserStatsV2 | null>;
  saveStats(stats: UserStatsV2): Promise<void>;
  getDailyActivity(date: string): Promise<DailyActivity | null>;
  saveDailyActivity(date: string, activity: DailyActivity): Promise<void>;
  getActivitiesRange(startDate: string, endDate: string): Promise<DailyActivity[]>;
  createBackup(stats: UserStatsV2): Promise<void>;
  recoverFromBackup(): Promise<UserStatsV2 | null>;
  clearAll(): Promise<void>;
}

// Activity processor interface
export interface IActivityProcessor {
  processActivity(event: ActivityEvent, stats: UserStatsV2, dailyActivity: DailyActivity): Promise<void>;
  validateActivity(event: ActivityEvent): boolean;
  sanitizeActivity(event: ActivityEvent): ActivityEvent;
}

// Streak calculator interface
export interface IStreakCalculator {
  calculateCurrentStreak(activityDates: Set<string>): number;
  calculateLongestStreak(activityDates: Set<string>): number;
  updateStreak(stats: UserStatsV2, activityDate: string): void;
  validateStreak(stats: UserStatsV2, activityDates: Set<string>): boolean;
}

// Sync manager interface
export interface IStatsSyncManager {
  sync(): Promise<SyncResult>;
  forceSync(): Promise<SyncResult>;
  getSyncStatus(): SyncStatus;
  startPeriodicSync(): void;
  stopPeriodicSync(): void;
}

// Aggregator interface
export interface IStatsAggregator {
  aggregateDaily(activities: ActivityEvent[]): DailySummary;
  aggregateWeekly(dailyActivities: DailyActivity[]): WeeklySummary;
  aggregateMonthly(dailyActivities: DailyActivity[]): MonthlySummary;
  recalculateTotals(stats: UserStatsV2, dailyActivities: Map<string, DailyActivity>): UserStatsV2;
}

// Event bus interface
export interface IStatsEventBus {
  subscribe<T>(event: StatsEvent, callback: EventCallback<T>): () => void;
  emit<T>(event: StatsEvent, data: T): void;
  clear(): void;
}

// Cache interface
export interface IStatsCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

// Validator interface
export interface IStatsValidator {
  validateActivity(event: ActivityEvent): ValidationResult;
  validateStats(stats: UserStatsV2): ValidationResult;
  validateDailyActivity(activity: DailyActivity): ValidationResult;
  sanitizeInput<T>(input: T, schema: ValidationSchema): T;
}

// Supporting types
export interface SyncResult {
  success: boolean;
  error?: string;
  timestamp: number;
  itemsSynced?: number;
}

export interface SyncStatus {
  inProgress: boolean;
  lastSyncTime: number;
  lastError: string | null;
  isPremium: boolean;
  userId: string | null;
}

export interface WeeklySummary extends DailySummary {
  daysActive: number;
  averageAccuracy: number;
}

export interface MonthlySummary extends WeeklySummary {
  streakDays: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationRule {
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

// Event types
export type StatsEvent = 
  | 'stats_updated'
  | 'activity_processed'
  | 'streak_changed'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'cache_updated'
  | 'validation_failed'
  | 'array_limit_hit'
  | 'array_migration_completed';

export type EventCallback<T> = (data: T) => void;

// Update listener type
export type StatsUpdateListener = (stats: UserStatsV2) => void;

// Configuration interfaces
export interface StatsConfig {
  version: string;
  syncInterval: number;
  batchSize: number;
  maxRetryAttempts: number;
  initialRetryDelay: number;
  cacheSize: number;
  cacheTtl: number;
}

export interface UserContext {
  user: User | null;
  subscription: Subscription | null;
  isGuest: boolean;
  isPremium: boolean;
}

// Circuit breaker states
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

// Error types
export class StatsError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'StatsError';
  }
}

export class ValidationError extends StatsError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR', false);
    this.name = 'ValidationError';
  }
}

export class StorageError extends StatsError {
  constructor(message: string, public operation: string) {
    super(message, 'STORAGE_ERROR', true);
    this.name = 'StorageError';
  }
}

export class SyncError extends StatsError {
  constructor(message: string, public syncType: string) {
    super(message, 'SYNC_ERROR', true);
    this.name = 'SyncError';
  }
}