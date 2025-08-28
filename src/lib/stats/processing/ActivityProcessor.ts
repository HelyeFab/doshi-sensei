/**
 * Activity processor for handling and validating activity events
 * Implements command pattern for activity processing
 */

import {
  IActivityProcessor,
  ActivityEvent,
  UserStatsV2,
  DailyActivity,
  IStatsValidator,
  ValidationError
} from '../core/interfaces';
import { ACTIVITY_TYPE_MAPPINGS, LOG_PREFIXES } from '../core/constants';
import { StatsValidator } from './StatsValidator';
import { addToBoundedArray, type ArrayEvictionMetrics } from '../utils/ArrayManager';

export class ActivityProcessor implements IActivityProcessor {
  private validator: IStatsValidator;
  private logger: (message: string) => void;
  private metricsCallback?: (metrics: ArrayEvictionMetrics) => void;

  constructor(
    logger: (message: string) => void = console.log,
    metricsCallback?: (metrics: ArrayEvictionMetrics) => void
  ) {
    this.logger = logger;
    this.validator = new StatsValidator(logger);
    this.metricsCallback = metricsCallback;
  }

  /**
   * Set a callback for array eviction metrics
   */
  setMetricsCallback(callback: (metrics: ArrayEvictionMetrics) => void): void {
    this.metricsCallback = callback;
  }

  /**
   * Process an activity event and update stats and daily activity
   */
  async processActivity(
    event: ActivityEvent,
    stats: UserStatsV2,
    dailyActivity: DailyActivity
  ): Promise<void> {
    try {
      this.logger(`${LOG_PREFIXES.PROCESSOR} Processing ${event.type} activity: ${event.id}`);

      // Validate the activity
      if (!this.validateActivity(event)) {
        throw new ValidationError(`Invalid activity event: ${event.id}`, 'event');
      }

      // Sanitize the activity
      const sanitizedEvent = this.sanitizeActivity(event);

      // Add to daily activity
      dailyActivity.activities.push(sanitizedEvent);

      // Update daily summary
      this.updateDailySummary(dailyActivity, sanitizedEvent);

      // Update overall stats
      this.updateOverallStats(stats, sanitizedEvent);

      // Update accuracy metrics
      this.updateAccuracyMetrics(stats, sanitizedEvent);

      // Update unique item tracking
      this.updateUniqueItems(stats, sanitizedEvent);

      // Update timestamps
      stats.lastUpdated = Date.now();
      dailyActivity.lastUpdated = Date.now();

      this.logger(`${LOG_PREFIXES.PROCESSOR} Successfully processed activity: ${event.type}`);
    } catch (error) {
      this.logger(`${LOG_PREFIXES.PROCESSOR} Failed to process activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Validate activity event
   */
  validateActivity(event: ActivityEvent): boolean {
    const validation = this.validator.validateActivity(event);
    
    if (!validation.isValid) {
      this.logger(`${LOG_PREFIXES.PROCESSOR} Activity validation failed: ${validation.errors.join(', ')}`);
      return false;
    }

    if (validation.warnings.length > 0) {
      this.logger(`${LOG_PREFIXES.PROCESSOR} Activity validation warnings: ${validation.warnings.join(', ')}`);
    }

    return true;
  }

  /**
   * Sanitize activity event
   */
  sanitizeActivity(event: ActivityEvent): ActivityEvent {
    // Create sanitized copy
    const sanitized: ActivityEvent = {
      id: event.id || this.generateActivityId(),
      type: event.type,
      timestamp: event.timestamp || Date.now(),
      details: this.sanitizeActivityDetails(event.details)
    };

    // Only include userId if it exists
    if (event.userId) {
      sanitized.userId = event.userId;
    }

    return sanitized;
  }

  /**
   * Update daily summary with new activity
   */
  private updateDailySummary(dailyActivity: DailyActivity, event: ActivityEvent): void {
    const summary = dailyActivity.summary;
    
    summary.totalActivities++;

    // Update activity type counters
    switch (event.type) {
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
    if (event.details.correct !== undefined && event.details.total !== undefined) {
      summary.totalCorrect += event.details.correct;
      summary.totalQuestions += event.details.total;
    }

    if (event.details.score !== undefined) {
      summary.totalScore += event.details.score;
    }
  }

  /**
   * Update overall stats with new activity
   */
  private updateOverallStats(stats: UserStatsV2, event: ActivityEvent): void {
    stats.totalActivities++;

    // Update activity type counters
    switch (event.type) {
      case 'drill':
        stats.drillsCompleted++;
        break;
      case 'story':
        stats.storiesRead++;
        break;
      case 'article':
        stats.articlesRead++;
        break;
      case 'kanji':
        stats.kanjiStudySessions++;
        break;
      case 'game':
        stats.gamesPlayed++;
        break;
      case 'vocab':
        stats.vocabStudied++;
        break;
      case 'flashcard':
        stats.flashcardsReviewed++;
        break;
      case 'practice':
        stats.practiceSessionsCompleted++;
        break;
    }

    // Update totals
    if (event.details.correct !== undefined && event.details.total !== undefined) {
      stats.totalCorrectAnswers += event.details.correct;
      stats.totalQuestionsAnswered += event.details.total;
    }

    if (event.details.score !== undefined) {
      stats.totalGameScore += event.details.score;
    }
  }

  /**
   * Update accuracy metrics
   */
  private updateAccuracyMetrics(stats: UserStatsV2, event: ActivityEvent): void {
    if (event.details.correct === undefined || event.details.total === undefined) {
      return;
    }

    const correct = event.details.correct;
    const total = event.details.total;

    // Update overall accuracy
    if (stats.totalQuestionsAnswered > 0) {
      stats.overallAccuracy = Math.round(
        (stats.totalCorrectAnswers / stats.totalQuestionsAnswered) * 100
      );
    }

    // Update activity-specific accuracy
    switch (event.type) {
      case 'drill':
        stats.drillStats.totalCorrect += correct;
        stats.drillStats.totalQuestions += total;
        if (stats.drillStats.totalQuestions > 0) {
          stats.drillAccuracy = Math.round(
            (stats.drillStats.totalCorrect / stats.drillStats.totalQuestions) * 100
          );
        }
        break;

      case 'kanji':
        stats.kanjiStats.totalCorrect += correct;
        stats.kanjiStats.totalQuestions += total;
        if (stats.kanjiStats.totalQuestions > 0) {
          stats.kanjiAccuracy = Math.round(
            (stats.kanjiStats.totalCorrect / stats.kanjiStats.totalQuestions) * 100
          );
        }
        break;

      case 'game':
        stats.gameStats.totalCorrect += correct;
        stats.gameStats.totalQuestions += total;
        if (stats.gameStats.totalQuestions > 0) {
          stats.gameAccuracy = Math.round(
            (stats.gameStats.totalCorrect / stats.gameStats.totalQuestions) * 100
          );
        }
        break;
    }
  }

  /**
   * Update unique item tracking with bounded arrays (Issue #3 fix)
   */
  private updateUniqueItems(stats: UserStatsV2, event: ActivityEvent): void {
    if (!event.details.itemId) {
      return;
    }

    const itemId = event.details.itemId;

    switch (event.type) {
      case 'kanji': {
        const result = addToBoundedArray(stats.learnedKanjiSet, itemId, 'kanji', this.logger);
        stats.learnedKanjiSet = result.updatedArray;
        stats.totalKanjiLearned = stats.learnedKanjiSet.length;
        
        if (result.metrics && this.metricsCallback) {
          this.metricsCallback(result.metrics);
        }
        break;
      }

      case 'vocab': {
        const result = addToBoundedArray(stats.learnedWordsSet, itemId, 'words', this.logger);
        stats.learnedWordsSet = result.updatedArray;
        stats.totalWordsLearned = stats.learnedWordsSet.length;
        
        if (result.metrics && this.metricsCallback) {
          this.metricsCallback(result.metrics);
        }
        break;
      }

      case 'game': {
        if (event.details.gameType === 'pokemon') {
          const result = addToBoundedArray(stats.caughtPokemonSet, itemId, 'pokemon', this.logger);
          stats.caughtPokemonSet = result.updatedArray;
          stats.pokemonCaught = stats.caughtPokemonSet.length;
          
          if (result.metrics && this.metricsCallback) {
            this.metricsCallback(result.metrics);
          }
        }
        break;
      }
    }
  }

  /**
   * Sanitize activity details
   */
  private sanitizeActivityDetails(details: any): any {
    if (!details || typeof details !== 'object') {
      return {};
    }

    const sanitized: any = {};

    // Only include defined, non-null values
    const allowedFields = [
      'itemId', 'itemTitle', 'score', 'duration', 
      'correct', 'total', 'gameType', 'feature'
    ];

    for (const field of allowedFields) {
      const value = details[field];
      if (value !== undefined && value !== null) {
        // Type-specific sanitization
        switch (field) {
          case 'score':
          case 'duration':
          case 'correct':
          case 'total':
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0) {
              sanitized[field] = numValue;
            }
            break;
          case 'itemId':
          case 'itemTitle':
          case 'gameType':
          case 'feature':
            if (typeof value === 'string') {
              sanitized[field] = value.trim();
            }
            break;
        }
      }
    }

    // Additional validation
    if (sanitized.correct !== undefined && sanitized.total !== undefined) {
      if (sanitized.correct > sanitized.total) {
        this.logger(`${LOG_PREFIXES.PROCESSOR} Invalid correct/total ratio, adjusting: ${sanitized.correct}/${sanitized.total}`);
        sanitized.correct = sanitized.total;
      }
    }

    return sanitized;
  }

  /**
   * Generate unique activity ID
   */
  private generateActivityId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get activity processing stats for debugging
   */
  getProcessingStats(): {
    validationEnabled: boolean;
    supportedTypes: string[];
  } {
    return {
      validationEnabled: true,
      supportedTypes: Object.keys(ACTIVITY_TYPE_MAPPINGS)
    };
  }
}