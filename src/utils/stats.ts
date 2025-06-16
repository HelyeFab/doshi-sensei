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
}

interface DrillSession {
  date: string;
  questionsAnswered: number;
  correctAnswers: number;
  wordsStudied: string[];
}

const STATS_KEY = 'doshi_sensei_user_stats';
const SESSIONS_KEY = 'doshi_sensei_drill_sessions';

export class StatsManager {
  /**
   * Get current user statistics
   */
  static async getUserStats(): Promise<UserStats> {
    try {
      const statsData = localStorage.getItem(STATS_KEY);
      if (!statsData) {
        return this.createInitialStats();
      }

      const stats = JSON.parse(statsData) as UserStats;

      // Update streak based on current date
      await this.updateStreak(stats);

      return stats;
    } catch (error) {
      console.error('Error loading user stats:', error);
      return this.createInitialStats();
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
      stats.accuracy = stats.totalQuestions > 0 ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0;

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
   * Private: Save statistics to localStorage
   */
  private static async saveStats(stats: UserStats): Promise<void> {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
      throw error;
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

      localStorage.setItem(SESSIONS_KEY, JSON.stringify(recentSessions));
    } catch (error) {
      console.error('Error recording session:', error);
      throw error;
    }
  }
}

export default StatsManager;
