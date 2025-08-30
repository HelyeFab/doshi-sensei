/**
 * Factory for creating stats objects and managing dependencies
 * Implements factory pattern for clean object creation
 */

import { User } from 'firebase/auth';
import { Subscription } from '@/lib/subscriptions/types';
import {
  UserStatsV2,
  DailyActivity,
  UserContext,
  ActivityEvent
} from '../core/interfaces';
import { DEFAULT_CONFIG } from '../core/constants';
import { mergeBoundedArrays, type ArrayEvictionMetrics } from './ArrayManager';

export class StatsFactory {
  /**
   * Create initial user stats
   */
  static createInitialStats(userId?: string): UserStatsV2 {
    return {
      userId: userId || '',
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: '',
      firstActiveDate: '',
      totalActivities: 0,
      drillsCompleted: 0,
      storiesRead: 0,
      articlesRead: 0,
      kanjiStudySessions: 0,
      gamesPlayed: 0,
      vocabStudied: 0,
      flashcardsReviewed: 0,
      practiceSessionsCompleted: 0,
      overallAccuracy: 0,
      drillAccuracy: 0,
      kanjiAccuracy: 0,
      gameAccuracy: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalKanjiLearned: 0,
      totalWordsLearned: 0,
      totalGameScore: 0,
      pokemonCaught: 0,
      learnedKanjiSet: [],
      learnedWordsSet: [],
      caughtPokemonSet: [],
      drillStats: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      kanjiStats: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      gameStats: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      lastUpdated: Date.now(),
      version: DEFAULT_CONFIG.version
    };
  }

  /**
   * Create empty daily activity
   */
  static createDailyActivity(date: string): DailyActivity {
    return {
      date,
      activities: [],
      summary: {
        totalActivities: 0,
        drillsCompleted: 0,
        storiesRead: 0,
        articlesRead: 0,
        kanjiStudied: 0,
        gamesPlayed: 0,
        vocabStudied: 0,
        flashcardsReviewed: 0,
        practiceSessionsCompleted: 0,
        totalScore: 0,
        totalCorrect: 0,
        totalQuestions: 0
      }
    };
  }

  /**
   * Create user context from user and subscription
   */
  static createUserContext(user: User | null, subscription: Subscription | null = null): UserContext {
    const isGuest = !user;
    const isPremium = user ? this.isPremiumUser(subscription) : false;

    return {
      user,
      subscription,
      isGuest,
      isPremium
    };
  }

  /**
   * Create activity event with defaults
   */
  static createActivityEvent(
    type: string,
    details: Partial<ActivityEvent['details']> = {},
    userId?: string
  ): ActivityEvent {
    const event: ActivityEvent = {
      id: this.generateActivityId(),
      type: type as any,
      timestamp: Date.now(),
      details: details || {}
    };

    if (userId) {
      event.userId = userId;
    }

    return event;
  }

  /**
   * Clone stats object with timestamp update
   */
  static cloneStats(stats: UserStatsV2): UserStatsV2 {
    return {
      ...stats,
      learnedKanjiSet: Array.isArray(stats.learnedKanjiSet) ? [...stats.learnedKanjiSet] : [],
      learnedWordsSet: Array.isArray(stats.learnedWordsSet) ? [...stats.learnedWordsSet] : [],
      caughtPokemonSet: Array.isArray(stats.caughtPokemonSet) ? [...stats.caughtPokemonSet] : [],
      drillStats: stats.drillStats ? { ...stats.drillStats } : { totalQuestions: 0, totalCorrect: 0 },
      kanjiStats: stats.kanjiStats ? { ...stats.kanjiStats } : { totalQuestions: 0, totalCorrect: 0 },
      gameStats: stats.gameStats ? { ...stats.gameStats } : { totalQuestions: 0, totalCorrect: 0 },
      lastUpdated: Date.now()
    };
  }

  /**
   * Clone daily activity
   */
  static cloneDailyActivity(activity: DailyActivity): DailyActivity {
    return {
      ...activity,
      activities: [...activity.activities],
      summary: { ...activity.summary },
      lastUpdated: Date.now()
    };
  }

  /**
   * Merge two stats objects (for conflict resolution) with bounded arrays (Issue #3 fix)
   */
  static mergeStats(
    stats1: UserStatsV2, 
    stats2: UserStatsV2,
    logger?: (message: string) => void,
    metricsCallback?: (metrics: ArrayEvictionMetrics) => void
  ): UserStatsV2 {
    return {
      ...stats1,
      // Use maximum values for cumulative stats
      currentStreak: Math.max(stats1.currentStreak, stats2.currentStreak),
      longestStreak: Math.max(stats1.longestStreak, stats2.longestStreak),
      totalDaysActive: Math.max(stats1.totalDaysActive, stats2.totalDaysActive),
      totalActivities: Math.max(stats1.totalActivities, stats2.totalActivities),
      drillsCompleted: Math.max(stats1.drillsCompleted, stats2.drillsCompleted),
      storiesRead: Math.max(stats1.storiesRead, stats2.storiesRead),
      articlesRead: Math.max(stats1.articlesRead, stats2.articlesRead),
      kanjiStudySessions: Math.max(stats1.kanjiStudySessions, stats2.kanjiStudySessions),
      gamesPlayed: Math.max(stats1.gamesPlayed, stats2.gamesPlayed),
      vocabStudied: Math.max(stats1.vocabStudied, stats2.vocabStudied),
      flashcardsReviewed: Math.max(stats1.flashcardsReviewed, stats2.flashcardsReviewed),
      practiceSessionsCompleted: Math.max(stats1.practiceSessionsCompleted, stats2.practiceSessionsCompleted),
      totalQuestionsAnswered: Math.max(stats1.totalQuestionsAnswered, stats2.totalQuestionsAnswered),
      totalCorrectAnswers: Math.max(stats1.totalCorrectAnswers, stats2.totalCorrectAnswers),
      totalKanjiLearned: Math.max(stats1.totalKanjiLearned, stats2.totalKanjiLearned),
      totalWordsLearned: Math.max(stats1.totalWordsLearned, stats2.totalWordsLearned),
      totalGameScore: Math.max(stats1.totalGameScore, stats2.totalGameScore),
      pokemonCaught: Math.max(stats1.pokemonCaught, stats2.pokemonCaught),
      
      // Use appropriate date fields
      firstActiveDate: this.getEarlierDate(stats1.firstActiveDate, stats2.firstActiveDate),
      lastActiveDate: this.getLaterDate(stats1.lastActiveDate, stats2.lastActiveDate),
      
      // Merge arrays with size limits (Issue #3 fix)
      ...this.mergeBoundedArrays(stats1, stats2, logger, metricsCallback),
      
      // Merge sub-objects (with safety checks)
      drillStats: {
        totalQuestions: Math.max(stats1.drillStats?.totalQuestions || 0, stats2.drillStats?.totalQuestions || 0),
        totalCorrect: Math.max(stats1.drillStats?.totalCorrect || 0, stats2.drillStats?.totalCorrect || 0)
      },
      kanjiStats: {
        totalQuestions: Math.max(stats1.kanjiStats?.totalQuestions || 0, stats2.kanjiStats?.totalQuestions || 0),
        totalCorrect: Math.max(stats1.kanjiStats?.totalCorrect || 0, stats2.kanjiStats?.totalCorrect || 0)
      },
      gameStats: {
        totalQuestions: Math.max(stats1.gameStats?.totalQuestions || 0, stats2.gameStats?.totalQuestions || 0),
        totalCorrect: Math.max(stats1.gameStats?.totalCorrect || 0, stats2.gameStats?.totalCorrect || 0)
      },
      
      // Use current timestamp
      lastUpdated: Date.now(),
      version: DEFAULT_CONFIG.version
    };
  }

  /**
   * Check if user has premium subscription
   */
  private static isPremiumUser(subscription: Subscription | null): boolean {
    if (!subscription) return false;
    
    // Add logic to check if subscription is active and premium
    // This depends on your subscription system implementation
    return subscription.status === 'active' && subscription.tier !== 'free';
  }

  /**
   * Generate unique activity ID
   */
  private static generateActivityId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the earlier of two date strings
   */
  private static getEarlierDate(date1: string, date2: string): string {
    if (!date1) return date2;
    if (!date2) return date1;
    return date1 < date2 ? date1 : date2;
  }

  /**
   * Get the later of two date strings
   */
  private static getLaterDate(date1: string, date2: string): string {
    if (!date1) return date2;
    if (!date2) return date1;
    return date1 > date2 ? date1 : date2;
  }

  /**
   * Merge arrays with size limits for stats merging (Issue #3 fix)
   */
  private static mergeBoundedArrays(
    stats1: UserStatsV2,
    stats2: UserStatsV2,
    logger?: (message: string) => void,
    metricsCallback?: (metrics: ArrayEvictionMetrics) => void
  ): {
    learnedKanjiSet: string[];
    learnedWordsSet: string[];
    caughtPokemonSet: string[];
    totalKanjiLearned: number;
    totalWordsLearned: number;
    pokemonCaught: number;
  } {
    // Merge kanji arrays (with safety checks)
    const kanjiResult = mergeBoundedArrays(
      stats1.learnedKanjiSet || [], 
      stats2.learnedKanjiSet || [], 
      'kanji', 
      logger
    );
    if (kanjiResult.metrics && metricsCallback) {
      metricsCallback(kanjiResult.metrics);
    }

    // Merge words arrays (with safety checks)
    const wordsResult = mergeBoundedArrays(
      stats1.learnedWordsSet || [], 
      stats2.learnedWordsSet || [], 
      'words', 
      logger
    );
    if (wordsResult.metrics && metricsCallback) {
      metricsCallback(wordsResult.metrics);
    }

    // Merge pokemon arrays (with safety checks)
    const pokemonResult = mergeBoundedArrays(
      stats1.caughtPokemonSet || [], 
      stats2.caughtPokemonSet || [], 
      'pokemon', 
      logger
    );
    if (pokemonResult.metrics && metricsCallback) {
      metricsCallback(pokemonResult.metrics);
    }

    return {
      learnedKanjiSet: kanjiResult.mergedArray,
      learnedWordsSet: wordsResult.mergedArray,
      caughtPokemonSet: pokemonResult.mergedArray,
      totalKanjiLearned: kanjiResult.mergedArray.length,
      totalWordsLearned: wordsResult.mergedArray.length,
      pokemonCaught: pokemonResult.mergedArray.length
    };
  }

  /**
   * Merge two arrays and remove duplicates (deprecated - use mergeBoundedArrays)
   * @deprecated Use mergeBoundedArrays instead for size limit enforcement
   */
  private static mergeArrays(arr1: string[], arr2: string[]): string[] {
    const combined = [...arr1, ...arr2];
    return [...new Set(combined)];
  }

  /**
   * Validate stats object structure
   */
  static validateStatsStructure(stats: any): stats is UserStatsV2 {
    if (!stats || typeof stats !== 'object') return false;
    
    const requiredFields = [
      'userId', 'version', 'lastUpdated',
      'currentStreak', 'longestStreak', 'totalDaysActive',
      'totalActivities', 'drillsCompleted', 'storiesRead'
    ];

    return requiredFields.every(field => field in stats);
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  static getDateString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * Generate test data for development
   */
  static createTestStats(userId: string): UserStatsV2 {
    return {
      ...this.createInitialStats(userId),
      totalActivities: 50,
      drillsCompleted: 20,
      storiesRead: 10,
      kanjiStudySessions: 15,
      gamesPlayed: 5,
      currentStreak: 7,
      longestStreak: 12,
      totalDaysActive: 25,
      overallAccuracy: 85,
      drillAccuracy: 90,
      totalQuestionsAnswered: 200,
      totalCorrectAnswers: 170,
      firstActiveDate: this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActiveDate: this.getDateString(Date.now())
    };
  }
}