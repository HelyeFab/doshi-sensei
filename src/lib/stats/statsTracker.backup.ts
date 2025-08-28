import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { UserScopedStorage } from '@/utils/userScopedStorage';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateTimeBasedStats } from '@/utils/timeBasedStats';
import { Subscription } from '@/lib/subscriptions/types';
import { hasPaidPlan, getUserSubscription } from '@/lib/subscriptions/helpers';
import { isSystemEnabled } from '@/config/debug';

// Activity event types
export type ActivityType = 'drill' | 'story' | 'article' | 'kanji' | 'game' | 'vocab' | 'flashcard' | 'practice';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId?: string;
  details: {
    itemId?: string;
    itemTitle?: string;
    score?: number;
    duration?: number;
    correct?: number;
    total?: number;
    gameType?: string;
    feature?: string;
  };
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD format
  activities: ActivityEvent[];
  summary: {
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
  };
  lastUpdated?: number; // Timestamp for when this was last updated
}

export interface UserStatsV2 {
  // User identification
  userId: string;
  
  // Core stats
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string; // YYYY-MM-DD format
  firstActiveDate: string; // YYYY-MM-DD format
  
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
  
  // Unique items tracking (new)
  learnedKanjiSet: string[];
  learnedWordsSet: string[];
  caughtPokemonSet: string[];
  
  // Activity-specific metrics (new)
  drillStats: {
    totalQuestions: number;
    totalCorrect: number;
  };
  kanjiStats: {
    totalQuestions: number;
    totalCorrect: number;
  };
  gameStats: {
    totalQuestions: number;
    totalCorrect: number;
  };
  
  // Metadata
  lastUpdated: number;
  version: string;
}

// Event listeners
type StatsUpdateListener = (stats: UserStatsV2) => void;

export class StatsTracker {
  private static instance: StatsTracker | null = null;
  private currentUser: User | null = null;
  private subscription: Subscription | null = null;
  private stats: UserStatsV2 | null = null;
  private activities: Map<string, DailyActivity> = new Map();
  private updateListeners: Set<StatsUpdateListener> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private pendingActivities: ActivityEvent[] = [];
  private syncInProgress: boolean = false;
  private lastSyncError: string | null = null;
  
  // Constants
  private static readonly STATS_STORE = 'statsV2';
  private static readonly ACTIVITIES_STORE = 'dailyActivities';
  private static readonly BACKUP_STORE = 'statsBackup';
  private static readonly SYNC_INTERVAL = 30000; // 30 seconds
  private static readonly BATCH_SIZE = 50;
  private static readonly VERSION = '2.1';
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): StatsTracker {
    if (!StatsTracker.instance) {
      StatsTracker.instance = new StatsTracker();
    }
    return StatsTracker.instance;
  }

  /**
   * Initialize the stats tracker with user context
   * Now includes comprehensive error handling and recovery
   */
  async initialize(user: User | null, subscription?: Subscription | null): Promise<void> {
    try {
      this.logSync('🚀', `Initializing stats tracker for user: ${user?.uid?.substr(0, 8) || 'Guest'}...`);
      
      // If switching to a different user, clear existing data
      if (this.currentUser?.uid !== user?.uid) {
        this.logSync('🧹', 'User changed, clearing existing data');
        this.stats = null;
        this.activities.clear();
        this.pendingActivities = [];
        this.lastSyncError = null;
      }
      
      this.currentUser = user;
      
      // Get subscription if not provided
      if (subscription !== undefined) {
        this.subscription = subscription;
      } else if (user) {
        try {
          this.subscription = await getUserSubscription(user);
        } catch (error) {
          this.logSync('⚠️', `Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
          this.subscription = null; // Assume free tier on error
        }
      } else {
        this.subscription = null;
      }
      
      // Load stats from storage (this is now safe with optimistic sync)
      await this.loadStats();
      
      // Update userId if user logged in and stats exist
      if (user && this.stats && this.stats.userId !== user.uid) {
        this.logSync('🔄', 'Updating userId in stats to match current user');
        this.stats.userId = user.uid;
        await this.saveToIndexedDB();
      }
      
      // Start sync timer for users with paid plans
      if (user && hasPaidPlan(this.subscription)) {
        this.startSyncTimer();
      } else {
        this.stopSyncTimer();
      }
      
      // Process any pending activities
      try {
        await this.processPendingActivities();
      } catch (error) {
        this.logSync('⚠️', `Failed to process pending activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't fail initialization due to pending activities
      }
      
      // Sync Pokemon count if needed
      try {
        await this.syncPokemonCount();
      } catch (error) {
        this.logSync('⚠️', `Failed to sync Pokemon count: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Don't fail initialization due to Pokemon sync
      }
      
      this.logSync('✅', 'Stats tracker initialization completed successfully');
      
    } catch (error) {
      this.logSync('❌', `Stats tracker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ [StatsTracker] Initialization error:', error);
      
      // Attempt graceful fallback
      try {
        this.stats = this.createInitialStats();
        this.logSync('🔧', 'Fallback to initial stats completed');
      } catch (fallbackError) {
        console.error('❌ [StatsTracker] Even fallback failed:', fallbackError);
        // At this point, we have a serious problem, but don't crash the app
        this.stats = null;
      }
    }
  }

  /**
   * Track an activity with robust error handling
   */
  async trackActivity(type: ActivityType, details: Partial<ActivityEvent['details']> = {}): Promise<void> {
    // Check if system is disabled for debugging
    if (!isSystemEnabled('stats')) {
      return;
    }
    
    try {
      const event: ActivityEvent = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        timestamp: Date.now(),
        userId: this.currentUser?.uid,
        details
      };

      this.logSync('📈', `Tracking activity: ${type}`);

      // Add to pending activities
      this.pendingActivities.push(event);

      // Process immediately with error handling
      try {
        await this.processPendingActivities();
      } catch (error) {
        this.logSync('⚠️', `Failed to process activity immediately: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Activity is still in pending queue, will be retried
      }
      
      // Update time-based stats for users with paid plans
      if (this.currentUser && hasPaidPlan(this.subscription)) {
        try {
          await updateTimeBasedStats(
            this.currentUser.uid,
            type,
            details.score || 0
          );
        } catch (error) {
          this.logSync('⚠️', `Time-based stats update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Don't throw - this is not critical for core functionality
        }
      }
      
    } catch (error) {
      this.logSync('❌', `Activity tracking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ [StatsTracker] Activity tracking error:', error);
      // Don't throw - we don't want to break user workflows due to stats issues
    }
  }

  /**
   * Get current stats
   */
  getStats(): UserStatsV2 {
    if (!this.stats) {
      this.stats = this.createInitialStats();
    }
    return { ...this.stats };
  }

  /**
   * Subscribe to stats updates
   */
  subscribe(listener: StatsUpdateListener): () => void {
    this.updateListeners.add(listener);
    // Send current stats immediately
    if (this.stats) {
      listener(this.getStats());
    }
    
    // Return unsubscribe function
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  /**
   * Force sync to cloud (for premium users) with status reporting
   */
  async forceSync(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser || !hasPaidPlan(this.subscription)) {
      return { success: false, error: 'User not eligible for cloud sync' };
    }

    try {
      await this.syncToCloud();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get sync status for debugging
   */
  getSyncStatus(): { 
    inProgress: boolean; 
    lastSyncTime: number; 
    lastError: string | null;
    isPremium: boolean;
    userId: string | null;
  } {
    return {
      inProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastSyncError,
      isPremium: this.currentUser ? hasPaidPlan(this.subscription) : false,
      userId: this.currentUser?.uid || null
    };
  }

  /**
   * Force reload from cloud with safe data handling
   * Now uses optimistic sync to prevent data loss
   */
  async forceReloadFromCloud(): Promise<void> {
    if (!this.currentUser || !hasPaidPlan(this.subscription)) {
      return;
    }

    this.logSync('🔄', 'Starting force reload from cloud');
    
    try {
      // Use the same safe loading mechanism
      await this.loadStatsWithOptimisticSync();
      
      // Notify listeners of the update
      this.notifyListeners();
      this.logSync('✅', 'Force reload completed successfully');
    } catch (error) {
      this.logSync('❌', `Force reload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Load stats from storage with optimistic sync pattern
   * This prevents data loss by backing up local data before cloud operations
   */
  private async loadStats(): Promise<void> {
    try {
      this.logSync('🔄', 'Starting stats load process');
      
      // For users with paid plans, implement optimistic sync
      if (this.currentUser && hasPaidPlan(this.subscription)) {
        await this.loadStatsWithOptimisticSync();
      } else {
        // For free users or when not logged in, use local storage only
        this.logSync('📱', 'Loading from local storage (free user)');
        const localStats = await this.loadFromIndexedDB();
        
        if (localStats) {
          this.stats = localStats;
          this.logSync('✅', `Loaded local stats (version ${localStats.version})`);
        }
      }

      // If still no stats, create initial
      if (!this.stats) {
        this.logSync('🆕', 'Creating initial stats');
        this.stats = this.createInitialStats();
        await this.saveToIndexedDB();
      }

      // Load activities for the last 90 days
      await this.loadRecentActivities();

      // Validate and fix streak
      await this.validateAndFixStreak();

      // Notify listeners
      this.notifyListeners();
      this.logSync('🎉', 'Stats load completed successfully');
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading stats:', error);
      this.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
      
      // Try to recover from backup if available
      const recoveredStats = await this.recoverFromBackup();
      if (recoveredStats) {
        this.stats = recoveredStats;
        this.logSync('🔧', 'Recovered stats from backup');
      } else {
        this.stats = this.createInitialStats();
        this.logSync('⚠️', 'Fallback to initial stats');
      }
    }
  }

  /**
   * Implements optimistic sync pattern for premium users
   * Only clears local data AFTER successful cloud fetch
   */
  private async loadStatsWithOptimisticSync(): Promise<void> {
    this.logSync('☁️', 'Starting optimistic sync for premium user');
    
    // Step 1: Create backup of existing local data
    const localStats = await this.loadFromIndexedDB();
    if (localStats) {
      await this.createBackup(localStats);
      this.logSync('💾', 'Created backup of local stats');
    }
    
    // Step 2: Attempt to load from cloud with retry logic
    const cloudStats = await this.loadFromCloudWithRetry();
    
    if (cloudStats) {
      this.logSync('☁️✅', 'Successfully loaded from cloud');
      
      // Step 3: Merge cloud and local data if both exist
      if (localStats) {
        this.stats = this.mergeStats(localStats, cloudStats);
        this.logSync('🔀', 'Merged local and cloud data');
      } else {
        this.stats = cloudStats;
      }
      
      // Step 4: Only now clear local data and save merged result
      await this.clearLocalData();
      await this.saveToIndexedDB();
      this.logSync('🧹', 'Cleared local data and saved merged result');
      
    } else if (localStats) {
      // Cloud load failed, fall back to local data
      this.stats = localStats;
      this.logSync('📱', 'Cloud load failed, using local data');
      
      // Try to sync local data to cloud in background (fire and forget)
      this.backgroundSyncToCloud().catch(error => {
        this.logSync('⚠️', `Background sync failed: ${error.message}`);
      });
      
    } else {
      // No local or cloud data, create initial stats
      this.logSync('🆕', 'No data found, creating initial stats');
      this.stats = this.createInitialStats();
      await this.saveToIndexedDB();
      
      // Try to save initial stats to cloud
      try {
        await this.saveToCloud();
        this.logSync('☁️💾', 'Saved initial stats to cloud');
      } catch (error) {
        this.logSync('⚠️', `Failed to save initial stats to cloud: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Load stats from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<UserStatsV2 | null> {
    // Guest users should not load from IndexedDB
    if (!this.currentUser) {

      return null;
    }
    
    try {
      const stored = await UserScopedStorage.getFromStore(
        StatsTracker.STATS_STORE,
        'userStats',
        this.currentUser?.uid || null
      );
      
      if (stored && stored.version === StatsTracker.VERSION) {
        // Remove the 'id' field added by IndexedDB storage
        const { id, ...cleanStats } = stored;
        return cleanStats as UserStatsV2;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Save stats to IndexedDB
   */
  private async saveToIndexedDB(): Promise<void> {
    if (!this.stats) return;
    
    // Guest users (no currentUser) should not persist to IndexedDB
    if (!this.currentUser) {

      return;
    }

    try {
      await UserScopedStorage.setToStore(
        StatsTracker.STATS_STORE,
        'userStats',
        this.stats,
        this.currentUser?.uid || null
      );

    } catch (error) {
      console.error('❌ [StatsTracker] Error saving to IndexedDB:', error);
    }
  }

  /**
   * Clear local IndexedDB data for current user
   * Used after successful cloud sync to ensure consistency
   */
  private async clearLocalData(): Promise<void> {
    if (!this.currentUser) return;
    
    try {
      this.logSync('🧹', 'Clearing local data');
      
      // Clear stats from IndexedDB
      await UserScopedStorage.deleteFromStore(
        StatsTracker.STATS_STORE,
        'userStats',
        this.currentUser.uid
      );
      
      // Clear activities from IndexedDB
      const thirtyDaysAgo = this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const today = this.getDateString(Date.now());
      const current = new Date(thirtyDaysAgo);
      const end = new Date(today);
      
      while (current <= end) {
        const dateStr = this.getDateString(current.getTime());
        await UserScopedStorage.deleteFromStore(
          StatsTracker.ACTIVITIES_STORE,
          dateStr,
          this.currentUser.uid
        );
        current.setDate(current.getDate() + 1);
      }
      
      // Clear in-memory cache
      this.activities.clear();
      
    } catch (error) {
      console.error('❌ [StatsTracker] Error clearing local data:', error);
      throw error; // Re-throw to prevent data loss
    }
  }

  /**
   * Create backup of stats data before potentially destructive operations
   */
  private async createBackup(stats: UserStatsV2): Promise<void> {
    if (!this.currentUser) return;
    
    try {
      const backup = {
        ...stats,
        backupTimestamp: Date.now(),
        backupVersion: StatsTracker.VERSION
      };
      
      await UserScopedStorage.setToStore(
        StatsTracker.BACKUP_STORE,
        'statsBackup',
        backup,
        this.currentUser.uid
      );
      
      this.logSync('💾', 'Created stats backup');
    } catch (error) {
      console.error('❌ [StatsTracker] Error creating backup:', error);
      // Don't throw - backup failure shouldn't stop the sync process
    }
  }

  /**
   * Recover stats from backup if available
   */
  private async recoverFromBackup(): Promise<UserStatsV2 | null> {
    if (!this.currentUser) return null;
    
    try {
      const backup = await UserScopedStorage.getFromStore(
        StatsTracker.BACKUP_STORE,
        'statsBackup',
        this.currentUser.uid
      );
      
      if (backup && backup.backupVersion === StatsTracker.VERSION) {
        // Remove backup-specific fields
        const { id, backupTimestamp, backupVersion, ...stats } = backup;
        this.logSync('🔧', `Recovered from backup created at ${new Date(backupTimestamp).toISOString()}`);
        return stats as UserStatsV2;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [StatsTracker] Error recovering from backup:', error);
      return null;
    }
  }

  /**
   * Load from cloud with retry logic and exponential backoff
   */
  private async loadFromCloudWithRetry(): Promise<UserStatsV2 | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= StatsTracker.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        this.logSync('☁️', `Cloud load attempt ${attempt}/${StatsTracker.MAX_RETRY_ATTEMPTS}`);
        
        const result = await this.loadFromCloud();
        if (result) {
          this.lastSyncError = null; // Clear any previous errors
          return result;
        }
        
        // If result is null but no error, it means no data exists in cloud
        return null;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        this.logSync('⚠️', `Cloud load attempt ${attempt} failed: ${lastError.message}`);
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < StatsTracker.MAX_RETRY_ATTEMPTS) {
          const delay = StatsTracker.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          this.logSync('⏳', `Waiting ${delay}ms before retry`);
          await this.sleep(delay);
        }
      }
    }
    
    // All attempts failed
    this.lastSyncError = lastError?.message || 'Cloud load failed after all retries';
    this.logSync('❌', `All cloud load attempts failed: ${this.lastSyncError}`);
    return null;
  }

  /**
   * Merge local and cloud stats, preferring newer data based on lastUpdated timestamp
   */
  private mergeStats(localStats: UserStatsV2, cloudStats: UserStatsV2): UserStatsV2 {
    this.logSync('🔀', `Merging stats - Local: ${new Date(localStats.lastUpdated).toISOString()}, Cloud: ${new Date(cloudStats.lastUpdated).toISOString()}`);
    
    // If timestamps are significantly different, prefer the newer one
    const timeDiff = Math.abs(localStats.lastUpdated - cloudStats.lastUpdated);
    const MERGE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    if (timeDiff > MERGE_THRESHOLD) {
      if (localStats.lastUpdated > cloudStats.lastUpdated) {
        this.logSync('📱', 'Local data is newer, using local stats');
        return localStats;
      } else {
        this.logSync('☁️', 'Cloud data is newer, using cloud stats');
        return cloudStats;
      }
    }
    
    // If timestamps are close, merge strategically
    this.logSync('⚖️', 'Timestamps are close, performing strategic merge');
    
    const merged: UserStatsV2 = {
      ...cloudStats, // Start with cloud as base
      
      // Use the maximum values for cumulative stats (they should only increase)
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
      
      // Use the more recent date for date fields
      firstActiveDate: this.getEarlierDate(localStats.firstActiveDate, cloudStats.firstActiveDate),
      lastActiveDate: this.getLaterDate(localStats.lastActiveDate, cloudStats.lastActiveDate),
      
      // Merge arrays (remove duplicates)
      learnedKanjiSet: this.mergeArrays(localStats.learnedKanjiSet, cloudStats.learnedKanjiSet),
      learnedWordsSet: this.mergeArrays(localStats.learnedWordsSet, cloudStats.learnedWordsSet),
      caughtPokemonSet: this.mergeArrays(localStats.caughtPokemonSet, cloudStats.caughtPokemonSet),
      
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
      version: StatsTracker.VERSION
    };
    
    // Recalculate accuracy stats based on merged totals
    if (merged.totalQuestionsAnswered > 0) {
      merged.overallAccuracy = Math.round((merged.totalCorrectAnswers / merged.totalQuestionsAnswered) * 100);
    }
    if (merged.drillStats.totalQuestions > 0) {
      merged.drillAccuracy = Math.round((merged.drillStats.totalCorrect / merged.drillStats.totalQuestions) * 100);
    }
    if (merged.kanjiStats.totalQuestions > 0) {
      merged.kanjiAccuracy = Math.round((merged.kanjiStats.totalCorrect / merged.kanjiStats.totalQuestions) * 100);
    }
    if (merged.gameStats.totalQuestions > 0) {
      merged.gameAccuracy = Math.round((merged.gameStats.totalCorrect / merged.gameStats.totalQuestions) * 100);
    }
    
    return merged;
  }

  /**
   * Background sync to cloud (fire and forget)
   */
  private async backgroundSyncToCloud(): Promise<void> {
    if (this.syncInProgress) {
      this.logSync('⏳', 'Sync already in progress, skipping background sync');
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      this.logSync('🔄', 'Starting background sync to cloud');
      await this.saveToCloud();
      this.logSync('✅', 'Background sync completed successfully');
    } catch (error) {
      this.logSync('❌', `Background sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Safe logging for sync operations (doesn't expose sensitive data)
   */
  private logSync(icon: string, message: string): void {
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS format
    const userPrefix = this.currentUser ? `User:${this.currentUser.uid.substr(0, 8)}...` : 'Guest';
    console.log(`${icon} [StatsSync:${timestamp}] ${userPrefix} - ${message}`);
  }

  /**
   * Utility method for sleeping/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Merge two arrays and remove duplicates
   */
  private mergeArrays(arr1: string[], arr2: string[]): string[] {
    const combined = [...arr1, ...arr2];
    return [...new Set(combined)];
  }

  /**
   * Load stats from cloud (with network failure detection)
   */
  private async loadFromCloud(): Promise<UserStatsV2 | null> {
    // First check if user exists and has a valid uid
    if (!this.currentUser || !this.currentUser.uid) {
      return null;
    }
    
    // Check for guest user (uid might be 'guest' or similar)
    if (this.currentUser.uid === 'guest' || this.currentUser.uid.includes('guest')) {
      return null;
    }

    try {
      const userStatsRef = collection(db, 'userStats', this.currentUser.uid, 'current');
      
      // Load all documents in parallel with timeout
      const loadPromise = Promise.all([
        getDoc(doc(userStatsRef, 'summary')),
        getDoc(doc(userStatsRef, 'activities')),
        getDoc(doc(userStatsRef, 'performance')),
        getDoc(doc(userStatsRef, 'metadata'))
      ]);
      
      // Add timeout to detect network issues
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Cloud load timeout after 10 seconds')), 10000);
      });
      
      const [summaryDoc, activitiesDoc, performanceDoc, metadataDoc] = await Promise.race([
        loadPromise,
        timeoutPromise
      ]);
      
      // If no documents exist, try loading from old structure
      if (!summaryDoc.exists() && !activitiesDoc.exists()) {
        // Try old structure for backward compatibility
        const oldStatsRef = doc(db, 'userStats', this.currentUser.uid);
        const oldSnapshot = await getDoc(oldStatsRef);
        
        if (oldSnapshot.exists()) {
          const data = oldSnapshot.data();
          // Convert Firestore timestamp to number
          if (data.lastUpdated?.toMillis) {
            data.lastUpdated = data.lastUpdated.toMillis();
          }
          // Remove any 'id' field that might have been accidentally saved
          const { id, ...cleanData } = data;
          
          this.logSync('🔄', 'Migrating from old structure');
          return cleanData as UserStatsV2;
        }
        
        return null;
      }
      
      // Reconstruct stats from new structure
      const stats: Partial<UserStatsV2> = {
        userId: this.currentUser.uid,
        version: '2.1'
      };
      
      // Merge summary data
      if (summaryDoc.exists()) {
        const summaryData = summaryDoc.data();
        Object.assign(stats, {
          currentStreak: summaryData.currentStreak || 0,
          longestStreak: summaryData.longestStreak || 0,
          totalDaysActive: summaryData.totalDaysActive || 0,
          lastActiveDate: summaryData.lastActiveDate || '',
          firstActiveDate: summaryData.firstActiveDate || '',
          totalActivities: summaryData.totalActivities || 0,
          pokemonCaught: summaryData.pokemonCaught || 0
        });
      }
      
      // Merge activities data
      if (activitiesDoc.exists()) {
        const activitiesData = activitiesDoc.data();
        Object.assign(stats, {
          drillsCompleted: activitiesData.drillsCompleted || 0,
          storiesRead: activitiesData.storiesRead || 0,
          articlesRead: activitiesData.articlesRead || 0,
          kanjiStudySessions: activitiesData.kanjiStudySessions || 0,
          gamesPlayed: activitiesData.gamesPlayed || 0,
          flashcardsReviewed: activitiesData.flashcardsReviewed || 0,
          practiceSessionsCompleted: activitiesData.practiceSessionsCompleted || 0,
          vocabStudied: activitiesData.vocabStudied || 0
        });
      }
      
      // Merge performance data
      if (performanceDoc.exists()) {
        const performanceData = performanceDoc.data();
        Object.assign(stats, {
          overallAccuracy: performanceData.overallAccuracy || 0,
          drillAccuracy: performanceData.drillAccuracy || 0,
          kanjiAccuracy: performanceData.kanjiAccuracy || 0,
          gameAccuracy: performanceData.gameAccuracy || 0,
          totalQuestionsAnswered: performanceData.totalQuestionsAnswered || 0,
          totalCorrectAnswers: performanceData.totalCorrectAnswers || 0,
          totalKanjiLearned: performanceData.totalKanjiLearned || 0,
          totalWordsLearned: performanceData.totalWordsLearned || 0,
          totalGameScore: performanceData.totalGameScore || 0,
          drillStats: performanceData.drillStats || { totalQuestions: 0, totalCorrect: 0 },
          kanjiStats: performanceData.kanjiStats || { totalQuestions: 0, totalCorrect: 0 },
          gameStats: performanceData.gameStats || { totalQuestions: 0, totalCorrect: 0 }
        });
      }
      
      // Handle metadata timestamp
      let lastUpdated = Date.now();
      if (metadataDoc.exists()) {
        const metadata = metadataDoc.data();
        if (metadata.lastUpdated?.toMillis) {
          lastUpdated = metadata.lastUpdated.toMillis();
        } else if (metadata.lastUpdated && typeof metadata.lastUpdated === 'number') {
          lastUpdated = metadata.lastUpdated;
        }
      }
      
      // Set default values for missing fields
      const completeStats: UserStatsV2 = {
        ...this.createInitialStats(),
        ...stats,
        lastUpdated,
        learnedKanjiSet: [],
        learnedWordsSet: [],
        caughtPokemonSet: []
      };
      
      // Recalculate totalActivities from individual counts
      // This fixes the issue where totalActivities in Firebase is 0 but actual activities exist
      completeStats.totalActivities = 
        completeStats.drillsCompleted +
        completeStats.storiesRead +
        completeStats.articlesRead +
        completeStats.kanjiStudySessions +
        completeStats.gamesPlayed +
        completeStats.vocabStudied +
        completeStats.flashcardsReviewed +
        completeStats.practiceSessionsCompleted;

      return completeStats;
    } catch (error) {
      // Check if it's a network error
      if (error instanceof Error) {
        if (error.message.includes('network') || 
            error.message.includes('timeout') || 
            error.message.includes('offline') ||
            error.message.includes('fetch')) {
          throw new Error(`Network error: ${error.message}`);
        }
      }
      
      console.error('❌ [StatsTracker] Error loading from cloud:', error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Save stats to cloud with comprehensive error handling
   */
  private async saveToCloud(): Promise<void> {
    // Check if system is disabled for debugging
    if (!isSystemEnabled('stats')) {
      return;
    }

    // First check if user exists and has a valid uid
    if (!this.currentUser || !this.currentUser.uid) {
      return;
    }
    
    // Check for guest user (uid might be 'guest' or similar)
    if (this.currentUser.uid === 'guest' || this.currentUser.uid.includes('guest')) {
      return;
    }
    
    if (!this.stats) {
      throw new Error('No stats data to save');
    }

    // Additional check for paid plan
    if (!hasPaidPlan(this.subscription)) {
      return;
    }

    // Ensure the userId in stats matches the current user
    if (this.stats.userId !== this.currentUser.uid) {
      this.logSync('🔄', 'Updating userId in stats to match current user');
      this.stats.userId = this.currentUser.uid;
      await this.saveToIndexedDB();
    }

    try {
      const userStatsRef = collection(db, 'userStats', this.currentUser.uid, 'current');
      
      // Update lastUpdated timestamp before saving
      this.stats.lastUpdated = Date.now();
      
      // Save to organized documents with timeout protection
      const batch = [];
      
      // 1. Summary stats document
      batch.push(setDoc(doc(userStatsRef, 'summary'), {
        currentStreak: this.stats.currentStreak,
        longestStreak: this.stats.longestStreak,
        totalDaysActive: this.stats.totalDaysActive,
        lastActiveDate: this.stats.lastActiveDate,
        firstActiveDate: this.stats.firstActiveDate,
        totalActivities: this.stats.totalActivities,
        pokemonCaught: this.stats.pokemonCaught,
        lastUpdated: serverTimestamp()
      }));
      
      // 2. Activity totals document
      batch.push(setDoc(doc(userStatsRef, 'activities'), {
        drillsCompleted: this.stats.drillsCompleted,
        storiesRead: this.stats.storiesRead,
        articlesRead: this.stats.articlesRead,
        kanjiStudySessions: this.stats.kanjiStudySessions,
        gamesPlayed: this.stats.gamesPlayed,
        flashcardsReviewed: this.stats.flashcardsReviewed,
        practiceSessionsCompleted: this.stats.practiceSessionsCompleted,
        vocabStudied: this.stats.vocabStudied,
        lastUpdated: serverTimestamp()
      }));
      
      // 3. Performance metrics document
      batch.push(setDoc(doc(userStatsRef, 'performance'), {
        overallAccuracy: this.stats.overallAccuracy,
        drillAccuracy: this.stats.drillAccuracy,
        kanjiAccuracy: this.stats.kanjiAccuracy,
        gameAccuracy: this.stats.gameAccuracy,
        totalQuestionsAnswered: this.stats.totalQuestionsAnswered,
        totalCorrectAnswers: this.stats.totalCorrectAnswers,
        totalKanjiLearned: this.stats.totalKanjiLearned,
        totalWordsLearned: this.stats.totalWordsLearned,
        totalGameScore: this.stats.totalGameScore,
        drillStats: this.stats.drillStats,
        kanjiStats: this.stats.kanjiStats,
        gameStats: this.stats.gameStats,
        lastUpdated: serverTimestamp()
      }));
      
      // 4. Metadata document
      batch.push(setDoc(doc(userStatsRef, 'metadata'), {
        userId: this.stats.userId,
        email: this.currentUser.email || '',
        version: this.stats.version,
        lastUpdated: serverTimestamp()
      }));
      
      // Execute all saves with timeout protection
      const savePromise = Promise.all(batch);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Save timeout after 15 seconds')), 15000);
      });
      
      await Promise.race([savePromise, timeoutPromise]);
      
      // Verify critical documents were saved
      const [summaryDoc, activitiesDoc] = await Promise.all([
        getDoc(doc(db, 'userStats', this.currentUser.uid, 'current', 'summary')),
        getDoc(doc(db, 'userStats', this.currentUser.uid, 'current', 'activities'))
      ]);
      
      if (!summaryDoc.exists() || !activitiesDoc.exists()) {
        throw new Error('Verification failed - documents not created properly');
      }
      
      this.logSync('☁️✅', 'Stats saved to cloud successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logSync('❌', `Failed to save to cloud: ${errorMessage}`);
      
      // Check if it's a network/timeout error vs data corruption
      if (errorMessage.includes('timeout') || 
          errorMessage.includes('network') || 
          errorMessage.includes('offline')) {
        // Network issue - stats will sync later
        console.warn('⚠️ [StatsTracker] Cloud save failed due to network issue, will retry later:', errorMessage);
      } else {
        // Data or permission issue - more serious
        console.error('❌ [StatsTracker] Critical cloud save error:', error);
      }
      
      throw error; // Re-throw to let calling code handle appropriately
    }
  }

  /**
   * Process pending activities with improved error handling
   */
  private async processPendingActivities(): Promise<void> {
    if (this.pendingActivities.length === 0) return;

    const activities = [...this.pendingActivities];
    this.pendingActivities = [];
    
    this.logSync('🔄', `Processing ${activities.length} pending activities`);

    let processed = 0;
    let failed = 0;
    
    for (const activity of activities) {
      try {
        await this.processActivity(activity);
        processed++;
      } catch (error) {
        failed++;
        this.logSync('⚠️', `Failed to process activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Continue processing other activities
      }
    }

    // Update last updated timestamp to ensure we don't overwrite with older cloud data
    if (this.stats) {
      this.stats.lastUpdated = Date.now();
    }
    
    try {
      // Save stats
      await this.saveToIndexedDB();
      
      this.logSync('✅', `Processed activities: ${processed} success, ${failed} failed`);
    } catch (error) {
      this.logSync('❌', `Failed to save processed activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Put failed activities back in queue for retry
      if (failed > 0) {
        this.pendingActivities = [...this.pendingActivities, ...activities.slice(-failed)];
      }
      throw error;
    }
    
    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Process a single activity
   */
  private async processActivity(event: ActivityEvent): Promise<void> {
    if (!this.stats) {
      this.stats = this.createInitialStats();
    }

    const date = this.getDateString(event.timestamp);
    
    // Get or create daily activity
    let daily = this.activities.get(date);
    if (!daily) {
      daily = this.createDailyActivity(date);
      this.activities.set(date, daily);
    }

    // Add activity to daily record
    daily.activities.push(event);
    
    // Update daily summary
    this.updateDailySummary(daily, event);
    
    // Update overall stats
    this.updateOverallStats(event);
    
    // Update streak
    this.updateStreak(date);
    
    // Save daily activity
    await this.saveDailyActivity(date, daily);
  }

  /**
   * Update daily summary with new activity
   */
  private updateDailySummary(daily: DailyActivity, event: ActivityEvent): void {
    daily.summary.totalActivities++;

    switch (event.type) {
      case 'drill':
        daily.summary.drillsCompleted++;
        break;
      case 'story':
        daily.summary.storiesRead++;
        break;
      case 'article':
        daily.summary.articlesRead++;
        break;
      case 'kanji':
        daily.summary.kanjiStudied++;
        break;
      case 'game':
        daily.summary.gamesPlayed++;
        break;
      case 'vocab':
        daily.summary.vocabStudied++;
        break;
      case 'flashcard':
        daily.summary.flashcardsReviewed++;
        break;
      case 'practice':
        daily.summary.practiceSessionsCompleted++;
        break;
    }

    if (event.details.correct !== undefined && event.details.total !== undefined) {
      daily.summary.totalCorrect += event.details.correct;
      daily.summary.totalQuestions += event.details.total;
    }

    if (event.details.score !== undefined) {
      daily.summary.totalScore += event.details.score;
    }
  }

  /**
   * Update overall stats with new activity
   */
  private updateOverallStats(event: ActivityEvent): void {
    if (!this.stats) return;

    this.stats.totalActivities++;
    this.stats.lastUpdated = Date.now();

    // Validate data before processing
    if (!this.validateActivityData(event)) {

      return;
    }

    switch (event.type) {
      case 'drill':
        this.stats.drillsCompleted++;

        break;
      case 'story':
        this.stats.storiesRead++;

        break;
      case 'article':
        this.stats.articlesRead++;

        break;
      case 'kanji':
        this.stats.kanjiStudySessions++;
        // Track unique kanji learned
        if (event.details.itemId && !this.stats.learnedKanjiSet.includes(event.details.itemId)) {
          this.stats.learnedKanjiSet.push(event.details.itemId);
          this.stats.totalKanjiLearned = this.stats.learnedKanjiSet.length;
        }
        break;
      case 'game':
        this.stats.gamesPlayed++;

        // Track unique Pokemon caught
        if (event.details.gameType === 'pokemon' && event.details.itemId) {
          if (!this.stats.caughtPokemonSet.includes(event.details.itemId)) {
            this.stats.caughtPokemonSet.push(event.details.itemId);
            this.stats.pokemonCaught = this.stats.caughtPokemonSet.length;
          }
        }
        break;
      case 'vocab':
        this.stats.vocabStudied++;
        // Track unique words learned
        if (event.details.itemId && !this.stats.learnedWordsSet.includes(event.details.itemId)) {
          this.stats.learnedWordsSet.push(event.details.itemId);
          this.stats.totalWordsLearned = this.stats.learnedWordsSet.length;
        }
        break;
      case 'flashcard':
        this.stats.flashcardsReviewed++;
        break;
      case 'practice':
        this.stats.practiceSessionsCompleted++;
        break;
    }

    // Update accuracy metrics with activity-specific tracking
    if (event.details.correct !== undefined && event.details.total !== undefined) {
      this.stats.totalCorrectAnswers += event.details.correct;
      this.stats.totalQuestionsAnswered += event.details.total;
      
      // Recalculate overall accuracy
      if (this.stats.totalQuestionsAnswered > 0) {
        this.stats.overallAccuracy = Math.round(
          (this.stats.totalCorrectAnswers / this.stats.totalQuestionsAnswered) * 100
        );
      }

      // Update activity-specific accuracies
      switch (event.type) {
        case 'drill':
          this.stats.drillStats.totalCorrect += event.details.correct;
          this.stats.drillStats.totalQuestions += event.details.total;
          if (this.stats.drillStats.totalQuestions > 0) {
            this.stats.drillAccuracy = Math.round(
              (this.stats.drillStats.totalCorrect / this.stats.drillStats.totalQuestions) * 100
            );
          }
          break;
        case 'kanji':
          this.stats.kanjiStats.totalCorrect += event.details.correct;
          this.stats.kanjiStats.totalQuestions += event.details.total;
          if (this.stats.kanjiStats.totalQuestions > 0) {
            this.stats.kanjiAccuracy = Math.round(
              (this.stats.kanjiStats.totalCorrect / this.stats.kanjiStats.totalQuestions) * 100
            );
          }
          break;
        case 'game':
          this.stats.gameStats.totalCorrect += event.details.correct;
          this.stats.gameStats.totalQuestions += event.details.total;
          if (this.stats.gameStats.totalQuestions > 0) {
            this.stats.gameAccuracy = Math.round(
              (this.stats.gameStats.totalCorrect / this.stats.gameStats.totalQuestions) * 100
            );
          }
          break;
      }
    }

    // Update game score
    if (event.details.score !== undefined) {
      this.stats.totalGameScore += event.details.score;
    }
  }

  /**
   * Validate activity data before processing
   */
  private validateActivityData(event: ActivityEvent): boolean {
    // Check for invalid correct/total combinations
    if (event.details.correct !== undefined && event.details.total !== undefined) {
      if (event.details.correct < 0 || event.details.total < 0) {
        return false;
      }
      if (event.details.correct > event.details.total) {
        return false;
      }
    }

    // Check for invalid scores
    if (event.details.score !== undefined && event.details.score < 0) {
      return false;
    }

    // Check for invalid duration
    if (event.details.duration !== undefined && event.details.duration < 0) {
      return false;
    }

    return true;
  }

  /**
   * Update streak based on activity date
   */
  private updateStreak(activityDate: string): void {
    if (!this.stats) return;

    const today = this.getDateString(Date.now());
    const yesterday = this.getDateString(Date.now() - 24 * 60 * 60 * 1000);
    
    // Debug logging

    // Update first active date
    if (!this.stats.firstActiveDate || activityDate < this.stats.firstActiveDate) {
      this.stats.firstActiveDate = activityDate;
    }

    // Check if we need to update streak - only process if activity is for today
    if (activityDate === today) {
      // Check previous activity to determine streak status
      if (!this.stats.lastActiveDate || this.stats.lastActiveDate === '') {
        // First activity ever

        this.stats.currentStreak = 1;
      } else if (this.stats.lastActiveDate === today) {
        // Already processed today - no change needed

        return;
      } else if (this.stats.lastActiveDate === yesterday) {
        // Consecutive day - INCREMENT the streak!
        this.stats.currentStreak += 1;

      } else {
        // Gap in activity - reset streak to 1
        const previousStreak = this.stats.currentStreak;
        this.stats.currentStreak = 1;

      }
      
      // Update last active date AFTER checking (this was the critical bug!)
      this.stats.lastActiveDate = today;
    }

    // Update longest streak
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;

    }
  }

  /**
   * Validate and fix streak based on actual activity data
   */
  private async validateAndFixStreak(): Promise<void> {
    if (!this.stats) return;

    // Get all activity dates
    const activityDates = new Set<string>();
    
    // Add dates from current activities
    this.activities.forEach((_, date) => activityDates.add(date));
    
    // Load more historical data if needed
    const oldestDate = this.getDateString(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const historicalActivities = await this.loadActivitiesRange(oldestDate, this.getDateString(Date.now()));
    
    historicalActivities.forEach(activity => {
      if (activity.summary.totalActivities > 0) {
        activityDates.add(activity.date);
      }
    });

    // Sort dates
    const sortedDates = Array.from(activityDates).sort();

    if (sortedDates.length > 0) {

    }
    
    if (sortedDates.length === 0) {

      this.stats.currentStreak = 0;
      this.stats.totalDaysActive = 0;
      return;
    }

    // Calculate actual current streak (counting backwards from today)
    let actualStreak = 0;
    const today = this.getDateString(Date.now());
    const yesterday = this.getDateString(Date.now() - 24 * 60 * 60 * 1000);
    let checkDate = today;

    // console.log(`📊 [StatsTracker] Checking streak from today (${today}) backwards...`);
    
    // First check if user has activity today
    if (activityDates.has(today)) {
      // User has activity today, count backwards normally
      while (activityDates.has(checkDate)) {
        actualStreak++;

        const prevDate = new Date(checkDate + 'T00:00:00.000Z'); // Ensure UTC
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        checkDate = this.getDateString(prevDate.getTime());
      }
    } else if (activityDates.has(yesterday)) {
      // No activity today yet, but was active yesterday - preserve streak

      checkDate = yesterday;
      while (activityDates.has(checkDate)) {
        actualStreak++;

        const prevDate = new Date(checkDate + 'T00:00:00.000Z'); // Ensure UTC
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        checkDate = this.getDateString(prevDate.getTime());
      }

    } else {
      // No activity yesterday or today - streak is broken

      actualStreak = 0;
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let currentCheckStreak = 0;
    let lastDate: string | null = null;
    
    for (const date of sortedDates) {
      if (lastDate === null) {
        currentCheckStreak = 1;
      } else {
        const lastDateTime = new Date(lastDate + 'T00:00:00.000Z');
        const currentDateTime = new Date(date + 'T00:00:00.000Z');
        const daysDiff = Math.round((currentDateTime.getTime() - lastDateTime.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysDiff === 1) {
          currentCheckStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentCheckStreak);
          currentCheckStreak = 1;
        }
      }
      lastDate = date;
    }
    longestStreak = Math.max(longestStreak, currentCheckStreak);

    // Update stats if different
    const previousStreak = this.stats.currentStreak;
    const previousLongest = this.stats.longestStreak;
    const previousActive = this.stats.totalDaysActive;
    
    this.stats.currentStreak = actualStreak;
    this.stats.longestStreak = Math.max(longestStreak, actualStreak, this.stats.longestStreak);
    this.stats.totalDaysActive = activityDates.size;
    
    if (actualStreak !== previousStreak || this.stats.longestStreak !== previousLongest || this.stats.totalDaysActive !== previousActive) {

    } else {

    }
    
    // Update dates if needed
    if (sortedDates.length > 0) {
      if (!this.stats.firstActiveDate || sortedDates[0] < this.stats.firstActiveDate) {
        this.stats.firstActiveDate = sortedDates[0];

      }
      if (!this.stats.lastActiveDate || sortedDates[sortedDates.length - 1] > this.stats.lastActiveDate) {
        this.stats.lastActiveDate = sortedDates[sortedDates.length - 1];

      }
    }
  }

  /**
   * Save daily activity to storage
   */
  private async saveDailyActivity(date: string, activity: DailyActivity): Promise<void> {
    // Guest users should not persist activities
    if (!this.currentUser) {

      return;
    }
    
    try {
      // Don't include the date as a separate field since it's already the key
      const activityToSave = {
        ...activity,
        date // Ensure date is included in the object
      };
      
      await UserScopedStorage.setToStore(
        StatsTracker.ACTIVITIES_STORE,
        date,
        activityToSave,
        this.currentUser?.uid || null
      );
    } catch (error) {
      console.error(`❌ [StatsTracker] Error saving daily activity for ${date}:`, error);
    }
  }

  /**
   * Load activities for a date range
   */
  private async loadActivitiesRange(startDate: string, endDate: string): Promise<DailyActivity[]> {
    const activities: DailyActivity[] = [];
    
    // Guest users should not load from storage
    if (!this.currentUser) {

      return activities;
    }
    
    try {
      const current = new Date(startDate);
      const end = new Date(endDate);
      
      while (current <= end) {
        const dateStr = this.getDateString(current.getTime());
        const activity = await UserScopedStorage.getFromStore(
          StatsTracker.ACTIVITIES_STORE,
          dateStr,
          this.currentUser?.uid || null
        );
        
        if (activity) {
          // Sanitize loaded activity to ensure all fields are defined
          const sanitized = this.sanitizeDailyActivity(activity as DailyActivity);
          activities.push(sanitized);
          this.activities.set(dateStr, sanitized);
        }
        
        current.setDate(current.getDate() + 1);
      }
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading activities:', error);
    }
    
    return activities;
  }

  /**
   * Load recent activities (last 30 days) with offline resilience
   */
  private async loadRecentActivities(): Promise<void> {
    const thirtyDaysAgo = this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = this.getDateString(Date.now());
    
    try {
      // First load from IndexedDB (always available)
      this.logSync('📅', 'Loading recent activities from local storage');
      await this.loadActivitiesRange(thirtyDaysAgo, today);
      
      // For users with paid plans, also check cloud for any newer activities
      if (this.currentUser && hasPaidPlan(this.subscription)) {
        try {
          this.logSync('☁️', 'Loading recent activities from cloud');
          await this.loadActivitiesFromCloud(thirtyDaysAgo, today);
          
          // After loading activities, recalculate totals from daily activities
          // This ensures our stats reflect the actual activities in the database
          await this.recalculateTotalsFromDailyActivities();
        } catch (error) {
          this.logSync('⚠️', `Cloud activity load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with local data if cloud load fails - this is not critical
        }
      }
    } catch (error) {
      this.logSync('❌', `Failed to load recent activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ [StatsTracker] Error loading recent activities:', error);
      // This is more serious as local data failed - but don't fail completely
    }
  }

  /**
   * Sync stats to cloud with improved error handling
   */
  private async syncToCloud(): Promise<void> {
    // Check if system is disabled for debugging
    if (!isSystemEnabled('stats')) {
      return;
    }
    
    // First check if user exists and has a valid uid
    if (!this.currentUser || !this.currentUser.uid) {
      return;
    }
    
    // Check for guest user (uid might be 'guest' or similar)
    if (this.currentUser.uid === 'guest' || this.currentUser.uid.includes('guest')) {
      return;
    }
    
    if (!hasPaidPlan(this.subscription)) {
      return;
    }

    // Prevent concurrent syncs
    if (this.syncInProgress) {
      this.logSync('⏳', 'Sync already in progress, skipping');
      return;
    }

    const now = Date.now();
    
    // Debounce syncs (min 5 seconds between syncs)
    if (now - this.lastSyncTime < 5000) {
      return;
    }

    this.syncInProgress = true;
    this.lastSyncTime = now;

    try {
      this.logSync('☁️💾', 'Starting sync to cloud');

      // Save stats
      await this.saveToCloud();
      
      // Save recent activities to new structure
      const recentActivities = Array.from(this.activities.entries())
        .filter(([date]) => {
          const activityTime = new Date(date).getTime();
          return now - activityTime < 7 * 24 * 60 * 60 * 1000; // Last 7 days
        });

      let activitiesSaved = 0;
      for (const [date, activity] of recentActivities) {
        // Double-check we have a user before trying to save
        if (!this.currentUser) {
          continue;
        }
        
        try {
          // New collection structure: /userStats/{userId}/dailyActivities/{date}/
          const activityRef = doc(db, 'userStats', this.currentUser.uid, 'dailyActivities', date);
          
          // Ensure all fields are defined before saving to Firebase
          const sanitizedActivity = this.sanitizeDailyActivity(activity);
          
          // Final sanitization: use JSON stringify/parse to remove any undefined values
          const finalSanitized = JSON.parse(JSON.stringify(sanitizedActivity));
          
          // Add metadata for the new structure
          const activityData = {
            ...finalSanitized,
            lastUpdated: serverTimestamp()
          };
          
          await setDoc(activityRef, activityData);
          activitiesSaved++;
        } catch (error) {
          this.logSync('⚠️', `Failed to save activity for ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with other activities instead of failing completely
        }
      }
      
      this.lastSyncError = null; // Clear any previous errors
      this.logSync('✅', `Sync completed - ${activitiesSaved}/${recentActivities.length} activities saved`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.lastSyncError = errorMessage;
      this.logSync('❌', `Sync failed: ${errorMessage}`);
      console.error('❌ [StatsTracker] Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Load activities from cloud for a date range with improved error handling
   */
  private async loadActivitiesFromCloud(startDate: string, endDate: string): Promise<void> {
    // First check if user exists and has a valid uid
    if (!this.currentUser || !this.currentUser.uid) {
      return;
    }
    
    // Check for guest user (uid might be 'guest' or similar)
    if (this.currentUser.uid === 'guest' || this.currentUser.uid.includes('guest')) {
      return;
    }
    
    if (!hasPaidPlan(this.subscription)) {
      return;
    }
    
    try {
      this.logSync('📅', `Loading activities from cloud: ${startDate} to ${endDate}`);
      
      const activitiesRef = collection(db, 'userStats', this.currentUser.uid, 'dailyActivities');
      
      // Query activities within date range
      const q = query(
        activitiesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date')
      );
      
      const snapshot = await getDocs(q);
      let activitiesLoaded = 0;
      let activitiesUpdated = 0;
      
      // Use for...of to properly handle await
      for (const docSnapshot of snapshot.docs) {
        const activity = docSnapshot.data() as DailyActivity;
        const date = docSnapshot.id; // Document ID is the date
        
        // Check if cloud version is newer than local
        const localActivity = this.activities.get(date);
        const shouldUpdate = !localActivity || 
          (activity.lastUpdated && localActivity.lastUpdated && 
           activity.lastUpdated > localActivity.lastUpdated);
        
        if (shouldUpdate) {
          try {
            // Sanitize and store the cloud activity
            const sanitized = this.sanitizeDailyActivity(activity);
            this.activities.set(date, sanitized);
            
            // Also save to IndexedDB for offline access
            await this.saveDailyActivity(date, sanitized);
            activitiesUpdated++;
          } catch (error) {
            this.logSync('⚠️', `Failed to process activity for ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        activitiesLoaded++;
      }
      
      this.logSync('📅✅', `Loaded ${activitiesLoaded} activities, updated ${activitiesUpdated}`);

    } catch (error) {
      this.logSync('❌', `Failed to load activities from cloud: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ [StatsTracker] Error loading activities from cloud:', error);
      // Don't re-throw - this is not a critical failure
    }
  }

  /**
   * Start periodic sync timer with better error handling
   */
  private startSyncTimer(): void {
    this.stopSyncTimer();
    
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncToCloud();
      } catch (error) {
        this.logSync('⚠️', `Periodic sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, StatsTracker.SYNC_INTERVAL);

    this.logSync('⏰', `Started sync timer (${StatsTracker.SYNC_INTERVAL / 1000}s interval)`);
  }

  /**
   * Stop sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.logSync('⏹️', 'Stopped sync timer');
    }
  }

  /**
   * Notify all listeners of stats update
   */
  private notifyListeners(): void {
    if (!this.stats) return;
    
    const stats = this.getStats();
    this.updateListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('❌ [StatsTracker] Listener error:', error);
      }
    });
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * Create initial stats object
   */
  private createInitialStats(): UserStatsV2 {
    return {
      userId: this.currentUser?.uid || '',
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: '',  // Empty string initially - will be set on first activity
      firstActiveDate: '', // Empty string initially - will be set on first activity
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
      // New fields
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
      version: StatsTracker.VERSION
    };
  }

  /**
   * Create empty daily activity
   */
  private createDailyActivity(date: string): DailyActivity {
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
   * Ensure all fields are defined in a daily activity object
   * This fixes issues with older activities missing new fields
   */
  private sanitizeDailyActivity(activity: any): DailyActivity {
    // Remove any 'id' field that might have been added by storage
    const { id, ...activityWithoutId } = activity;
    // Sanitize individual activity events to ensure no undefined values
    const sanitizedActivities = (activityWithoutId.activities || []).map((event: any) => {
      // Build details object with only defined values
      const cleanDetails: any = {};
      
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
      
      const sanitizedEvent: ActivityEvent = {
        id: event.id || '',
        type: event.type || 'practice' as ActivityType,
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
   * Sync Pokemon count from existing data with improved error handling
   */
  private async syncPokemonCount(): Promise<void> {
    if (!this.currentUser || !this.stats) return;

    try {
      // Always sync Pokemon count from Firebase (not just when it's 0)
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const pokedex = userData?.pokedex;
        if (pokedex && pokedex.caught && Array.isArray(pokedex.caught)) {
          const actualCount = pokedex.caught.length;
          // Update if count has changed
          if (actualCount !== this.stats.pokemonCaught) {
            this.logSync('🐈', `Updating Pokemon count: ${this.stats.pokemonCaught} → ${actualCount}`);
            this.stats.pokemonCaught = actualCount;
            this.stats.caughtPokemonSet = [...pokedex.caught]; // Sync the actual Pokemon IDs too
            await this.saveToIndexedDB();
            this.notifyListeners();
          }
        }
      } else {
        this.logSync('⚠️', 'User document does not exist for Pokemon sync');
      }
    } catch (error) {
      this.logSync('⚠️', `Pokemon count sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ [StatsTracker] Error syncing Pokemon count:', error);
      // Don't throw - this is not critical functionality
    }
  }

  /**
   * Force refresh Pokemon count (public method)
   */
  async refreshPokemonCount(): Promise<void> {
    await this.syncPokemonCount();
  }

  /**
   * Get recent activities (for debugging)
   */
  async getRecentActivities(limit: number = 100): Promise<ActivityEvent[]> {
    const allActivities: ActivityEvent[] = [];
    
    // Collect activities from the last 30 days
    const activities = Array.from(this.activities.values())
      .sort((a, b) => b.date.localeCompare(a.date));
    
    for (const daily of activities) {
      allActivities.push(...daily.activities);
      if (allActivities.length >= limit) break;
    }
    
    // Sort by timestamp descending and limit
    return allActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get activities data for StatsBar display with error resilience
   */
  async getActivitiesData(): Promise<{
    today: DailyActivity | null;
    week: DailyActivity[];
    month: DailyActivity[];
  }> {
    const today = this.getDateString(Date.now());
    const weekAgo = this.getDateString(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Ensure we have recent activities loaded
      await this.loadActivitiesRange(monthAgo, today);
    } catch (error) {
      this.logSync('⚠️', `Failed to load activities range: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue with whatever data we have
    }
    
    // Get today's activity
    const todayActivity = this.activities.get(today) || null;
    
    // Get last 7 days
    const weekActivities: DailyActivity[] = [];
    try {
      const weekStart = new Date(weekAgo);
      const todayDate = new Date(today);
      
      for (let d = new Date(weekStart); d <= todayDate; d.setDate(d.getDate() + 1)) {
        const dateStr = this.getDateString(d.getTime());
        const activity = this.activities.get(dateStr);
        if (activity) {
          weekActivities.push(activity);
        }
      }
    } catch (error) {
      this.logSync('⚠️', `Failed to build week activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Get last 30 days
    const monthActivities: DailyActivity[] = [];
    try {
      const monthStart = new Date(monthAgo);
      const todayDate = new Date(today);
      
      for (let d = new Date(monthStart); d <= todayDate; d.setDate(d.getDate() + 1)) {
        const dateStr = this.getDateString(d.getTime());
        const activity = this.activities.get(dateStr);
        if (activity) {
          monthActivities.push(activity);
        }
      }
    } catch (error) {
      this.logSync('⚠️', `Failed to build month activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      today: todayActivity,
      week: weekActivities,
      month: monthActivities
    };
  }

  /**
   * Manually recalculate and fix streak (for debugging)
   * This is a public method that can be called from browser console
   */
  async recalculateStreak(): Promise<{ success: boolean; message: string; stats: any }> {
    try {

      const before = {
        currentStreak: this.stats?.currentStreak || 0,
        longestStreak: this.stats?.longestStreak || 0,
        totalDaysActive: this.stats?.totalDaysActive || 0,
        lastActiveDate: this.stats?.lastActiveDate || 'unknown'
      };
      
      await this.validateAndFixStreak();
      
      const after = {
        currentStreak: this.stats?.currentStreak || 0,
        longestStreak: this.stats?.longestStreak || 0,
        totalDaysActive: this.stats?.totalDaysActive || 0,
        lastActiveDate: this.stats?.lastActiveDate || 'unknown'
      };
      
      // Save the corrected stats
      if (this.stats) {
        await this.saveToIndexedDB();
        if (this.currentUser && hasPaidPlan(this.subscription)) {
          await this.saveToCloud();
        }
        this.notifyListeners();
      }
      
      return {
        success: true,
        message: 'Streak recalculated successfully',
        stats: { before, after }
      };
    } catch (error) {
      console.error('❌ [StatsTracker] Error recalculating streak:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        stats: null
      };
    }
  }

  /**
   * Reset all stats (for debugging)
   */
  async resetStats(): Promise<void> {

    this.stats = this.createInitialStats();
    this.activities.clear();
    this.pendingActivities = [];
    
    await this.saveToIndexedDB();
    
    if (this.currentUser && hasPaidPlan(this.subscription)) {
      await this.saveToCloud();
    }
    
    this.notifyListeners();
  }

  /**
   * Recalculate totals from daily activities
   * This ensures stats match the actual activities stored
   */
  private async recalculateTotalsFromDailyActivities(): Promise<void> {
    if (!this.stats) return;

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
    
    // Sum up all activities from daily records
    for (const [date, daily] of this.activities) {
      totalActivities += daily.summary.totalActivities;
      drillsCompleted += daily.summary.drillsCompleted;
      storiesRead += daily.summary.storiesRead;
      articlesRead += daily.summary.articlesRead;
      kanjiStudySessions += daily.summary.kanjiStudied;
      gamesPlayed += daily.summary.gamesPlayed;
      vocabStudied += daily.summary.vocabStudied;
      flashcardsReviewed += daily.summary.flashcardsReviewed;
      practiceSessionsCompleted += daily.summary.practiceSessionsCompleted;
    }
    
    // Update stats if different
    const hasChanges = 
      this.stats.totalActivities !== totalActivities ||
      this.stats.drillsCompleted !== drillsCompleted ||
      this.stats.storiesRead !== storiesRead ||
      this.stats.articlesRead !== articlesRead ||
      this.stats.kanjiStudySessions !== kanjiStudySessions ||
      this.stats.gamesPlayed !== gamesPlayed ||
      this.stats.vocabStudied !== vocabStudied ||
      this.stats.flashcardsReviewed !== flashcardsReviewed ||
      this.stats.practiceSessionsCompleted !== practiceSessionsCompleted;
    
    if (hasChanges) {

      this.stats.totalActivities = totalActivities;
      this.stats.drillsCompleted = drillsCompleted;
      this.stats.storiesRead = storiesRead;
      this.stats.articlesRead = articlesRead;
      this.stats.kanjiStudySessions = kanjiStudySessions;
      this.stats.gamesPlayed = gamesPlayed;
      this.stats.vocabStudied = vocabStudied;
      this.stats.flashcardsReviewed = flashcardsReviewed;
      this.stats.practiceSessionsCompleted = practiceSessionsCompleted;
      
      // Save updated stats
      await this.saveToIndexedDB();
      this.notifyListeners();
    }
  }

  /**
   * Recalculate totalActivities from existing activity counts
   * Useful for fixing stats that have incorrect totalActivities
   */
  async recalculateTotalActivities(): Promise<{ before: number, after: number }> {
    if (!this.stats) {
      throw new Error('Stats not initialized');
    }

    const before = this.stats.totalActivities;
    
    // Calculate total from all activity types
    const calculatedTotal = 
      this.stats.drillsCompleted +
      this.stats.storiesRead +
      this.stats.articlesRead +
      this.stats.kanjiStudySessions +
      this.stats.gamesPlayed +
      this.stats.vocabStudied +
      this.stats.flashcardsReviewed +
      this.stats.practiceSessionsCompleted;

    // Update if different
    if (this.stats.totalActivities !== calculatedTotal) {
      this.stats.totalActivities = calculatedTotal;
      this.stats.lastUpdated = Date.now();
      
      // Save to storage
      await this.saveToIndexedDB();
      if (this.currentUser && hasPaidPlan(this.subscription)) {
        await this.saveToCloud();
      }
      
      // Notify listeners
      this.notifyListeners();
    }
    
    return { before, after: calculatedTotal };
  }

}

// Export singleton instance
export const statsTracker = StatsTracker.getInstance();