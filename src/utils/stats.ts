import { User } from 'firebase/auth';
import CloudSync from './cloudSync';
import { safeNavigator } from './browserCheck';
import { StatsDebugger } from './debugHelpers';

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
  // Kanji study stats
  kanjiStudySessions: number;
  kanjiStudyQuestions: number;
  kanjiCorrectAnswers: number;
  kanjiAccuracy: number;
  totalKanjiLearned: number;
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
    const debugTimestamp = new Date().toISOString();
    console.log(`👤 [${debugTimestamp}] setUser() called`);

    this.currentUser = user;
    this.hasCloudSync = canSync;

  }

  /**
   * Get current user statistics with cloud sync
   */
  static async getUserStats(): Promise<UserStats> {
    const debugTimestamp = new Date().toISOString();
    console.log(`🔍 [${debugTimestamp}] getUserStats() called`);

    try {
      // Always load local stats first for immediate response
      const localStats = this.getLocalStats();

      if (localStats) {
        console.log(`🔍 [${debugTimestamp}] Local stats data:`, JSON.stringify(localStats, null, 2));
      }

      // If user is logged in and has cloud sync, try to sync in background
      if (this.currentUser && this.hasCloudSync) {

        // Don't wait for cloud sync - do it in background
        this.backgroundCloudSync(localStats).catch((error: Error) => {
          console.error(`❌ [${debugTimestamp}] Background cloud sync failed:`, error);
        });
      } else if (this.currentUser && !this.hasCloudSync) {

      } else {

      }

      // Return local stats immediately or create initial stats
      if (localStats) {

        return localStats;
      } else {

        const initialStats = this.createInitialStats();
        console.log(`🔍 [${debugTimestamp}] Initial stats created:`, JSON.stringify(initialStats, null, 2));
        return initialStats;
      }
    } catch (error) {
      console.error(`❌ [${debugTimestamp}] Error loading user stats:`, error);
      const fallbackStats = this.createInitialStats();
      console.log(`🔍 [${debugTimestamp}] Returning fallback stats:`, JSON.stringify(fallbackStats, null, 2));
      return fallbackStats;
    }
  }

  /**
   * Load stats from Firebase cloud
   */
  private static async loadStatsFromCloud(): Promise<UserStats | null> {
    const debugTimestamp = new Date().toISOString();
    console.log(`☁️ [${debugTimestamp}] loadStatsFromCloud() called`);
    
    if (!this.currentUser || !this.hasCloudSync) {

      return null;
    }

    try {

      const { data } = await CloudSync.downloadData<UserStats>(
        this.currentUser,
        STATS_COLLECTION,
        STATS_DOC_ID
      );

      if (data) {
        console.log(`☁️ [${debugTimestamp}] Cloud stats loaded:`, JSON.stringify(data, null, 2));
        StatsDebugger.logEvent('cloud-stats-loaded', 'StatsManager', data);
        return data;
      }

      StatsDebugger.logEvent('cloud-stats-empty', 'StatsManager');
      return null;
    } catch (error) {
      console.error(`☁️ [${debugTimestamp}] Error loading stats from cloud:`, error);
      StatsDebugger.logEvent('cloud-stats-error', 'StatsManager', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Save stats to both local and cloud
   */
  private static async saveStats(stats: UserStats): Promise<void> {
    const debugTimestamp = new Date().toISOString();
    console.log(`💾 [${debugTimestamp}] saveStats() called`);
    console.log(`💾 [${debugTimestamp}] Stats to save:`, JSON.stringify(stats, null, 2));
    
    try {
      // Save locally first

      await this.saveStatsLocally(stats);

      // Save to cloud if user is logged in and has sync
      if (this.currentUser && this.hasCloudSync) {

        await this.saveStatsToCloud(stats);

      } else {
        console.log(`💾 [${debugTimestamp}] Skipping cloud save (no user or sync)`);
      }
    } catch (error) {
      console.error(`💾 [${debugTimestamp}] Error saving stats:`, error);
      throw error;
    }
  }

  /**
   * Save stats to localStorage only
   */
  private static async saveStatsLocally(stats: UserStats): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        return; // Skip on server-side
      }
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
          // Merge data with intelligent streak handling
          const mergedStats: UserStats = {
            drillsCompleted: Math.max(localStats.drillsCompleted, cloudStats.drillsCompleted),
            totalQuestions: Math.max(localStats.totalQuestions, cloudStats.totalQuestions),
            correctAnswers: Math.max(localStats.correctAnswers, cloudStats.correctAnswers),
            accuracy: Math.max(localStats.accuracy, cloudStats.accuracy),
            // Intelligent streak merging: prefer the one with more recent activity
            currentStreak: this.mergeStreaksIntelligently(localStats, cloudStats),
            longestStreak: Math.max(localStats.longestStreak, cloudStats.longestStreak),
            lastActiveDate: localStats.lastActiveDate > cloudStats.lastActiveDate ? localStats.lastActiveDate : cloudStats.lastActiveDate,
            firstUseDate: localStats.firstUseDate < cloudStats.firstUseDate ? localStats.firstUseDate : cloudStats.firstUseDate,
            totalDaysUsed: Math.max(localStats.totalDaysUsed, cloudStats.totalDaysUsed),
            kanjiStudySessions: Math.max(localStats.kanjiStudySessions || 0, cloudStats.kanjiStudySessions || 0),
            kanjiStudyQuestions: Math.max(localStats.kanjiStudyQuestions || 0, cloudStats.kanjiStudyQuestions || 0),
            kanjiCorrectAnswers: Math.max(localStats.kanjiCorrectAnswers || 0, cloudStats.kanjiCorrectAnswers || 0),
            kanjiAccuracy: Math.max(localStats.kanjiAccuracy || 0, cloudStats.kanjiAccuracy || 0),
            totalKanjiLearned: Math.max(localStats.totalKanjiLearned || 0, cloudStats.totalKanjiLearned || 0),
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
    const debugTimestamp = new Date().toISOString();
    console.log(`🔄 [${debugTimestamp}] backgroundCloudSync() started`);
    
    if (!this.currentUser || !this.hasCloudSync) {

      return;
    }

    const SYNC_TIMEOUT = 10000; // 10 seconds timeout

    try {

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Cloud sync timeout')), SYNC_TIMEOUT);
      });

      // Race between cloud sync and timeout
      console.log(`🔄 [${debugTimestamp}] Starting cloud load race (timeout: ${SYNC_TIMEOUT}ms)`);
      const cloudStats = await Promise.race([
        this.loadStatsFromCloudWithRetry(),
        timeoutPromise
      ]);

      if (cloudStats) {
        console.log(`🔄 [${debugTimestamp}] Cloud stats data:`, JSON.stringify(cloudStats, null, 2));
      }

      if (cloudStats && localStats) {
        // Compare and merge if needed

        const resolution = CloudSync.resolveConflict(localStats, cloudStats);

        if (resolution === 'cloud') {
          // Cloud data is newer, update local

          await this.saveStatsLocally(cloudStats);

        } else if (resolution === 'local') {
          // Local data is newer, upload to cloud

          await this.saveStatsToCloudWithRetry(localStats);

        } else {
          console.log(`🔄 [${debugTimestamp}] Data requires merging (not implemented in background sync)`);
        }
      } else if (cloudStats && !localStats) {
        // No local data, save cloud data locally

        await this.saveStatsLocally(cloudStats);

      } else if (localStats && !cloudStats) {
        // No cloud data, upload local data

        await this.saveStatsToCloudWithRetry(localStats);

      } else {

      }

    } catch (error) {
      console.error(`❌ [${debugTimestamp}] Background cloud sync failed:`, error);
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
        return await this.loadStatsFromCloud();
      } catch (error) {
        lastError = error as Error;

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
        await this.saveStatsToCloud(stats);
        return; // Success
      } catch (error) {
        lastError = error as Error;

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
    const debugTimestamp = new Date().toISOString();
    console.log(`📱 [${debugTimestamp}] getLocalStats() called`);
    
    try {
      if (typeof window === 'undefined') {

        return null; // No localStorage on server
      }
      
      const statsData = localStorage.getItem(STATS_KEY);

      if (!statsData) {

        return null;
      }
      
      const parsedStats = JSON.parse(statsData) as UserStats;
      console.log(`📱 [${debugTimestamp}] Parsed local stats:`, JSON.stringify(parsedStats, null, 2));
      return parsedStats;
    } catch (error) {
      console.error(`📱 [${debugTimestamp}] Error loading local stats:`, error);
      return null;
    }
  }

  /**
   * Record a completed drill session
   */
  static async recordDrillSession(questionsAnswered: number, correctAnswers: number, wordsStudied: string[]): Promise<void> {
    try {
      const stats = await this.getUserStats();
      const today = new Date().toISOString().split('T')[0]; // Use ISO format consistently

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
  static async recordWordStudied(_wordId: string): Promise<void> {
    try {
      const stats = await this.getUserStats();
      const today = new Date().toISOString().split('T')[0]; // Use ISO format consistently

      // Update usage tracking and streak
      await this.updateDailyUsageAndStreak(stats, today);

      await this.saveStats(stats);
    } catch (error) {
      console.error('Error recording word studied:', error);
    }
  }

  /**
   * Record a kanji study session
   */
  static async recordKanjiStudySession(questionsAnswered: number, correctAnswers: number, kanjiLearned: number = 0): Promise<void> {
    try {
      const stats = await this.getUserStats();
      const today = new Date().toISOString().split('T')[0]; // Use ISO format consistently

      // Update kanji study statistics
      stats.kanjiStudySessions += 1;
      stats.kanjiStudyQuestions += questionsAnswered;
      stats.kanjiCorrectAnswers += correctAnswers;
      stats.kanjiAccuracy = stats.kanjiStudyQuestions > 0
        ? Math.round((stats.kanjiCorrectAnswers / stats.kanjiStudyQuestions) * 100)
        : 0;

      // Update total kanji learned (if any new kanji were marked as learned)
      if (kanjiLearned > 0) {
        stats.totalKanjiLearned += kanjiLearned;
      }

      // Update usage tracking and streak
      await this.updateDailyUsageAndStreak(stats, today);

      await this.saveStats(stats);

    } catch (error) {
      console.error('Error recording kanji study session:', error);
    }
  }

  /**
   * Get detailed drill history
   */
  static async getDrillHistory(): Promise<DrillSession[]> {
    try {
      if (typeof window === 'undefined') {
        return []; // No localStorage on server
      }
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
    if (typeof window === 'undefined') {
      return; // No localStorage on server
    }
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
   * Recalculate streak from actual activity data (for debugging/fixing)
   */
  static async recalculateStreak(): Promise<{ success: boolean; oldStreak: number; newStreak: number; message: string }> {
    try {
      const stats = await this.getUserStats();
      const sessions = await this.getDrillHistory();

      if (sessions.length === 0) {
        return { success: false, oldStreak: stats.currentStreak, newStreak: 0, message: 'No activity data found' };
      }

      // Group sessions by date
      const sessionsByDate = new Map<string, number>();
      sessions.forEach(session => {
        const normalizedDate = new Date(session.date).toISOString().split('T')[0];
        sessionsByDate.set(normalizedDate, (sessionsByDate.get(normalizedDate) || 0) + 1);
      });

      // Calculate actual streak by counting backwards from today
      let actualStreak = 0;
      const today = new Date();

      for (let i = 0; i < 365; i++) { // Check up to 1 year back
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const normalizedCheckDate = checkDate.toISOString().split('T')[0];

        if (sessionsByDate.has(normalizedCheckDate)) {
          actualStreak++;
        } else {
          break; // Streak broken
        }
      }

      const oldStreak = stats.currentStreak;

      if (actualStreak !== oldStreak) {
        stats.currentStreak = actualStreak;
        stats.longestStreak = Math.max(stats.longestStreak, actualStreak);
        await this.saveStats(stats);

        return {
          success: true,
          oldStreak,
          newStreak: actualStreak,
          message: `Streak corrected from ${oldStreak} to ${actualStreak} based on actual activity`
        };
      } else {
        return {
          success: true,
          oldStreak,
          newStreak: actualStreak,
          message: 'Streak is already correct'
        };
      }
    } catch (error) {
      console.error('Error recalculating streak:', error);
      return {
        success: false,
        oldStreak: 0,
        newStreak: 0,
        message: 'Error recalculating streak: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Clear service worker cache to fix sync issues
   */
  static async clearServiceWorkerCache(): Promise<void> {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (safeNavigator && 'serviceWorker' in safeNavigator) {
        const registrations = await safeNavigator.serviceWorker.getRegistrations();

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
      totalDaysUsed: 1,
      // Kanji study stats
      kanjiStudySessions: 0,
      kanjiStudyQuestions: 0,
      kanjiCorrectAnswers: 0,
      kanjiAccuracy: 0,
      totalKanjiLearned: 0
    };
  }

  /**
   * Private: Update daily usage and streak calculation
   * Only called when user actually performs an activity (drill, study word)
   */
  private static async updateDailyUsageAndStreak(stats: UserStats, today: string): Promise<void> {
    const lastActiveDate = stats.lastActiveDate;

    // Normalize both dates to ISO format for consistent comparison
    const normalizeDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    const normalizedLastActive = normalizeDate(lastActiveDate);
    const normalizedToday = normalizeDate(today);

    // If it's the same day, no changes needed
    if (normalizedLastActive === normalizedToday) {
      return;
    }

    // Calculate days difference using normalized dates
    const lastActiveDate_obj = new Date(normalizedLastActive + 'T00:00:00.000Z');
    const todayDate_obj = new Date(normalizedToday + 'T00:00:00.000Z');
    const diffTime = todayDate_obj.getTime() - lastActiveDate_obj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Update last active date to normalized format
    stats.lastActiveDate = normalizedToday;

    // Only increment totalDaysUsed for actual new days (not same day activities)
    if (diffDays > 0) {
      stats.totalDaysUsed += 1;
    }

    // Handle streak logic with improved date handling
    if (diffDays === 1) {
      // Consecutive day - increment streak
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else if (diffDays > 1) {
      // Streak broken - reset to 1 (today counts as new streak start)
      stats.currentStreak = 1;
    } else if (diffDays === 0) {
      // Same day - maintain current streak
    } else {
      // Negative difference (clock moved backwards) - maintain streak but don't increment

    }

    // Validate streak against actual activity data
    await this.validateStreak(stats);
  }

  /**
   * Private: Intelligently merge streaks from different devices
   */
  private static mergeStreaksIntelligently(localStats: UserStats, cloudStats: UserStats): number {
    // If one device has no activity, use the other
    if (localStats.currentStreak === 0) return cloudStats.currentStreak;
    if (cloudStats.currentStreak === 0) return localStats.currentStreak;

    // If both have streaks, prefer the one with more recent activity
    const localLastActive = new Date(localStats.lastActiveDate);
    const cloudLastActive = new Date(cloudStats.lastActiveDate);

    // If one is significantly more recent (within 1 day), use that streak
    const timeDiff = Math.abs(localLastActive.getTime() - cloudLastActive.getTime());
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (timeDiff <= oneDayMs) {
      // Both are recent, use the higher streak but log for monitoring
      const maxStreak = Math.max(localStats.currentStreak, cloudStats.currentStreak);

      return maxStreak;
    } else {
      // Use the streak from the more recent device
      const chosenStreak = localLastActive > cloudLastActive ? localStats.currentStreak : cloudStats.currentStreak;

      return chosenStreak;
    }
  }

  /**
   * Private: Validate streak against actual activity data
   */
  private static async validateStreak(stats: UserStats): Promise<void> {
    try {
      const sessions = await this.getDrillHistory();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - Math.max(stats.currentStreak, 30)); // Check last 30 days or streak length

      const recentSessions = sessions.filter(session =>
        new Date(session.date) >= cutoffDate
      );

      // Group sessions by date
      const sessionsByDate = new Map<string, number>();
      recentSessions.forEach(session => {
        const normalizedDate = new Date(session.date).toISOString().split('T')[0];
        sessionsByDate.set(normalizedDate, (sessionsByDate.get(normalizedDate) || 0) + 1);
      });

      // Check if streak matches actual consecutive days with activity
      const sortedDates = Array.from(sessionsByDate.keys()).sort();
      let actualStreak = 0;
      const currentDate = new Date();

      // Count backwards from today to find actual consecutive days
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - i);
        const normalizedCheckDate = checkDate.toISOString().split('T')[0];

        if (sessionsByDate.has(normalizedCheckDate)) {
          actualStreak++;
        } else {
          break; // Streak broken
        }
      }

      // If actual streak is significantly different from stored streak, log warning
      if (Math.abs(actualStreak - stats.currentStreak) > 1) {

        // Optionally correct the streak (uncomment if you want auto-correction)
        // stats.currentStreak = actualStreak;
      }
    } catch (error) {
      console.error('Error validating streak:', error);
    }
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

      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(recentSessions));
      }
    } catch (error) {
      console.error('Error recording session:', error);
      throw error;
    }
  }
}

export default StatsManager;
