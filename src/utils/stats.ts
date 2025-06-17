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
      // If user is logged in and has cloud sync, try to load from cloud first
      if (this.currentUser && this.hasCloudSync) {
        console.log('☁️ Attempting cloud sync for user:', this.currentUser.email);
        const cloudStats = await this.loadStatsFromCloud();
        if (cloudStats) {
          console.log('📥 Found cloud stats:', cloudStats);
          // Merge with local data if needed and save locally
          await this.saveStatsLocally(cloudStats);
          await this.updateStreak(cloudStats);
          return cloudStats;
        } else {
          console.log('☁️ No cloud stats found, checking local data to upload...');
          // If no cloud data but user has sync, try to upload local data
          const localStats = this.getLocalStats();
          if (localStats) {
            console.log('📤 Uploading local stats to cloud:', localStats);
            await this.saveStatsToCloud(localStats);
            return localStats;
          }
        }
      } else if (this.currentUser && !this.hasCloudSync) {
        console.log('⚠️ User logged in but no cloud sync available');
      }

      // Fallback to localStorage
      console.log('💾 Falling back to localStorage');
      const statsData = localStorage.getItem(STATS_KEY);
      if (!statsData) {
        const initialStats = this.createInitialStats();
        console.log('🆕 Created initial stats:', initialStats);
        return initialStats;
      }

      const stats = JSON.parse(statsData) as UserStats;
      console.log('📊 Loaded local stats:', stats);
      await this.updateStreak(stats);
      return stats;
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

      // Update usage tracking
      if (stats.lastActiveDate !== today) {
        stats.totalDaysUsed += 1;
        stats.lastActiveDate = today;
      }

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

      // Update usage tracking
      if (stats.lastActiveDate !== today) {
        stats.totalDaysUsed += 1;
        stats.lastActiveDate = today;
      }

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
   * Private: Update streak calculation
   */
  private static async updateStreak(stats: UserStats): Promise<void> {
    const today = new Date();
    const lastActive = new Date(stats.lastActiveDate);
    const diffTime = today.getTime() - lastActive.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no change
      return;
    } else if (diffDays === 1) {
      // Consecutive day, increment streak
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else if (diffDays > 1) {
      // Streak broken
      stats.currentStreak = 1; // Today counts as new streak start
      stats.lastActiveDate = today.toDateString();
      stats.totalDaysUsed += 1;
    }

    await this.saveStats(stats);
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
