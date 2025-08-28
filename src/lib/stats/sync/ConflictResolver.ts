/**
 * Conflict resolver for handling data conflicts during sync
 * Implements intelligent merge strategies
 */

import { UserStatsV2, DailyActivity } from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';
import { StatsFactory } from '../utils/StatsFactory';

export class ConflictResolver {
  private logger: (message: string) => void;

  constructor(logger: (message: string) => void = console.log) {
    this.logger = logger;
  }

  /**
   * Resolve conflicts between local and cloud stats
   * Uses intelligent merging based on timestamps and data types
   */
  resolveStatsConflict(
    localStats: UserStatsV2,
    cloudStats: UserStatsV2,
    strategy: 'merge' | 'local_wins' | 'cloud_wins' = 'merge'
  ): UserStatsV2 {
    this.logger(`${LOG_PREFIXES.SYNC} Resolving stats conflict using ${strategy} strategy`);
    this.logger(`${LOG_PREFIXES.SYNC} Local timestamp: ${new Date(localStats.lastUpdated).toISOString()}`);
    this.logger(`${LOG_PREFIXES.SYNC} Cloud timestamp: ${new Date(cloudStats.lastUpdated).toISOString()}`);

    switch (strategy) {
      case 'local_wins':
        return { ...localStats, lastUpdated: Date.now() };
      
      case 'cloud_wins':
        return { ...cloudStats, lastUpdated: Date.now() };
      
      case 'merge':
      default:
        return StatsFactory.mergeStats(localStats, cloudStats, this.logger);
    }
  }

  /**
   * Resolve conflicts between daily activities
   */
  resolveDailyActivityConflict(
    localActivity: DailyActivity,
    cloudActivity: DailyActivity
  ): DailyActivity {
    this.logger(`${LOG_PREFIXES.SYNC} Resolving daily activity conflict for ${localActivity.date}`);

    // If one has no activities, use the other
    if (localActivity.activities.length === 0) {
      return cloudActivity;
    }
    if (cloudActivity.activities.length === 0) {
      return localActivity;
    }

    // Use timestamp to determine which is newer
    const localTime = localActivity.lastUpdated || 0;
    const cloudTime = cloudActivity.lastUpdated || 0;

    if (Math.abs(localTime - cloudTime) < 5000) {
      // Very close timestamps - merge activities
      return this.mergeActivities(localActivity, cloudActivity);
    } else if (localTime > cloudTime) {
      this.logger(`${LOG_PREFIXES.SYNC} Local activity is newer, using local`);
      return localActivity;
    } else {
      this.logger(`${LOG_PREFIXES.SYNC} Cloud activity is newer, using cloud`);
      return cloudActivity;
    }
  }

  /**
   * Intelligent merge of two stats objects
   */
  private mergeStats(localStats: UserStatsV2, cloudStats: UserStatsV2): UserStatsV2 {
    const timeDiff = Math.abs(localStats.lastUpdated - cloudStats.lastUpdated);
    const MERGE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    // If timestamps are significantly different, prefer the newer one
    if (timeDiff > MERGE_THRESHOLD) {
      if (localStats.lastUpdated > cloudStats.lastUpdated) {
        this.logger(`${LOG_PREFIXES.SYNC} Local stats significantly newer, using local`);
        return localStats;
      } else {
        this.logger(`${LOG_PREFIXES.SYNC} Cloud stats significantly newer, using cloud`);
        return cloudStats;
      }
    }

    // Timestamps are close - perform intelligent merge
    this.logger(`${LOG_PREFIXES.SYNC} Timestamps are close, performing intelligent merge`);

    const merged: UserStatsV2 = {
      ...cloudStats, // Start with cloud as base
      
      // Use maximum values for cumulative stats (they should only increase)
      currentStreak: Math.max(localStats.currentStreak, cloudStats.currentStreak),
      longestStreak: Math.max(localStats.longestStreak, cloudStats.longestStreak),
      totalDaysActive: Math.max(localStats.totalDaysActive, cloudStats.totalDaysActive),
      totalActivities: Math.max(localStats.totalActivities, cloudStats.totalActivities),
      drillsCompleted: Math.max(localStats.drillsCompleted, cloudStats.drillsCompleted),
      storiesRead: Math.max(localStats.storiesRead, cloudStats.storiesRead),
      articlesRead: Math.max(localStats.articlesRead, cloudStats.articlesRead),
      kanjiStudySessions: Math.max(localStats.kanjiStudySessions, cloudStats.kanjiStudySessions),
      gamesPlayed: Math.max(localStats.gamesPlayed, cloudStats.gamesPlayed),
      vocabStudied: Math.max(localStats.vocabStudied, cloudStats.vocabStudied),
      flashcardsReviewed: Math.max(localStats.flashcardsReviewed, cloudStats.flashcardsReviewed),
      practiceSessionsCompleted: Math.max(localStats.practiceSessionsCompleted, cloudStats.practiceSessionsCompleted),
      totalQuestionsAnswered: Math.max(localStats.totalQuestionsAnswered, cloudStats.totalQuestionsAnswered),
      totalCorrectAnswers: Math.max(localStats.totalCorrectAnswers, cloudStats.totalCorrectAnswers),
      totalKanjiLearned: Math.max(localStats.totalKanjiLearned, cloudStats.totalKanjiLearned),
      totalWordsLearned: Math.max(localStats.totalWordsLearned, cloudStats.totalWordsLearned),
      totalGameScore: Math.max(localStats.totalGameScore, cloudStats.totalGameScore),
      pokemonCaught: Math.max(localStats.pokemonCaught, cloudStats.pokemonCaught),
      
      // Use the more appropriate date for date fields
      firstActiveDate: this.getEarlierDate(localStats.firstActiveDate, cloudStats.firstActiveDate),
      lastActiveDate: this.getLaterDate(localStats.lastActiveDate, cloudStats.lastActiveDate),
      
      // Merge arrays with size limits (Issue #3 fix)
      ...this.mergeBoundedArraysForConflictResolution(localStats, cloudStats),
      
      // Merge sub-objects by taking maximum values
      drillStats: {
        totalQuestions: Math.max(localStats.drillStats.totalQuestions, cloudStats.drillStats.totalQuestions),
        totalCorrect: Math.max(localStats.drillStats.totalCorrect, cloudStats.drillStats.totalCorrect)
      },
      kanjiStats: {
        totalQuestions: Math.max(localStats.kanjiStats.totalQuestions, cloudStats.kanjiStats.totalQuestions),
        totalCorrect: Math.max(localStats.kanjiStats.totalCorrect, cloudStats.kanjiStats.totalCorrect)
      },
      gameStats: {
        totalQuestions: Math.max(localStats.gameStats.totalQuestions, cloudStats.gameStats.totalQuestions),
        totalCorrect: Math.max(localStats.gameStats.totalCorrect, cloudStats.gameStats.totalCorrect)
      },
      
      // Use current timestamp for merged data
      lastUpdated: Date.now(),
      version: '2.1'
    };

    // Recalculate accuracy stats based on merged totals
    this.recalculateAccuracies(merged);

    this.logger(`${LOG_PREFIXES.SYNC} Stats merge completed`);
    return merged;
  }

  /**
   * Merge two daily activities
   */
  private mergeActivities(localActivity: DailyActivity, cloudActivity: DailyActivity): DailyActivity {
    this.logger(`${LOG_PREFIXES.SYNC} Merging activities for ${localActivity.date}`);

    // Combine activities and remove duplicates by ID
    const allActivities = [...localActivity.activities, ...cloudActivity.activities];
    const uniqueActivities = allActivities.filter((activity, index, arr) => 
      arr.findIndex(a => a.id === activity.id) === index
    );

    // Sort by timestamp
    uniqueActivities.sort((a, b) => a.timestamp - b.timestamp);

    // Recalculate summary from merged activities
    const summary = {
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

    for (const activity of uniqueActivities) {
      summary.totalActivities++;
      
      switch (activity.type) {
        case 'drill': summary.drillsCompleted++; break;
        case 'story': summary.storiesRead++; break;
        case 'article': summary.articlesRead++; break;
        case 'kanji': summary.kanjiStudied++; break;
        case 'game': summary.gamesPlayed++; break;
        case 'vocab': summary.vocabStudied++; break;
        case 'flashcard': summary.flashcardsReviewed++; break;
        case 'practice': summary.practiceSessionsCompleted++; break;
      }

      if (activity.details.correct !== undefined && activity.details.total !== undefined) {
        summary.totalCorrect += activity.details.correct;
        summary.totalQuestions += activity.details.total;
      }

      if (activity.details.score !== undefined) {
        summary.totalScore += activity.details.score;
      }
    }

    const merged: DailyActivity = {
      date: localActivity.date,
      activities: uniqueActivities,
      summary,
      lastUpdated: Date.now()
    };

    this.logger(`${LOG_PREFIXES.SYNC} Merged ${uniqueActivities.length} unique activities`);
    return merged;
  }

  /**
   * Recalculate accuracy percentages
   */
  private recalculateAccuracies(stats: UserStatsV2): void {
    // Overall accuracy
    if (stats.totalQuestionsAnswered > 0) {
      stats.overallAccuracy = Math.round((stats.totalCorrectAnswers / stats.totalQuestionsAnswered) * 100);
    }

    // Drill accuracy
    if (stats.drillStats.totalQuestions > 0) {
      stats.drillAccuracy = Math.round((stats.drillStats.totalCorrect / stats.drillStats.totalQuestions) * 100);
    }

    // Kanji accuracy
    if (stats.kanjiStats.totalQuestions > 0) {
      stats.kanjiAccuracy = Math.round((stats.kanjiStats.totalCorrect / stats.kanjiStats.totalQuestions) * 100);
    }

    // Game accuracy
    if (stats.gameStats.totalQuestions > 0) {
      stats.gameAccuracy = Math.round((stats.gameStats.totalCorrect / stats.gameStats.totalQuestions) * 100);
    }
  }

  /**
   * Get the earlier of two date strings
   */
  private getEarlierDate(date1: string, date2: string): string {
    if (!date1) return date2;
    if (!date2) return date1;
    return date1 < date2 ? date1 : date2;
  }

  /**
   * Get the later of two date strings
   */
  private getLaterDate(date1: string, date2: string): string {
    if (!date1) return date2;
    if (!date2) return date1;
    return date1 > date2 ? date1 : date2;
  }

  /**
   * Merge arrays with size limits for conflict resolution (Issue #3 fix)
   */
  private mergeBoundedArraysForConflictResolution(
    localStats: UserStatsV2,
    cloudStats: UserStatsV2
  ): {
    learnedKanjiSet: string[];
    learnedWordsSet: string[];
    caughtPokemonSet: string[];
    totalKanjiLearned: number;
    totalWordsLearned: number;
    pokemonCaught: number;
  } {
    // Use StatsFactory's bounded merge logic but with conflict resolution specific logging
    return StatsFactory['mergeBoundedArrays'](localStats, cloudStats, this.logger);
  }

  /**
   * Merge two arrays and remove duplicates (deprecated - use bounded arrays)
   * @deprecated Use mergeBoundedArraysForConflictResolution instead
   */
  private mergeArrays(arr1: string[], arr2: string[]): string[] {
    const combined = [...arr1, ...arr2];
    return [...new Set(combined)];
  }

  /**
   * Detect data corruption or inconsistencies
   */
  detectInconsistencies(stats: UserStatsV2): string[] {
    const issues: string[] = [];

    // Check if current streak exceeds longest streak
    if (stats.currentStreak > stats.longestStreak) {
      issues.push('Current streak exceeds longest streak');
    }

    // Check if accuracy percentages are valid
    const accuracyFields = [
      { field: 'overallAccuracy', value: stats.overallAccuracy },
      { field: 'drillAccuracy', value: stats.drillAccuracy },
      { field: 'kanjiAccuracy', value: stats.kanjiAccuracy },
      { field: 'gameAccuracy', value: stats.gameAccuracy }
    ];

    for (const { field, value } of accuracyFields) {
      if (value < 0 || value > 100) {
        issues.push(`Invalid ${field}: ${value}%`);
      }
    }

    // Check array lengths match counts
    if (stats.learnedKanjiSet.length !== stats.totalKanjiLearned) {
      issues.push('Kanji set length mismatch');
    }

    if (stats.learnedWordsSet.length !== stats.totalWordsLearned) {
      issues.push('Words set length mismatch');
    }

    if (stats.caughtPokemonSet.length !== stats.pokemonCaught) {
      issues.push('Pokemon set length mismatch');
    }

    return issues;
  }
}