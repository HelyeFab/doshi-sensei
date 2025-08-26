import { User } from 'firebase/auth';
import CloudSync from '@/utils/cloudSync';
import { UserStats, UnlockedAchievement } from './types';
import { serverTimestamp } from 'firebase/firestore';
import { Subscription } from '@/lib/subscriptions/types';
import { hasPaidPlan } from '@/lib/subscriptions/helpers';

export class AchievementPremiumSync {
  /**
   * Sync user stats to Firebase for premium users
   */
  static async syncUserStats(
    user: User,
    stats: UserStats,
    subscription?: Subscription | null
  ): Promise<boolean> {
    // Check if user can sync (paid plans only)
    if (!user || !hasPaidPlan(subscription)) {
      return false;
    }

    try {
      const syncData = {
        ...stats,
        updatedAt: serverTimestamp()
      };

      const result = await CloudSync.uploadData(
        user,
        'achievementStats',
        'current',
        syncData,
        15000, // 15 second timeout
        true   // use queue if offline
      );

      return result.success;
    } catch (error) {
      console.error('Failed to sync achievement stats:', error);
      return false;
    }
  }

  /**
   * Download user stats from Firebase for premium users
   */
  static async downloadUserStats(
    user: User,
    subscription?: Subscription | null
  ): Promise<UserStats | null> {
    // Check if user can sync (paid plans only)
    if (!user || !hasPaidPlan(subscription)) {
      return null;
    }

    try {
      const result = await CloudSync.downloadData<UserStats & { updatedAt?: any }>(
        user,
        'achievementStats',
        'current'
      );

      if (result.data) {
        // Remove Firebase-specific fields
        const { updatedAt, ...stats } = result.data;
        return stats as UserStats;
      }

      return null;
    } catch (error) {
      console.error('Failed to download achievement stats:', error);
      return null;
    }
  }

  /**
   * Sync unlocked achievement to Firebase for premium users
   */
  static async syncUnlockedAchievement(
    user: User,
    achievement: UnlockedAchievement,
    subscription?: Subscription | null
  ): Promise<boolean> {
    // Check if user can sync (paid plans only)
    if (!user || !hasPaidPlan(subscription)) {
      return false;
    }

    try {
      const syncData = {
        ...achievement,
        updatedAt: serverTimestamp()
      };

      const result = await CloudSync.uploadData(
        user,
        'unlockedAchievements',
        achievement.achievementId, // Use achievementId as document ID
        syncData,
        15000, // 15 second timeout
        true   // use queue if offline
      );

      return result.success;
    } catch (error) {
      console.error('Failed to sync unlocked achievement:', error);
      return false;
    }
  }

  /**
   * Download all unlocked achievements from Firebase for premium users
   */
  static async downloadUnlockedAchievements(
    user: User,
    subscription?: Subscription | null
  ): Promise<UnlockedAchievement[]> {
    // Check if user can sync (paid plans only)
    if (!user || !hasPaidPlan(subscription)) {
      return [];
    }

    try {
      const result = await CloudSync.downloadCollection<UnlockedAchievement & { updatedAt?: any }>(
        user,
        'unlockedAchievements'
      );

      if (result.data) {
        // Remove Firebase-specific fields
        return result.data.map(({ updatedAt, ...achievement }) => achievement as UnlockedAchievement);
      }

      return [];
    } catch (error) {
      console.error('Failed to download unlocked achievements:', error);
      return [];
    }
  }

  /**
   * Merge local and cloud achievement data
   */
  static mergeAchievementData(
    localStats: UserStats | null,
    cloudStats: UserStats | null
  ): UserStats | null {
    // If no cloud data, use local
    if (!cloudStats) return localStats;
    
    // If no local data, use cloud
    if (!localStats) return cloudStats;

    // Merge by taking the maximum values (achievements can only go up)
    return {
      currentStreak: Math.max(localStats.currentStreak, cloudStats.currentStreak),
      longestStreak: Math.max(localStats.longestStreak, cloudStats.longestStreak),
      drillsCompleted: Math.max(localStats.drillsCompleted, cloudStats.drillsCompleted),
      wordsSaved: Math.max(localStats.wordsSaved, cloudStats.wordsSaved),
      sentencesRead: Math.max(localStats.sentencesRead, cloudStats.sentencesRead),
      storiesCompleted: Math.max(localStats.storiesCompleted, cloudStats.storiesCompleted),
      gamesPlayed: Math.max(localStats.gamesPlayed, cloudStats.gamesPlayed),
      articlesRead: Math.max(localStats.articlesRead, cloudStats.articlesRead),
      flashcardSessions: Math.max(localStats.flashcardSessions, cloudStats.flashcardSessions),
      totalXP: Math.max(localStats.totalXP, cloudStats.totalXP),
      lastStudyDate: localStats.lastStudyDate > cloudStats.lastStudyDate ? 
        localStats.lastStudyDate : cloudStats.lastStudyDate,
      totalStudyTime: Math.max(localStats.totalStudyTime, cloudStats.totalStudyTime),
      listsCreated: Math.max(localStats.listsCreated, cloudStats.listsCreated),
      kanjiStudied: Math.max(localStats.kanjiStudied, cloudStats.kanjiStudied)
    };
  }

  /**
   * Merge unlocked achievements from local and cloud
   */
  static mergeUnlockedAchievements(
    localAchievements: UnlockedAchievement[],
    cloudAchievements: UnlockedAchievement[]
  ): UnlockedAchievement[] {
    // Create a map to track unique achievements by achievementId
    const achievementMap = new Map<string, UnlockedAchievement>();

    // Add all cloud achievements first (they're the source of truth for premium users)
    cloudAchievements.forEach(achievement => {
      achievementMap.set(achievement.achievementId, achievement);
    });

    // Add local achievements that aren't in cloud (might be newer)
    localAchievements.forEach(achievement => {
      if (!achievementMap.has(achievement.achievementId)) {
        achievementMap.set(achievement.achievementId, achievement);
      }
    });

    return Array.from(achievementMap.values());
  }
}