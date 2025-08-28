/**
 * Stats aggregator for calculating summaries and aggregates
 * Handles daily, weekly, and monthly aggregations
 */

import {
  IStatsAggregator,
  ActivityEvent,
  DailyActivity,
  DailySummary,
  WeeklySummary,
  MonthlySummary,
  UserStatsV2
} from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';
import { migrateOversizedArray, type ArrayEvictionMetrics } from '../utils/ArrayManager';

export class StatsAggregator implements IStatsAggregator {
  private logger: (message: string) => void;
  private metricsCallback?: (metrics: ArrayEvictionMetrics) => void;

  constructor(
    logger: (message: string) => void = console.log,
    metricsCallback?: (metrics: ArrayEvictionMetrics) => void
  ) {
    this.logger = logger;
    this.metricsCallback = metricsCallback;
  }

  /**
   * Set a callback for array eviction metrics
   */
  setMetricsCallback(callback: (metrics: ArrayEvictionMetrics) => void): void {
    this.metricsCallback = callback;
  }

  /**
   * Aggregate daily summary from activities
   */
  aggregateDaily(activities: ActivityEvent[]): DailySummary {
    const summary: DailySummary = {
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
    };

    for (const activity of activities) {
      summary.totalActivities++;

      // Update activity type counters
      switch (activity.type) {
        case 'drill':
          summary.drillsCompleted++;
          break;
        case 'story':
          summary.storiesRead++;
          break;
        case 'article':
          summary.articlesRead++;
          break;
        case 'kanji':
          summary.kanjiStudied++;
          break;
        case 'game':
          summary.gamesPlayed++;
          break;
        case 'vocab':
          summary.vocabStudied++;
          break;
        case 'flashcard':
          summary.flashcardsReviewed++;
          break;
        case 'practice':
          summary.practiceSessionsCompleted++;
          break;
      }

      // Update metrics
      if (activity.details.correct !== undefined && activity.details.total !== undefined) {
        summary.totalCorrect += activity.details.correct;
        summary.totalQuestions += activity.details.total;
      }

      if (activity.details.score !== undefined) {
        summary.totalScore += activity.details.score;
      }
    }

    this.logger(`${LOG_PREFIXES.AGGREGATOR} Aggregated ${activities.length} activities into daily summary`);
    return summary;
  }

  /**
   * Aggregate weekly summary from daily activities
   */
  aggregateWeekly(dailyActivities: DailyActivity[]): WeeklySummary {
    let totalActivities = 0;
    let drillsCompleted = 0;
    let storiesRead = 0;
    let articlesRead = 0;
    let kanjiStudied = 0;
    let gamesPlayed = 0;
    let vocabStudied = 0;
    let flashcardsReviewed = 0;
    let practiceSessionsCompleted = 0;
    let totalScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;

    let daysActive = 0;
    
    for (const daily of dailyActivities) {
      if (daily.summary.totalActivities > 0) {
        daysActive++;
      }

      totalActivities += daily.summary.totalActivities;
      drillsCompleted += daily.summary.drillsCompleted;
      storiesRead += daily.summary.storiesRead;
      articlesRead += daily.summary.articlesRead;
      kanjiStudied += daily.summary.kanjiStudied;
      gamesPlayed += daily.summary.gamesPlayed;
      vocabStudied += daily.summary.vocabStudied;
      flashcardsReviewed += daily.summary.flashcardsReviewed;
      practiceSessionsCompleted += daily.summary.practiceSessionsCompleted;
      totalScore += daily.summary.totalScore;
      totalCorrect += daily.summary.totalCorrect;
      totalQuestions += daily.summary.totalQuestions;
    }

    const averageAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const summary: WeeklySummary = {
      totalActivities,
      drillsCompleted,
      storiesRead,
      articlesRead,
      kanjiStudied,
      gamesPlayed,
      vocabStudied,
      flashcardsReviewed,
      practiceSessionsCompleted,
      totalScore,
      totalCorrect,
      totalQuestions,
      daysActive,
      averageAccuracy
    };

    this.logger(`${LOG_PREFIXES.AGGREGATOR} Aggregated ${dailyActivities.length} days into weekly summary (${daysActive} active days)`);
    return summary;
  }

  /**
   * Aggregate monthly summary from daily activities
   */
  aggregateMonthly(dailyActivities: DailyActivity[]): MonthlySummary {
    const weeklySummary = this.aggregateWeekly(dailyActivities);
    
    // Calculate streak days within the month
    const streakDays = this.calculateStreakInPeriod(dailyActivities);

    const summary: MonthlySummary = {
      ...weeklySummary,
      streakDays
    };

    this.logger(`${LOG_PREFIXES.AGGREGATOR} Aggregated ${dailyActivities.length} days into monthly summary (${streakDays} streak days)`);
    return summary;
  }

  /**
   * Recalculate totals in user stats from daily activities
   */
  recalculateTotals(stats: UserStatsV2, dailyActivities: Map<string, DailyActivity>): UserStatsV2 {
    this.logger(`${LOG_PREFIXES.AGGREGATOR} Recalculating totals from ${dailyActivities.size} daily activities`);

    // Initialize counters
    let totalActivities = 0;
    let drillsCompleted = 0;
    let storiesRead = 0;
    let articlesRead = 0;
    let kanjiStudySessions = 0;
    let gamesPlayed = 0;
    let vocabStudied = 0;
    let flashcardsReviewed = 0;
    let practiceSessionsCompleted = 0;
    let totalScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;

    // Activity-specific counters
    let drillCorrect = 0;
    let drillQuestions = 0;
    let kanjiCorrect = 0;
    let kanjiQuestions = 0;
    let gameCorrect = 0;
    let gameQuestions = 0;

    // Unique item sets
    const learnedKanjiSet = new Set<string>();
    const learnedWordsSet = new Set<string>();
    const caughtPokemonSet = new Set<string>();

    // Activity date tracking
    const activityDates = new Set<string>();

    // Sum up all activities from daily records
    for (const [date, daily] of dailyActivities) {
      if (daily.summary.totalActivities > 0) {
        activityDates.add(date);
      }

      totalActivities += daily.summary.totalActivities;
      drillsCompleted += daily.summary.drillsCompleted;
      storiesRead += daily.summary.storiesRead;
      articlesRead += daily.summary.articlesRead;
      kanjiStudySessions += daily.summary.kanjiStudied;
      gamesPlayed += daily.summary.gamesPlayed;
      vocabStudied += daily.summary.vocabStudied;
      flashcardsReviewed += daily.summary.flashcardsReviewed;
      practiceSessionsCompleted += daily.summary.practiceSessionsCompleted;
      totalScore += daily.summary.totalScore;
      totalCorrect += daily.summary.totalCorrect;
      totalQuestions += daily.summary.totalQuestions;

      // Process individual activities for detailed tracking
      for (const activity of daily.activities) {
        // Track unique items
        if (activity.details.itemId) {
          switch (activity.type) {
            case 'kanji':
              learnedKanjiSet.add(activity.details.itemId);
              break;
            case 'vocab':
              learnedWordsSet.add(activity.details.itemId);
              break;
            case 'game':
              if (activity.details.gameType === 'pokemon') {
                caughtPokemonSet.add(activity.details.itemId);
              }
              break;
          }
        }

        // Track activity-specific metrics
        if (activity.details.correct !== undefined && activity.details.total !== undefined) {
          switch (activity.type) {
            case 'drill':
              drillCorrect += activity.details.correct;
              drillQuestions += activity.details.total;
              break;
            case 'kanji':
              kanjiCorrect += activity.details.correct;
              kanjiQuestions += activity.details.total;
              break;
            case 'game':
              gameCorrect += activity.details.correct;
              gameQuestions += activity.details.total;
              break;
          }
        }
      }
    }

    // Update stats object
    const updatedStats: UserStatsV2 = {
      ...stats,
      totalActivities,
      drillsCompleted,
      storiesRead,
      articlesRead,
      kanjiStudySessions,
      gamesPlayed,
      vocabStudied,
      flashcardsReviewed,
      practiceSessionsCompleted,
      totalGameScore: totalScore,
      totalCorrectAnswers: totalCorrect,
      totalQuestionsAnswered: totalQuestions,
      
      // Unique items (with size limits to prevent unbounded growth - Issue #3 fix)
      ...this.createBoundedArrays(learnedKanjiSet, learnedWordsSet, caughtPokemonSet),

      // Activity-specific stats
      drillStats: {
        totalCorrect: drillCorrect,
        totalQuestions: drillQuestions
      },
      kanjiStats: {
        totalCorrect: kanjiCorrect,
        totalQuestions: kanjiQuestions
      },
      gameStats: {
        totalCorrect: gameCorrect,
        totalQuestions: gameQuestions
      },

      // Date tracking
      totalDaysActive: activityDates.size,
      
      lastUpdated: Date.now()
    };

    // Recalculate accuracy percentages
    this.updateAccuracyMetrics(updatedStats);

    this.logger(`${LOG_PREFIXES.AGGREGATOR} Recalculation complete - Total activities: ${totalActivities}, Active days: ${activityDates.size}`);
    return updatedStats;
  }

  /**
   * Create bounded arrays from Sets with size limits (Issue #3 fix)
   */
  private createBoundedArrays(
    learnedKanjiSet: Set<string>,
    learnedWordsSet: Set<string>,
    caughtPokemonSet: Set<string>
  ): {
    learnedKanjiSet: string[];
    learnedWordsSet: string[];
    caughtPokemonSet: string[];
    totalKanjiLearned: number;
    totalWordsLearned: number;
    pokemonCaught: number;
  } {
    // Convert sets to arrays (preserves current implementation behavior)
    let kanjiArray = Array.from(learnedKanjiSet);
    let wordsArray = Array.from(learnedWordsSet);
    let pokemonArray = Array.from(caughtPokemonSet);

    // Apply size limits if needed
    const kanjiResult = migrateOversizedArray(kanjiArray, 'kanji', this.logger);
    if (kanjiResult.wasMigrated && kanjiResult.metrics && this.metricsCallback) {
      this.logger(`${LOG_PREFIXES.AGGREGATOR} Aggregation triggered kanji array migration`);
      this.metricsCallback(kanjiResult.metrics);
    }
    kanjiArray = kanjiResult.migratedArray;

    const wordsResult = migrateOversizedArray(wordsArray, 'words', this.logger);
    if (wordsResult.wasMigrated && wordsResult.metrics && this.metricsCallback) {
      this.logger(`${LOG_PREFIXES.AGGREGATOR} Aggregation triggered words array migration`);
      this.metricsCallback(wordsResult.metrics);
    }
    wordsArray = wordsResult.migratedArray;

    const pokemonResult = migrateOversizedArray(pokemonArray, 'pokemon', this.logger);
    if (pokemonResult.wasMigrated && pokemonResult.metrics && this.metricsCallback) {
      this.logger(`${LOG_PREFIXES.AGGREGATOR} Aggregation triggered pokemon array migration`);
      this.metricsCallback(pokemonResult.metrics);
    }
    pokemonArray = pokemonResult.migratedArray;

    return {
      learnedKanjiSet: kanjiArray,
      learnedWordsSet: wordsArray,
      caughtPokemonSet: pokemonArray,
      totalKanjiLearned: kanjiArray.length,
      totalWordsLearned: wordsArray.length,
      pokemonCaught: pokemonArray.length
    };
  }

  /**
   * Get activity breakdown by type
   */
  getActivityBreakdown(dailyActivities: DailyActivity[]): {
    [activityType: string]: {
      count: number;
      percentage: number;
      avgPerDay: number;
    };
  } {
    const breakdown: { [key: string]: number } = {};
    let totalActivities = 0;
    let daysWithActivity = 0;

    for (const daily of dailyActivities) {
      if (daily.summary.totalActivities > 0) {
        daysWithActivity++;
      }

      breakdown.drill = (breakdown.drill || 0) + daily.summary.drillsCompleted;
      breakdown.story = (breakdown.story || 0) + daily.summary.storiesRead;
      breakdown.article = (breakdown.article || 0) + daily.summary.articlesRead;
      breakdown.kanji = (breakdown.kanji || 0) + daily.summary.kanjiStudied;
      breakdown.game = (breakdown.game || 0) + daily.summary.gamesPlayed;
      breakdown.vocab = (breakdown.vocab || 0) + daily.summary.vocabStudied;
      breakdown.flashcard = (breakdown.flashcard || 0) + daily.summary.flashcardsReviewed;
      breakdown.practice = (breakdown.practice || 0) + daily.summary.practiceSessionsCompleted;

      totalActivities += daily.summary.totalActivities;
    }

    const result: { [key: string]: { count: number; percentage: number; avgPerDay: number } } = {};

    for (const [type, count] of Object.entries(breakdown)) {
      result[type] = {
        count,
        percentage: totalActivities > 0 ? Math.round((count / totalActivities) * 100) : 0,
        avgPerDay: daysWithActivity > 0 ? Math.round((count / daysWithActivity) * 100) / 100 : 0
      };
    }

    return result;
  }

  /**
   * Calculate performance trends
   */
  getPerformanceTrends(dailyActivities: DailyActivity[]): {
    accuracyTrend: number[];
    activityTrend: number[];
    streakTrend: number[];
  } {
    const accuracyTrend: number[] = [];
    const activityTrend: number[] = [];
    const streakTrend: number[] = [];

    let currentStreak = 0;

    for (const daily of dailyActivities) {
      // Accuracy for the day
      const dayAccuracy = daily.summary.totalQuestions > 0 
        ? Math.round((daily.summary.totalCorrect / daily.summary.totalQuestions) * 100)
        : 0;
      accuracyTrend.push(dayAccuracy);

      // Activity count for the day
      activityTrend.push(daily.summary.totalActivities);

      // Streak calculation
      if (daily.summary.totalActivities > 0) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }
      streakTrend.push(currentStreak);
    }

    return {
      accuracyTrend,
      activityTrend,
      streakTrend
    };
  }

  /**
   * Calculate streak days within a period
   */
  private calculateStreakInPeriod(dailyActivities: DailyActivity[]): number {
    const sortedActivities = dailyActivities
      .filter(d => d.summary.totalActivities > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sortedActivities.length === 0) {
      return 0;
    }

    let maxStreak = 0;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedActivities.length; i++) {
      const prevDate = new Date(sortedActivities[i - 1].date);
      const currentDate = new Date(sortedActivities[i].date);
      const daysDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysDiff === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(maxStreak, currentStreak);
  }

  /**
   * Update accuracy metrics in stats object
   */
  private updateAccuracyMetrics(stats: UserStatsV2): void {
    // Overall accuracy
    if (stats.totalQuestionsAnswered > 0) {
      stats.overallAccuracy = Math.round((stats.totalCorrectAnswers / stats.totalQuestionsAnswered) * 100);
    } else {
      stats.overallAccuracy = 0;
    }

    // Drill accuracy
    if (stats.drillStats.totalQuestions > 0) {
      stats.drillAccuracy = Math.round((stats.drillStats.totalCorrect / stats.drillStats.totalQuestions) * 100);
    } else {
      stats.drillAccuracy = 0;
    }

    // Kanji accuracy
    if (stats.kanjiStats.totalQuestions > 0) {
      stats.kanjiAccuracy = Math.round((stats.kanjiStats.totalCorrect / stats.kanjiStats.totalQuestions) * 100);
    } else {
      stats.kanjiAccuracy = 0;
    }

    // Game accuracy
    if (stats.gameStats.totalQuestions > 0) {
      stats.gameAccuracy = Math.round((stats.gameStats.totalCorrect / stats.gameStats.totalQuestions) * 100);
    } else {
      stats.gameAccuracy = 0;
    }
  }

  /**
   * Get aggregation diagnostics
   */
  getDiagnostics(): {
    supportedAggregations: string[];
    calculatedMetrics: string[];
  } {
    return {
      supportedAggregations: ['daily', 'weekly', 'monthly'],
      calculatedMetrics: [
        'activity_counts',
        'accuracy_percentages',
        'unique_items',
        'streak_calculations',
        'performance_trends'
      ]
    };
  }
}