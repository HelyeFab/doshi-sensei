/**
 * Stats validator for input sanitization and validation
 * Ensures data integrity and prevents corruption
 */

import { 
  IStatsValidator,
  ActivityEvent,
  UserStatsV2,
  DailyActivity,
  ValidationResult,
  ValidationSchema,
  ValidationError
} from '../core/interfaces';
import { VALIDATION_LIMITS, LOG_PREFIXES } from '../core/constants';

export class StatsValidator implements IStatsValidator {
  private logger: (message: string) => void;

  constructor(logger: (message: string) => void = console.log) {
    this.logger = logger;
  }

  /**
   * Validate activity event
   */
  validateActivity(event: ActivityEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!event.id || typeof event.id !== 'string') {
      errors.push('Activity ID is required and must be a string');
    }

    if (!event.type || typeof event.type !== 'string') {
      errors.push('Activity type is required and must be a string');
    }

    if (!event.timestamp || typeof event.timestamp !== 'number') {
      errors.push('Activity timestamp is required and must be a number');
    }

    // Timestamp validation
    if (event.timestamp) {
      if (event.timestamp < VALIDATION_LIMITS.MIN_TIMESTAMP) {
        errors.push(`Timestamp too old: ${event.timestamp}`);
      }
      
      if (event.timestamp > VALIDATION_LIMITS.MAX_TIMESTAMP) {
        errors.push(`Timestamp too far in future: ${event.timestamp}`);
      }

      const now = Date.now();
      if (event.timestamp > now + 60000) { // Allow 1 minute clock skew
        warnings.push(`Timestamp appears to be in the future: ${event.timestamp}`);
      }
    }

    // Details validation
    if (event.details) {
      const detailsValidation = this.validateActivityDetails(event.details);
      errors.push(...detailsValidation.errors);
      warnings.push(...detailsValidation.warnings);
    }

    // Type-specific validation
    const typeValidation = this.validateActivityType(event);
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.isValid) {
      this.logger(`${LOG_PREFIXES.VALIDATOR} Activity validation failed: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate user stats
   */
  validateStats(stats: UserStatsV2): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!stats.userId || typeof stats.userId !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    if (!stats.version || typeof stats.version !== 'string') {
      errors.push('Version is required and must be a string');
    }

    if (!stats.lastUpdated || typeof stats.lastUpdated !== 'number') {
      errors.push('Last updated timestamp is required and must be a number');
    }

    // Numeric field validation
    const numericFields = [
      'currentStreak', 'longestStreak', 'totalDaysActive',
      'totalActivities', 'drillsCompleted', 'storiesRead',
      'articlesRead', 'kanjiStudySessions', 'gamesPlayed',
      'vocabStudied', 'flashcardsReviewed', 'practiceSessionsCompleted',
      'overallAccuracy', 'drillAccuracy', 'kanjiAccuracy', 'gameAccuracy',
      'totalQuestionsAnswered', 'totalCorrectAnswers',
      'totalKanjiLearned', 'totalWordsLearned', 'totalGameScore', 'pokemonCaught'
    ];

    for (const field of numericFields) {
      const value = (stats as any)[field];
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push(`${field} must be a non-negative number, got: ${value}`);
      }
    }

    // Accuracy validation (should be 0-100)
    const accuracyFields = ['overallAccuracy', 'drillAccuracy', 'kanjiAccuracy', 'gameAccuracy'];
    for (const field of accuracyFields) {
      const value = (stats as any)[field];
      if (typeof value === 'number' && (value < 0 || value > 100)) {
        errors.push(`${field} should be between 0 and 100, got: ${value}`);
      }
    }

    // Consistency validation
    if (stats.currentStreak > stats.longestStreak) {
      warnings.push('Current streak is greater than longest streak');
    }

    // Array validation
    if (!Array.isArray(stats.learnedKanjiSet)) {
      errors.push('learnedKanjiSet must be an array');
    }

    if (!Array.isArray(stats.learnedWordsSet)) {
      errors.push('learnedWordsSet must be an array');
    }

    if (!Array.isArray(stats.caughtPokemonSet)) {
      errors.push('caughtPokemonSet must be an array');
    }

    // Sub-object validation
    if (!this.validateActivityStats(stats.drillStats).isValid) {
      errors.push('drillStats is invalid');
    }

    if (!this.validateActivityStats(stats.kanjiStats).isValid) {
      errors.push('kanjiStats is invalid');
    }

    if (!this.validateActivityStats(stats.gameStats).isValid) {
      errors.push('gameStats is invalid');
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.isValid) {
      this.logger(`${LOG_PREFIXES.VALIDATOR} Stats validation failed: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate daily activity
   */
  validateDailyActivity(activity: DailyActivity): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!activity.date || typeof activity.date !== 'string') {
      errors.push('Date is required and must be a string');
    }

    if (!Array.isArray(activity.activities)) {
      errors.push('Activities must be an array');
    }

    if (!activity.summary || typeof activity.summary !== 'object') {
      errors.push('Summary is required and must be an object');
    }

    // Date format validation
    if (activity.date && !/^\d{4}-\d{2}-\d{2}$/.test(activity.date)) {
      errors.push(`Date must be in YYYY-MM-DD format, got: ${activity.date}`);
    }

    // Validate individual activities
    if (Array.isArray(activity.activities)) {
      if (activity.activities.length > VALIDATION_LIMITS.MAX_ACTIVITIES_PER_DAY) {
        warnings.push(`Too many activities in one day: ${activity.activities.length}`);
      }

      for (let i = 0; i < activity.activities.length; i++) {
        const activityValidation = this.validateActivity(activity.activities[i]);
        if (!activityValidation.isValid) {
          errors.push(`Activity ${i} is invalid: ${activityValidation.errors.join(', ')}`);
        }
      }
    }

    // Summary validation
    if (activity.summary) {
      const summaryValidation = this.validateDailySummary(activity.summary);
      errors.push(...summaryValidation.errors);
      warnings.push(...summaryValidation.warnings);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.isValid) {
      this.logger(`${LOG_PREFIXES.VALIDATOR} Daily activity validation failed: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Sanitize input using validation schema
   */
  sanitizeInput<T>(input: T, schema: ValidationSchema): T {
    if (!input || typeof input !== 'object') {
      return input;
    }

    const sanitized = { ...input } as any;

    for (const [key, rule] of Object.entries(schema)) {
      const value = sanitized[key];

      // Handle required fields
      if (rule.required && (value === undefined || value === null)) {
        throw new ValidationError(`Required field missing: ${key}`, key);
      }

      // Skip validation for undefined optional fields
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation and conversion
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              sanitized[key] = String(value);
            }
            break;
          case 'number':
            if (typeof value !== 'number') {
              const num = Number(value);
              if (isNaN(num)) {
                throw new ValidationError(`Invalid number for field ${key}: ${value}`, key);
              }
              sanitized[key] = num;
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              sanitized[key] = Boolean(value);
            }
            break;
        }
      }

      // Range validation
      if (typeof sanitized[key] === 'number') {
        if (rule.min !== undefined && sanitized[key] < rule.min) {
          sanitized[key] = rule.min;
        }
        if (rule.max !== undefined && sanitized[key] > rule.max) {
          sanitized[key] = rule.max;
        }
      }

      // Pattern validation
      if (rule.pattern && typeof sanitized[key] === 'string') {
        if (!rule.pattern.test(sanitized[key])) {
          throw new ValidationError(`Pattern validation failed for field ${key}`, key);
        }
      }
    }

    return sanitized;
  }

  /**
   * Validate activity details
   */
  private validateActivityDetails(details: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Score validation
    if (details.score !== undefined) {
      if (typeof details.score !== 'number' || details.score < 0) {
        errors.push('Score must be a non-negative number');
      }
      if (details.score > VALIDATION_LIMITS.MAX_SCORE) {
        warnings.push(`Unusually high score: ${details.score}`);
      }
    }

    // Duration validation
    if (details.duration !== undefined) {
      if (typeof details.duration !== 'number' || details.duration < 0) {
        errors.push('Duration must be a non-negative number');
      }
      if (details.duration > VALIDATION_LIMITS.MAX_DURATION) {
        warnings.push(`Unusually long duration: ${details.duration}ms`);
      }
    }

    // Correct/Total validation
    if (details.correct !== undefined || details.total !== undefined) {
      if (details.correct !== undefined) {
        if (typeof details.correct !== 'number' || details.correct < 0) {
          errors.push('Correct answers must be a non-negative number');
        }
      }
      
      if (details.total !== undefined) {
        if (typeof details.total !== 'number' || details.total < 0) {
          errors.push('Total questions must be a non-negative number');
        }
      }

      // Consistency check
      if (details.correct !== undefined && details.total !== undefined) {
        if (details.correct > details.total) {
          errors.push('Correct answers cannot exceed total questions');
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate activity type constraints
   */
  private validateActivityType(event: ActivityEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validTypes = ['drill', 'story', 'article', 'kanji', 'game', 'vocab', 'flashcard', 'practice'];
    
    if (!validTypes.includes(event.type)) {
      errors.push(`Invalid activity type: ${event.type}`);
    }

    // Type-specific validation
    switch (event.type) {
      case 'game':
        if (event.details.gameType && typeof event.details.gameType !== 'string') {
          errors.push('Game type must be a string');
        }
        break;
      case 'kanji':
        if (event.details.itemId && typeof event.details.itemId !== 'string') {
          errors.push('Kanji itemId must be a string');
        }
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate activity stats object
   */
  private validateActivityStats(stats: any): ValidationResult {
    const errors: string[] = [];

    if (!stats || typeof stats !== 'object') {
      errors.push('Activity stats must be an object');
      return { isValid: false, errors, warnings: [] };
    }

    if (typeof stats.totalQuestions !== 'number' || stats.totalQuestions < 0) {
      errors.push('totalQuestions must be a non-negative number');
    }

    if (typeof stats.totalCorrect !== 'number' || stats.totalCorrect < 0) {
      errors.push('totalCorrect must be a non-negative number');
    }

    if (stats.totalCorrect > stats.totalQuestions) {
      errors.push('totalCorrect cannot exceed totalQuestions');
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }

  /**
   * Validate daily summary
   */
  private validateDailySummary(summary: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const numericFields = [
      'totalActivities', 'drillsCompleted', 'storiesRead',
      'articlesRead', 'kanjiStudied', 'gamesPlayed',
      'vocabStudied', 'flashcardsReviewed', 'practiceSessionsCompleted',
      'totalScore', 'totalCorrect', 'totalQuestions'
    ];

    for (const field of numericFields) {
      const value = summary[field];
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push(`${field} must be a non-negative number, got: ${value}`);
      }
    }

    // Consistency checks
    if (summary.totalCorrect > summary.totalQuestions) {
      errors.push('totalCorrect cannot exceed totalQuestions in summary');
    }

    const activitySum = summary.drillsCompleted + summary.storiesRead + 
                        summary.articlesRead + summary.kanjiStudied +
                        summary.gamesPlayed + summary.vocabStudied +
                        summary.flashcardsReviewed + summary.practiceSessionsCompleted;

    if (Math.abs(activitySum - summary.totalActivities) > 1) {
      warnings.push(`Activity sum (${activitySum}) doesn't match totalActivities (${summary.totalActivities})`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}