'use client';

import { useState, useEffect, useCallback } from 'react';
import { Achievement, UserStats, UnlockedAchievement } from '@/lib/achievements/types';
import { AchievementManager } from '@/lib/achievements/manager';

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [allAchievements, unlocked, stats] = await Promise.all([
        AchievementManager.loadAllAchievements(),
        AchievementManager.getUnlockedAchievements(),
        AchievementManager.getUserStats()
      ]);

      setAchievements(allAchievements);
      setUnlockedAchievements(unlocked);
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading achievement data:', err);
      setError('Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user stats and check for new achievements
  const updateProgress = useCallback(async (statType: keyof UserStats, increment: number = 1): Promise<UnlockedAchievement[]> => {
    try {
      const newlyUnlocked = await AchievementManager.updateStats(statType, increment);
      
      if (newlyUnlocked.length > 0) {
        // Refresh data to get updated stats and unlocked achievements
        await loadData();
        
        // Show notifications for new achievements
        newlyUnlocked.forEach(achievement => {
          showAchievementNotification(achievement);
        });
      } else {
        // Just update stats if no new achievements
        const updatedStats = await AchievementManager.getUserStats();
        setUserStats(updatedStats);
      }

      return newlyUnlocked;
    } catch (err) {
      console.error('Error updating progress:', err);
      return [];
    }
  }, [loadData]);

  // Update daily streak (call on app start)
  const updateDailyStreak = useCallback(async (): Promise<UnlockedAchievement[]> => {
    try {
      const newlyUnlocked = await AchievementManager.updateDailyStreak();
      
      if (newlyUnlocked.length > 0) {
        await loadData();
        newlyUnlocked.forEach(achievement => {
          showAchievementNotification(achievement);
        });
      } else {
        // Just update stats
        const updatedStats = await AchievementManager.getUserStats();
        setUserStats(updatedStats);
      }

      return newlyUnlocked;
    } catch (err) {
      console.error('Error updating daily streak:', err);
      return [];
    }
  }, [loadData]);

  // Get achievement progress for display
  const getAchievementProgress = useCallback((achievementId: string) => {
    if (!userStats) {
      return { current: 0, target: 1, percentage: 0 };
    }

    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || achievement.conditionType !== 'simple' || !achievement.conditionField || achievement.conditionValue === undefined) {
      return { current: 0, target: 1, percentage: 0 };
    }

    const current = userStats[achievement.conditionField];
    const target = achievement.conditionValue;
    const percentage = Math.min((current / target) * 100, 100);

    return { current, target, percentage };
  }, [achievements, userStats]);

  // Check if achievement is unlocked
  const isAchievementUnlocked = useCallback((achievementId: string): boolean => {
    return unlockedAchievements.some(unlocked => unlocked.achievementId === achievementId);
  }, [unlockedAchievements]);

  // Get achievements by category
  const getAchievementsByCategory = useCallback((category: Achievement['category']): Achievement[] => {
    return achievements.filter(achievement => achievement.category === category);
  }, [achievements]);

  // Get achievements by rarity
  const getAchievementsByRarity = useCallback((rarity: Achievement['rarity']): Achievement[] => {
    return achievements.filter(achievement => achievement.rarity === rarity);
  }, [achievements]);

  // Get unlocked achievements count
  const getUnlockedCount = useCallback((): number => {
    return unlockedAchievements.length;
  }, [unlockedAchievements]);

  // Get total achievements count
  const getTotalCount = useCallback((): number => {
    return achievements.length;
  }, [achievements]);

  // Get completion percentage
  const getCompletionPercentage = useCallback((): number => {
    const total = getTotalCount();
    const unlocked = getUnlockedCount();
    return total > 0 ? Math.round((unlocked / total) * 100) : 0;
  }, [getTotalCount, getUnlockedCount]);

  // Show achievement notification (you can customize this)
  const showAchievementNotification = useCallback((unlockedAchievement: UnlockedAchievement) => {
    const achievement = achievements.find(a => a.id === unlockedAchievement.achievementId);
    if (achievement) {
      // For now, just log to console. In Phase 2, we'll add toast notifications
      console.log(`🏆 Achievement Unlocked: ${achievement.title} - ${achievement.description}`);
      
      // You can dispatch a custom event here for toast notifications
      window.dispatchEvent(new CustomEvent('achievementUnlocked', {
        detail: { achievement, unlockedAchievement }
      }));
    }
  }, [achievements]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Data
    achievements,
    unlockedAchievements,
    userStats,
    isLoading,
    error,

    // Actions
    updateProgress,
    updateDailyStreak,
    refreshData: loadData,

    // Utilities
    getAchievementProgress,
    isAchievementUnlocked,
    getAchievementsByCategory,
    getAchievementsByRarity,
    getUnlockedCount,
    getTotalCount,
    getCompletionPercentage
  };
}