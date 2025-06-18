import { User } from 'firebase/auth';
import CloudSync from './cloudSync';

export interface UserStats {
  drillsCompleted: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  firstUseDate: string;
  totalDaysUsed: number;
  updatedAt?: any; // For cloud sync timestamp
}

interface DrillSession {
  date: string;
  questionsAnswered: number;
  correctAnswers: number;
  wordsStudied: string[];
  updatedAt?: any; // For cloud sync timestamp
}

const STATS_KEY = 'doshi_sensei_user_stats';
const SESSIONS_KEY = 'doshi_sensei_drill_sessions';

// Cloud sync collection names
const STATS_COLLECTION = 'stats';
const SESSIONS_COLLECTION = 'sessions';
const STATS_DOC_ID = 'user_stats';

export class StatsManager {
  private static currentUser: User | null = null;
  private static hasCloudSync: boolean = false;

  /**
   * Initialize with user context for cloud sync
   */
  static setUser(user: User | null, canSync: boolean = false): void {
    console.log('🔧 StatsManager.setUser called:', {
      userEmail: user?.email,
      userUID: user?.uid,
      canSync: canSync,
      timestamp: new Date().toISOString()
    });
    this.currentUser = user;
    this.hasCloudSync = canSync;
  }

  /**
   * Get current user statistics with cloud sync
   */
  static async getUserStats(): Promise<UserStats> {
    console.log('🔍 getUserStats called:', {
      hasUser: !!this.currentUser,
      userEmail: this.currentUser?.email,
      userUID: this.currentUser?.uid,
      hasCloudSync: this.hasCloudSync,
      timestamp: new Date().toISOString()
    });

    try {
      // Always load local stats first for immediate response
      const localStats = this.getLocalStats();

      // If user is logged in and has cloud sync, try to sync in background
      if (this.currentUser && this.hasCloudSync) {
        console.log('☁️ Starting background cloud sync for user:', this.currentUser.email);

        // Don't wait for cloud sync - do it in background
        this.backgroundCloudSync(localStats).catch((error: Error) => {
          console.error('❌ Background cloud sync failed:', error);
        });
      } else if (this.currentUser && !this.hasCloudSync) {
        console.log('⚠️ User logged in but no cloud sync available');
      }

      // Return local stats immediately or create initial stats
      if (localStats) {
        console.log('📊 Loaded local stats:', localStats);
        return localStats;
      } else {
        const initialStats = this.createInitialStats();
        console.log('🆕 Created initial stats:', initialStats);
        return initialStats;
      }
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
      return this.createInitialStats();
    }
  }

  /**
   * Load stats from Firebase cloud
   */
  private static async loadStatsFromCloud(): Promise<UserStats | null> {
    if (!this.currentUser || !this.hasCloudSync) return null;

    try {
      const { data } = await CloudSync.downloadData<UserStats>(
        this.currentUser,
        STATS_COLLECTION,
        STATS_DOC_ID
      );

      if (data) {
        console.log('📊 Loaded stats from cloud:', data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading stats from cloud:', error);
      return null;
    }
  }

  /**
   * Save stats to both local and cloud
   */
  private static async saveStats(stats: UserStats): Promise<void> {
    try {
      // Save locally first
      await this.saveStatsLocally(stats);

      // Save to cloud if user is logged in and has sync
      if (this.currentUser && this.hasCloudSync) {
        await this.saveStatsToCloud(stats);
      }
    } catch (error) {
      console.error('Error saving stats:', error);
      throw error;
    }
  }

  /**
   * Save stats to localStorage only
   */
  private static async saveStatsLocally(stats: UserStats): Promise<void> {
    try {
      const statsWithTimestamp = {
        ...stats,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(statsWithTimestamp));
    } catch (error) {
      console.error('Error saving stats locally:', error);
      throw error;
    }
  }

  /**
   * Save stats to Firebase cloud
   */
  private static async saveStatsToCloud(stats: UserStats): Promise<void> {
    if (!this.currentUser || !this.hasCloudSync) return;

    try {
      const result = await CloudSync.uploadData(
        this.currentUser,
        STATS_COLLECTION,
        STATS_DOC_ID,
        stats
      );

      if (result.success) {
        console.log('📊 Stats synced to cloud successfully');
      } else {
        console.error('Failed to sync stats to cloud:', result.error);
      }
    } catch (error) {
      console.error('Error saving stats to cloud:', error);
    }
  }

  /**
   * Sync local and cloud data (resolve conflicts)
   */
  static async syncStats(): Promise<{ success: boolean; message: string }> {
    if (!this.currentUser || !this.hasCloudSync) {
      return { success: false, message: 'No cloud sync available' };
    }

    try {
      const localStats = this.getLocalStats();
      const cloudStats = await this.loadStatsFromCloud();

      if (!localStats && !cloudStats) {
        return { success: true, message: 'No data to sync' };
      }

      if (!cloudStats) {
        // No cloud data, upload local
        if (localStats) {
          await this.saveStatsToCloud(localStats);
          return { success: true, message: 'Local data uploaded to cloud' };
        }
      } else if (!localStats) {
        // No local data, download cloud
        await this.saveStatsLocally(cloudStats);
        return { success: true, message: 'Cloud data downloaded locally' };
      } else {
        // Both exist, resolve conflict
        const resolution = CloudSync.resolveConflict(localStats, cloudStats);

        if (resolution === 'cloud') {
          await this.saveStatsLocally(cloudStats);
          return { success: true, message: 'Cloud data was newer, updated locally' };
        } else if (resolution === 'local') {
          await this.saveStatsToCloud(localStats);
          return { success: true, message: 'Local data was newer, uploaded to cloud' };
        } else {
          // Merge data (take the higher values for cumulative stats)
          const mergedStats: UserStats = {
            drillsCompleted: Math.max(localStats.drillsCompleted, cloudStats.drillsCompleted),
            totalQuestions: Math.max(localStats.totalQuestions, cloudStats.totalQuestions),
            correctAnswers: Math.max(localStats.correctAnswers, cloudStats.correctAnswers),
            accuracy: Math.max(localStats.accuracy, cloudStats.accuracy),
            currentStreak: Math.max(localStats.currentStreak, cloudStats.currentStreak),
            longestStreak: Math.max(localStats.longestStreak, cloudStats.longestStreak),
            lastActiveDate: localStats.lastActiveDate > cloudStats.lastActiveDate ? localStats.lastActiveDate : cloudStats.lastActiveDate,
            firstUseDate: localStats.firstUseDate < cloudStats.firstUseDate ? localStats.firstUseDate : cloudStats.firstUseDate,
            totalDaysUsed: Math.max(localStats.totalDaysUsed, cloudStats.totalDaysUsed),
            updatedAt: new Date().toISOString()
          };

          await this.saveStats(mergedStats);
          return { success: true, message: 'Data merged successfully' };
        }
      }

      return { success: true, message: 'Sync completed' };
    } catch (error) {
      console.error('Error syncing stats:', error);
      return { success: false, message: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error') };
    }
  }

  /**
   * Background cloud sync with timeout and error handling
   * Does not block app loading
   */
  private static async backgroundCloudSync(localStats: UserStats | null): Promise<void> {
    if (!this.currentUser || !this.hasCloudSync) {
      return;
    }

    const SYNC_TIMEOUT = 10000; // 10 seconds timeout

    try {
      console.log('🔄 Starting background cloud sync...');

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Cloud sync timeout')), SYNC_TIMEOUT);
      });

      // Race between cloud sync and timeout
      const cloudStats = await Promise.race([
        this.loadStatsFromCloudWithRetry(),
        timeoutPromise
      ]);

      if (cloudStats && localStats) {
        // Compare and merge if needed
        const resolution = CloudSync.resolveConflict(localStats, cloudStats);

        if (resolution === 'cloud') {
          // Cloud data is newer, update local
          await this.saveStatsLocally(cloudStats);
          console.log('📥 Updated local stats from cloud (background sync)');
        } else if (resolution === 'local') {
          // Local data is newer, upload to cloud
          await this.saveStatsToCloudWithRetry(localStats);
          console.log('📤 Uploaded local stats to cloud (background sync)');
        }
      } else if (cloudStats && !localStats) {
        // No local data, save cloud data locally
        await this.saveStatsLocally(cloudStats);
        console.log('📥 Saved cloud stats locally (background sync)');
      } else if (localStats && !cloudStats) {
        // No cloud data, upload local data
        await this.saveStatsToCloudWithRetry(localStats);
        console.log('📤 Uploaded local stats to cloud (background sync)');
      }

      console.log('✅ Background cloud sync completed successfully');
    } catch (error) {
      console.error('❌ Background cloud sync failed:', error);
      // Don't throw - this is background sync, app should continue normally
    }
  }

  /**
   * Load stats from cloud with retry mechanism
   */
  private static async loadStatsFromCloudWithRetry(maxRetries: number = 2): Promise<UserStats | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Cloud sync attempt ${attempt}/${maxRetries}`);
        return await this.loadStatsFromCloud();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Cloud sync attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All cloud sync attempts failed');
  }

  /**
   * Save stats to cloud with retry mechanism
   */
  private static async saveStatsToCloudWithRetry(stats: UserStats, maxRetries: number = 2): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Cloud upload attempt ${attempt}/${maxRetries}`);
        await this.saveStatsToCloud(stats);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Cloud upload attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All cloud upload attempts failed');
  }

  /**
   * Get local stats without cloud sync
   */
  private static getLocalStats(): UserStats | null {
    try {
      const statsData = localStorage.getItem(STATS_KEY);
      if (!statsData) return null;
      return JSON.parse(statsData) as UserStats;
    } catch (error) {
      console.error('Error loading local stats:', error);
      return null;
    }
  }

  /**
   * Record a completed drill session
   */
  static async recordDrillSession(questionsAnswered: number, correctAnswers: number, wordsStudied: string[]): Promise<void> {
    try {
      const stats = await this.getUserStats();
      const today = new Date().toDateString();

      // Update drill statistics
      stats.drillsCompleted += 1;
      stats.totalQuestions += questionsAnswered;
      stats.correctAnswers += correctAnswers;
      stats.accuracy = stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;

      // Update usage tracking and streak
      await this.updateDailyUsageAndStreak(stats, today);

      await this.saveStats(stats);

      // Record session details
      await this.recordSession({
        date: today,
        questionsAnswered,
        correctAnswers,
        wordsStudied
      });

    } catch (error) {
      console.error('Error recording drill session:', error);
    }
  }

  /**
   * Record studying a word (from practice/vocabulary pages)
   */
  static async recordWordStudied(wordId: string): Promise<void> {
    try {
      const stats = await this.getUserStats();
      const today = new Date().toDateString();

      // Update usage tracking and streak
      await this.updateDailyUsageAndStreak(stats, today);

      await this.saveStats(stats);
    } catch (error) {
      console.error('Error recording word studied:', error);
    }
  }

  /**
   * Get detailed drill history
   */
  static async getDrillHistory(): Promise<DrillSession[]> {
    try {
      const sessionsData = localStorage.getItem(SESSIONS_KEY);
      if (!sessionsData) return [];

      return JSON.parse(sessionsData) as DrillSession[];
    } catch (error) {
      console.error('Error loading drill history:', error);
      return [];
    }
  }

  /**
   * Get statistics for a specific time period
   */
  static async getStatsForPeriod(days: number): Promise<{
    drillsCompleted: number;
    questionsAnswered: number;
    accuracy: number;
    wordsStudied: number;
  }> {
    try {
      const sessions = await this.getDrillHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentSessions = sessions.filter(session =>
        new Date(session.date) >= cutoffDate
      );

      const totalQuestions = recentSessions.reduce((sum, s) => sum + s.questionsAnswered, 0);
      const totalCorrect = recentSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
      const allWordsStudied = new Set<string>();

      recentSessions.forEach(session =>
        session.wordsStudied.forEach(word => allWordsStudied.add(word))
      );

      return {
        drillsCompleted: recentSessions.length,
        questionsAnswered: totalQuestions,
        accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
        wordsStudied: allWordsStudied.size
      };
    } catch (error) {
      console.error('Error getting period stats:', error);
      return { drillsCompleted: 0, questionsAnswered: 0, accuracy: 0, wordsStudied: 0 };
    }
  }

  /**
   * Reset all statistics
   */
  static async resetStats(): Promise<void> {
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem(SESSIONS_KEY);
  }

  /**
   * Export statistics as JSON
   */
  static async exportStats(): Promise<string> {
    const stats = await this.getUserStats();
    const sessions = await this.getDrillHistory();

    return JSON.stringify({
      stats,
      sessions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Clear service worker cache to fix sync issues
   */
  static async clearServiceWorkerCache(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();

        for (const registration of registrations) {
          if (registration.active) {
            // Send message to service worker to clear cache
            const messageChannel = new MessageChannel();
            registration.active.postMessage(
              { type: 'CLEAR_CACHE' },
              [messageChannel.port2]
            );

            await new Promise((resolve) => {
              messageChannel.port1.onmessage = resolve;
            });
          }
        }

        // Also clear browser caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
        }

        console.log('🧹 Service worker and browser caches cleared');
      }
    } catch (error) {
      console.error('Error clearing service worker cache:', error);
    }
  }

  /**
   * Private: Create initial statistics object
   */
  private static createInitialStats(): UserStats {
    const today = new Date().toDateString();

    return {
      drillsCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: today,
      firstUseDate: today,
      totalDaysUsed: 1
    };
  }

  /**
   * Private: Update daily usage and streak calculation
   * Only called when user actually performs an activity (drill, study word)
   */
  private static async updateDailyUsageAndStreak(stats: UserStats, today: string): Promise<void> {
    const lastActiveDate = stats.lastActiveDate;

    // If it's the same day, no changes needed
    if (lastActiveDate === today) {
      return;
    }

    // Use more reliable date comparison (normalize to YYYY-MM-DD format)
    const normalizeDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    const normalizedLastActive = normalizeDate(lastActiveDate);
    const normalizedToday = normalizeDate(today);

    // Calculate days difference using normalized dates
    const lastActiveDate_obj = new Date(normalizedLastActive + 'T00:00:00.000Z');
    const todayDate_obj = new Date(normalizedToday + 'T00:00:00.000Z');
    const diffTime = todayDate_obj.getTime() - lastActiveDate_obj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    console.log('📅 Updating daily usage and streak:', {
      lastActiveDate: normalizedLastActive,
      today: normalizedToday,
      diffDays,
      currentStreak: stats.currentStreak
    });

    // Update last active date
    stats.lastActiveDate = today;

    // Only increment totalDaysUsed for actual new days (not same day activities)
    if (diffDays > 0) {
      stats.totalDaysUsed += 1;
    }

    // Handle streak logic with improved date handling
    if (diffDays === 1) {
      // Consecutive day - increment streak
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      console.log('🔥 Consecutive day! Streak incremented to:', stats.currentStreak);
    } else if (diffDays > 1) {
      // Streak broken - reset to 1 (today counts as new streak start)
      stats.currentStreak = 1;
      console.log('💔 Streak broken after', diffDays, 'days. Reset to 1');
    } else if (diffDays === 0) {
      // Same day - maintain current streak
      console.log('📅 Same day activity - no streak change');
    } else {
      // Negative difference (clock moved backwards) - maintain streak but don't increment
      console.log('⚠️ Date moved backwards:', diffDays, '. Maintaining current streak');
    }

    console.log('📊 Final streak values:', {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalDaysUsed: stats.totalDaysUsed
    });
  }

  /**
   * Private: Record a drill session
   */
  private static async recordSession(session: DrillSession): Promise<void> {
    try {
      const sessions = await this.getDrillHistory();

      // Check if we already have a session for today
      const existingIndex = sessions.findIndex(s => s.date === session.date);

      if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex].questionsAnswered += session.questionsAnswered;
        sessions[existingIndex].correctAnswers += session.correctAnswers;
        sessions[existingIndex].wordsStudied = [
          ...new Set([...sessions[existingIndex].wordsStudied, ...session.wordsStudied])
        ];
      } else {
        // Add new session
        sessions.push(session);
      }

      // Keep only last 90 days of sessions
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const recentSessions = sessions.filter(s => new Date(s.date) >= cutoffDate);

      localStorage.setItem(SESSIONS_KEY, JSON.stringify(recentSessions));
    } catch (error) {
      console.error('Error recording session:', error);
      throw error;
    }
  }
}

export default StatsManager;
