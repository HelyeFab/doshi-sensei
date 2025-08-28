/**
 * Stats storage repository implementation
 * Uses strategy pattern for different storage backends
 */

import { 
  IStatsStorage, 
  IStorageStrategy, 
  UserStatsV2, 
  DailyActivity, 
  StorageError,
  UserContext 
} from '../core/interfaces';
import { STORAGE_KEYS, LOG_PREFIXES, DEFAULT_CONFIG } from '../core/constants';
import { IndexedDBStrategy } from './strategies/IndexedDBStrategy';
import { FirestoreStrategy } from './strategies/FirestoreStrategy';
import { MemoryStrategy } from './strategies/MemoryStrategy';
import { UserScopedStorage } from '@/utils/userScopedStorage';
import { hasPaidPlan } from '@/lib/subscriptions/helpers';

export class StatsStorage implements IStatsStorage {
  private primaryStrategy: IStorageStrategy;
  private backupStrategy: IStorageStrategy;
  private userContext: UserContext;
  private logger: (message: string) => void;

  constructor(
    userContext: UserContext,
    logger: (message: string) => void = console.log
  ) {
    this.userContext = userContext;
    this.logger = logger;
    this.initializeStrategies();
  }

  /**
   * Initialize storage strategies based on user context
   */
  private initializeStrategies(): void {
    const { user, subscription, isGuest, isPremium } = this.userContext;

    if (isGuest) {
      // Guest users use memory only
      this.primaryStrategy = new MemoryStrategy(this.logger);
      this.backupStrategy = new MemoryStrategy(this.logger);
      this.logger(`${LOG_PREFIXES.STORAGE} Initialized guest storage (Memory only)`);
    } else if (isPremium && user) {
      // Premium users use Firestore with IndexedDB backup
      try {
        this.primaryStrategy = new FirestoreStrategy(user.uid, this.logger);
        this.backupStrategy = new IndexedDBStrategy(user.uid, this.logger);
        this.logger(`${LOG_PREFIXES.STORAGE} Initialized premium storage (Firestore + IndexedDB)`);
      } catch (error) {
        // Fallback to IndexedDB only if Firestore fails
        this.logger(`${LOG_PREFIXES.STORAGE} Firestore init failed, falling back to IndexedDB`);
        this.primaryStrategy = new IndexedDBStrategy(user.uid, this.logger);
        this.backupStrategy = new MemoryStrategy(this.logger);
      }
    } else if (user) {
      // Free users use IndexedDB with memory backup
      this.primaryStrategy = new IndexedDBStrategy(user.uid, this.logger);
      this.backupStrategy = new MemoryStrategy(this.logger);
      this.logger(`${LOG_PREFIXES.STORAGE} Initialized free user storage (IndexedDB + Memory)`);
    } else {
      // Fallback to memory for any edge cases
      this.primaryStrategy = new MemoryStrategy(this.logger);
      this.backupStrategy = new MemoryStrategy(this.logger);
      this.logger(`${LOG_PREFIXES.STORAGE} Initialized fallback storage (Memory only)`);
    }
  }

  /**
   * Get stats using primary strategy with fallback
   */
  async getStats(): Promise<UserStatsV2 | null> {
    try {
      this.logger(`${LOG_PREFIXES.STORAGE} Loading stats via ${this.primaryStrategy.getName()}...`);
      const stats = await this.primaryStrategy.load();
      
      if (stats) {
        this.logger(`${LOG_PREFIXES.STORAGE} Successfully loaded stats from ${this.primaryStrategy.getName()}`);
        return stats;
      }

      // Try backup strategy if primary returns null
      this.logger(`${LOG_PREFIXES.STORAGE} Primary strategy returned null, trying ${this.backupStrategy.getName()}...`);
      const backupStats = await this.backupStrategy.load();
      
      if (backupStats) {
        this.logger(`${LOG_PREFIXES.STORAGE} Loaded stats from backup strategy`);
        // Optionally sync backup to primary
        try {
          await this.primaryStrategy.save(backupStats);
          this.logger(`${LOG_PREFIXES.STORAGE} Synced backup stats to primary strategy`);
        } catch (error) {
          this.logger(`${LOG_PREFIXES.STORAGE} Failed to sync to primary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return backupStats;
      }

      return null;
    } catch (error) {
      this.logger(`${LOG_PREFIXES.STORAGE} Primary strategy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try backup strategy on error
      try {
        this.logger(`${LOG_PREFIXES.STORAGE} Attempting backup strategy...`);
        return await this.backupStrategy.load();
      } catch (backupError) {
        this.logger(`${LOG_PREFIXES.STORAGE} Backup strategy also failed: ${backupError instanceof Error ? backupError.message : 'Unknown error'}`);
        throw new StorageError('All storage strategies failed', 'load');
      }
    }
  }

  /**
   * Save stats to both strategies
   */
  async saveStats(stats: UserStatsV2): Promise<void> {
    if (!stats) {
      throw new StorageError('No stats data to save', 'save');
    }

    const errors: string[] = [];

    // Save to primary strategy
    try {
      await this.primaryStrategy.save(stats);
      this.logger(`${LOG_PREFIXES.STORAGE} Saved stats to ${this.primaryStrategy.getName()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Primary (${this.primaryStrategy.getName()}): ${message}`);
    }

    // Save to backup strategy (don't fail if this fails)
    try {
      await this.backupStrategy.save(stats);
      this.logger(`${LOG_PREFIXES.STORAGE} Saved stats to ${this.backupStrategy.getName()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} Backup save failed: ${message}`);
    }

    // Throw error only if primary strategy failed
    if (errors.length > 0 && errors[0].startsWith('Primary')) {
      throw new StorageError(`Storage save failed: ${errors[0]}`, 'save');
    }
  }

  /**
   * Get daily activity for a specific date
   */
  async getDailyActivity(date: string): Promise<DailyActivity | null> {
    if (!this.userContext.user) {
      return null;
    }

    try {
      const activity = await UserScopedStorage.getFromStore(
        STORAGE_KEYS.ACTIVITIES,
        date,
        this.userContext.user.uid
      );

      if (activity) {
        // Sanitize the activity
        const sanitized = this.sanitizeDailyActivity(activity as DailyActivity);
        return sanitized;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} Failed to load daily activity for ${date}: ${message}`);
      throw new StorageError(`Failed to load daily activity: ${message}`, 'load');
    }
  }

  /**
   * Save daily activity
   */
  async saveDailyActivity(date: string, activity: DailyActivity): Promise<void> {
    if (!this.userContext.user) {
      return; // Guest users don't persist activities
    }

    try {
      const activityToSave = {
        ...activity,
        date,
        lastUpdated: Date.now()
      };

      await UserScopedStorage.setToStore(
        STORAGE_KEYS.ACTIVITIES,
        date,
        activityToSave,
        this.userContext.user.uid
      );

      this.logger(`${LOG_PREFIXES.STORAGE} Saved daily activity for ${date}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} Failed to save daily activity for ${date}: ${message}`);
      throw new StorageError(`Failed to save daily activity: ${message}`, 'save');
    }
  }

  /**
   * Get activities for a date range
   * FIXED: Optimized with batch loading to prevent individual IndexedDB reads
   */
  async getActivitiesRange(startDate: string, endDate: string): Promise<DailyActivity[]> {
    if (!this.userContext.user) {
      return [];
    }

    const activities: DailyActivity[] = [];

    try {
      // Get all date strings in the range first
      const dateRange = this.getDateRange(startDate, endDate);
      
      if (dateRange.length === 0) {
        return activities;
      }

      this.logger(`${LOG_PREFIXES.STORAGE} Batch loading ${dateRange.length} activities from ${startDate} to ${endDate}`);
      
      // Use optimized batch loading to reduce IndexedDB operations
      const BATCH_SIZE = 20; // Process 20 dates at once for optimal IndexedDB performance
      const batches: string[][] = [];
      
      for (let i = 0; i < dateRange.length; i += BATCH_SIZE) {
        batches.push(dateRange.slice(i, i + BATCH_SIZE));
      }
      
      // Process each batch using the new batch method
      for (const batch of batches) {
        try {
          const batchResults = await UserScopedStorage.getBatchFromStore(
            STORAGE_KEYS.ACTIVITIES,
            batch,
            this.userContext.user.uid
          );
          
          // Process batch results
          for (const { key: dateStr, value: rawActivity, error } of batchResults) {
            if (error) {
              this.logger(`${LOG_PREFIXES.STORAGE} Failed to load activity for ${dateStr}: ${error}`);
              continue;
            }
            
            if (rawActivity) {
              try {
                const activity = this.sanitizeDailyActivity(rawActivity as DailyActivity);
                if (activity && activity.summary.totalActivities > 0) {
                  activities.push(activity);
                }
              } catch (sanitizeError) {
                this.logger(`${LOG_PREFIXES.STORAGE} Failed to sanitize activity for ${dateStr}: ${sanitizeError instanceof Error ? sanitizeError.message : 'Unknown'}`);
              }
            }
          }
        } catch (batchError) {
          this.logger(`${LOG_PREFIXES.STORAGE} Batch operation failed, falling back to individual loads: ${batchError instanceof Error ? batchError.message : 'Unknown'}`);
          
          // Fallback to individual loading for this batch
          for (const dateStr of batch) {
            try {
              const activity = await this.getDailyActivity(dateStr);
              if (activity && activity.summary.totalActivities > 0) {
                activities.push(activity);
              }
            } catch (error) {
              this.logger(`${LOG_PREFIXES.STORAGE} Individual fallback failed for ${dateStr}: ${error instanceof Error ? error.message : 'Unknown'}`);
            }
          }
        }
      }

      this.logger(`${LOG_PREFIXES.STORAGE} Batch loaded ${activities.length} activities from ${dateRange.length} dates (${startDate} to ${endDate})`);
      return activities;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} Failed to load activities range: ${message}`);
      throw new StorageError(`Failed to load activities range: ${message}`, 'load');
    }
  }

  /**
   * Get date range array helper for batch operations
   * ADDED: Helper method for optimized range loading
   */
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(this.getDateString(current.getTime()));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Create backup of current stats
   */
  async createBackup(stats: UserStatsV2): Promise<void> {
    if (!this.userContext.user) {
      return;
    }

    try {
      const backup = {
        ...stats,
        backupTimestamp: Date.now(),
        backupVersion: DEFAULT_CONFIG.version
      };

      await UserScopedStorage.setToStore(
        STORAGE_KEYS.BACKUP,
        'statsBackup',
        backup,
        this.userContext.user.uid
      );

      this.logger(`${LOG_PREFIXES.STORAGE} Created stats backup`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} Failed to create backup: ${message}`);
      // Don't throw - backup failure shouldn't stop the main operation
    }
  }

  /**
   * Recover stats from backup
   */
  async recoverFromBackup(): Promise<UserStatsV2 | null> {
    if (!this.userContext.user) {
      return null;
    }

    try {
      const backup = await UserScopedStorage.getFromStore(
        STORAGE_KEYS.BACKUP,
        'statsBackup',
        this.userContext.user.uid
      );

      if (backup && backup.backupVersion === DEFAULT_CONFIG.version) {
        // Remove backup-specific fields
        const { id, backupTimestamp, backupVersion, ...stats } = backup;
        this.logger(`${LOG_PREFIXES.STORAGE} Recovered from backup created at ${new Date(backupTimestamp).toISOString()}`);
        return stats as UserStatsV2;
      }

      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`${LOG_PREFIXES.STORAGE} Failed to recover from backup: ${message}`);
      return null;
    }
  }

  /**
   * Clear all storage
   */
  async clearAll(): Promise<void> {
    const errors: string[] = [];

    // Clear primary strategy
    try {
      await this.primaryStrategy.clear();
      this.logger(`${LOG_PREFIXES.STORAGE} Cleared ${this.primaryStrategy.getName()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Primary: ${message}`);
    }

    // Clear backup strategy
    try {
      await this.backupStrategy.clear();
      this.logger(`${LOG_PREFIXES.STORAGE} Cleared ${this.backupStrategy.getName()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Backup: ${message}`);
    }

    // Clear activities if user exists
    if (this.userContext.user) {
      try {
        const thirtyDaysAgo = this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const today = this.getDateString(Date.now());
        const current = new Date(thirtyDaysAgo);
        const end = new Date(today);

        while (current <= end) {
          const dateStr = this.getDateString(current.getTime());
          await UserScopedStorage.deleteFromStore(
            STORAGE_KEYS.ACTIVITIES,
            dateStr,
            this.userContext.user.uid
          );
          current.setDate(current.getDate() + 1);
        }

        this.logger(`${LOG_PREFIXES.STORAGE} Cleared activities data`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Activities: ${message}`);
      }
    }

    if (errors.length > 0) {
      throw new StorageError(`Clear operation had errors: ${errors.join(', ')}`, 'clear');
    }
  }

  /**
   * Update user context (e.g., when subscription changes)
   */
  updateUserContext(userContext: UserContext): void {
    this.userContext = userContext;
    this.initializeStrategies();
    this.logger(`${LOG_PREFIXES.STORAGE} Updated user context and reinitalized strategies`);
  }

  /**
   * Get storage info for debugging
   */
  getStorageInfo(): {
    primary: string;
    backup: string;
    userContext: UserContext;
  } {
    return {
      primary: this.primaryStrategy.getName(),
      backup: this.backupStrategy.getName(),
      userContext: this.userContext
    };
  }

  /**
   * Sanitize daily activity data
   */
  private sanitizeDailyActivity(activity: any): DailyActivity {
    // Remove any 'id' field that might have been added by storage
    const { id, ...activityWithoutId } = activity;
    
    // Sanitize individual activity events
    const sanitizedActivities = (activityWithoutId.activities || []).map((event: any) => {
      const cleanDetails: any = {};
      
      // Only include defined, non-null values
      if (event.details?.itemId !== undefined && event.details.itemId !== null) {
        cleanDetails.itemId = event.details.itemId;
      }
      if (event.details?.itemTitle !== undefined && event.details.itemTitle !== null) {
        cleanDetails.itemTitle = event.details.itemTitle;
      }
      if (event.details?.score !== undefined && event.details.score !== null) {
        cleanDetails.score = event.details.score;
      }
      if (event.details?.duration !== undefined && event.details.duration !== null) {
        cleanDetails.duration = event.details.duration;
      }
      if (event.details?.correct !== undefined && event.details.correct !== null) {
        cleanDetails.correct = event.details.correct;
      }
      if (event.details?.total !== undefined && event.details.total !== null) {
        cleanDetails.total = event.details.total;
      }
      if (event.details?.gameType !== undefined && event.details.gameType !== null) {
        cleanDetails.gameType = event.details.gameType;
      }
      if (event.details?.feature !== undefined && event.details.feature !== null) {
        cleanDetails.feature = event.details.feature;
      }

      const sanitizedEvent = {
        id: event.id || '',
        type: event.type || 'practice',
        timestamp: event.timestamp || Date.now(),
        details: cleanDetails
      };

      // Only include userId if it exists
      if (event.userId) {
        sanitizedEvent.userId = event.userId;
      }

      return sanitizedEvent;
    });

    // Handle lastUpdated field - convert Firestore timestamp if needed
    let lastUpdated: number | undefined;
    if (activityWithoutId.lastUpdated) {
      if (typeof activityWithoutId.lastUpdated === 'number') {
        lastUpdated = activityWithoutId.lastUpdated;
      } else if (activityWithoutId.lastUpdated.toMillis) {
        // Firestore timestamp
        lastUpdated = activityWithoutId.lastUpdated.toMillis();
      } else if (activityWithoutId.lastUpdated.seconds) {
        // Firestore timestamp plain object
        lastUpdated = activityWithoutId.lastUpdated.seconds * 1000;
      }
    }

    const result: DailyActivity = {
      date: activityWithoutId.date || '',
      activities: sanitizedActivities,
      summary: {
        totalActivities: activityWithoutId.summary?.totalActivities || 0,
        drillsCompleted: activityWithoutId.summary?.drillsCompleted || 0,
        storiesRead: activityWithoutId.summary?.storiesRead || 0,
        articlesRead: activityWithoutId.summary?.articlesRead || 0,
        kanjiStudied: activityWithoutId.summary?.kanjiStudied || 0,
        gamesPlayed: activityWithoutId.summary?.gamesPlayed || 0,
        vocabStudied: activityWithoutId.summary?.vocabStudied || 0,
        flashcardsReviewed: activityWithoutId.summary?.flashcardsReviewed || 0,
        practiceSessionsCompleted: activityWithoutId.summary?.practiceSessionsCompleted || 0,
        totalScore: activityWithoutId.summary?.totalScore || 0,
        totalCorrect: activityWithoutId.summary?.totalCorrect || 0,
        totalQuestions: activityWithoutId.summary?.totalQuestions || 0
      }
    };

    // Only add lastUpdated if it's defined
    if (lastUpdated !== undefined) {
      result.lastUpdated = lastUpdated;
    }

    return result;
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }
}