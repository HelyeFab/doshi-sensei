import { Achievement, UserStats, UnlockedAchievement, AchievementProgress } from './types';
import { DEFAULT_ACHIEVEMENTS } from './registry';
import EnhancedStorageManager from '@/utils/storage';
import { AchievementPremiumSync } from './premiumSync';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export class AchievementManager {
  private static cache: Achievement[] | null = null;
  private static lastLoaded: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static currentUser: User | null = null;
  private static subscriptionStatus: string | null = null;
  
  // Rate limiting for achievement checks
  private static lastAchievementCheck: number = 0;
  private static ACHIEVEMENT_CHECK_COOLDOWN = 5000; // 5 seconds between checks
  
  // Weekend warrior tracking
  private static weekendDaysStudied: Set<string> = new Set();

  /**
   * Initialize the manager and set up auth listener
   */
  static async initialize(): Promise<void> {
    // Set up auth listener
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        // Get subscription status from user data
        try {
          const idToken = await user.getIdToken();
          const idTokenResult = await user.getIdTokenResult();
          
          // Check custom claims for subscription status
          if (idTokenResult.claims.subscriptionStatus) {
            this.subscriptionStatus = idTokenResult.claims.subscriptionStatus as string;
          } else {
            // Fallback to checking user document
            const userDoc = await EnhancedStorageManager.loadSettings();
            this.subscriptionStatus = userDoc?.subscription?.status || 'inactive';
          }

          // Sync with cloud if premium
          if (this.subscriptionStatus === 'active') {
            await this.syncWithCloud();
          }
        } catch (error) {
          console.error('Failed to get subscription status:', error);
          this.subscriptionStatus = 'inactive';
        }
      } else {
        // User logged out - clear cached data
        this.subscriptionStatus = null;
        this.cache = null;
        this.lastLoaded = 0;
        this.weekendDaysStudied.clear();
        
        // Clear achievement data from storage
        await this.clearLocalAchievementData();
      }
    });
  }

  /**
   * Sync local data with cloud for premium users
   */
  private static async syncWithCloud(): Promise<void> {
    if (!this.currentUser || this.subscriptionStatus !== 'active') {
      return;
    }

    try {
      // Download cloud data
      const [cloudStats, cloudAchievements] = await Promise.all([
        AchievementPremiumSync.downloadUserStats(this.currentUser, this.subscriptionStatus),
        AchievementPremiumSync.downloadUnlockedAchievements(this.currentUser, this.subscriptionStatus)
      ]);

      // Get local data
      const localStats = await EnhancedStorageManager.getUserStats();
      const localAchievements = await EnhancedStorageManager.getUnlockedAchievements();

      // Merge data
      const mergedStats = AchievementPremiumSync.mergeAchievementData(localStats, cloudStats);
      const mergedAchievements = AchievementPremiumSync.mergeUnlockedAchievements(
        localAchievements,
        cloudAchievements
      );

      // Save merged data locally
      if (mergedStats) {
        await EnhancedStorageManager.saveUserStats(mergedStats);
      }

      // Save merged achievements locally
      for (const achievement of mergedAchievements) {
        const exists = localAchievements.some(a => a.achievementId === achievement.achievementId);
        if (!exists) {
          await EnhancedStorageManager.saveUnlockedAchievement(achievement);
        }
      }

      console.log('Achievement data synced with cloud successfully');
    } catch (error) {
      console.error('Failed to sync with cloud:', error);
    }
  }

  /**
   * Load all achievements (default + dynamic)
   */
  static async loadAllAchievements(): Promise<Achievement[]> {
    const now = Date.now();
    
    // Return cached version if still valid
    if (this.cache && (now - this.lastLoaded) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      // Try to load dynamic achievements
      const dynamicAchievements = await this.loadDynamicAchievements();
      
      // Merge with default achievements (dynamic takes precedence for same IDs)
      const allAchievements = this.mergeAchievements(DEFAULT_ACHIEVEMENTS, dynamicAchievements);
      
      // Filter only active achievements
      const activeAchievements = allAchievements.filter(a => a.isActive);

      // Update cache
      this.cache = activeAchievements;
      this.lastLoaded = now;

      return activeAchievements;
    } catch (error) {
      console.error('Failed to load achievements:', error);
      // Fallback to default achievements
      return DEFAULT_ACHIEVEMENTS.filter(a => a.isActive);
    }
  }

  /**
   * Load dynamic achievements from file/API
   */
  private static async loadDynamicAchievements(): Promise<Achievement[]> {
    try {
      const response = await fetch('/api/admin/achievements');
      if (response.ok) {
        const data = await response.json();
        return data.achievements || [];
      }
    } catch (error) {
      console.error('Failed to load dynamic achievements:', error);
    }
    return [];
  }

  /**
   * Merge default and dynamic achievements
   */
  private static mergeAchievements(defaultAchievements: Achievement[], dynamicAchievements: Achievement[]): Achievement[] {
    const merged = [...defaultAchievements];
    
    // Add or replace with dynamic achievements
    dynamicAchievements.forEach(dynamicAchievement => {
      const existingIndex = merged.findIndex(a => a.id === dynamicAchievement.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = dynamicAchievement;
      } else {
        merged.push(dynamicAchievement);
      }
    });

    return merged;
  }

  /**
   * Update user stats and check for newly unlocked achievements
   * Includes rate limiting to prevent achievement spam
   */
  static async updateStats(statType: keyof UserStats, increment: number = 1): Promise<UnlockedAchievement[]> {
    try {
      // Load current stats
      const currentStats = await this.getUserStats();
      
      // Update the specific stat
      const updatedStats = {
        ...currentStats,
        [statType]: currentStats[statType] + increment
      };

      // Special handling for streak updates
      if (statType === 'currentStreak') {
        updatedStats.longestStreak = Math.max(updatedStats.longestStreak, updatedStats.currentStreak);
      }

      // Save updated stats
      await this.saveUserStats(updatedStats);

      // Rate limiting - don't check achievements too frequently
      const now = Date.now();
      if (now - this.lastAchievementCheck < this.ACHIEVEMENT_CHECK_COOLDOWN) {
        console.log('[AchievementManager] Rate limit: Skipping achievement check (cooldown active)');
        return [];
      }
      this.lastAchievementCheck = now;

      // Check for newly unlocked achievements
      const newlyUnlocked = await this.checkAchievements(updatedStats);

      return newlyUnlocked;
    } catch (error) {
      console.error('Error updating stats:', error);
      return [];
    }
  }

  /**
   * Check which achievements should be unlocked based on current stats
   */
  static async checkAchievements(stats: UserStats): Promise<UnlockedAchievement[]> {
    try {
      const allAchievements = await this.loadAllAchievements();
      const unlockedAchievements = await this.getUnlockedAchievements();
      const unlockedIds = new Set(unlockedAchievements.map(u => u.achievementId));

      const newlyUnlocked: UnlockedAchievement[] = [];

      for (const achievement of allAchievements) {
        // Handle multi-level achievements
        if (achievement.isMultiLevel && achievement.levels) {
          const multiLevelUnlocked = await this.checkMultiLevelAchievement(achievement, stats, unlockedAchievements);
          newlyUnlocked.push(...multiLevelUnlocked);
          continue;
        }

        // Skip if already unlocked (for single-level achievements)
        if (unlockedIds.has(achievement.id)) {
          continue;
        }

        // Check if achievement condition is met
        if (this.evaluateCondition(achievement, stats)) {
          const unlockedAchievement = await this.unlockAchievement(achievement.id);
          if (unlockedAchievement) {
            newlyUnlocked.push(unlockedAchievement);
          }
        }
      }

      // Check hidden achievements (pass true since this is called from updateStats which means activity completion)
      const hiddenUnlocked = await this.checkHiddenAchievements(stats, unlockedIds, true);
      newlyUnlocked.push(...hiddenUnlocked);

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Evaluate if an achievement condition is met
   */
  private static evaluateCondition(achievement: Achievement, stats: UserStats): boolean {
    if (achievement.conditionType === 'simple') {
      const { conditionField, conditionOperator, conditionValue } = achievement;
      
      if (!conditionField || !conditionOperator || conditionValue === undefined) {
        return false;
      }

      const currentValue = stats[conditionField];
      
      switch (conditionOperator) {
        case '>=':
          return currentValue >= conditionValue;
        case '>':
          return currentValue > conditionValue;
        case '==':
          return currentValue === conditionValue;
        case '<':
          return currentValue < conditionValue;
        case '<=':
          return currentValue <= conditionValue;
        default:
          return false;
      }
    }

    // Handle complex conditions
    if (achievement.conditionType === 'complex') {
      // First Steps - requires actual activity
      if (achievement.id === 'first_day') {
        // Check if user has done at least one activity
        const hasActivity = stats.drillsCompleted > 0 || 
                           stats.gamesPlayed > 0 || 
                           stats.wordsSaved > 0 ||
                           stats.sentencesRead > 0 ||
                           stats.flashcardSessions > 0;
        return hasActivity && stats.currentStreak >= 1;
      }
    }

    return false;
  }

  /**
   * Unlock an achievement
   */
  static async unlockAchievement(achievementId: string): Promise<UnlockedAchievement | null> {
    try {
      const unlockedAchievement: UnlockedAchievement = {
        id: `${achievementId}_${Date.now()}`,
        achievementId,
        unlockedAt: new Date().toISOString(),
        progress: 100, // For simple achievements, always 100%
        notificationShown: false
      };

      // Save to storage
      await this.saveUnlockedAchievement(unlockedAchievement);

      // Award XP if it's an XP reward
      const achievement = await this.getAchievementById(achievementId);
      if (achievement && achievement.rewardType === 'xp') {
        await this.awardXP(achievement.rewardValue as number);
      }

      return unlockedAchievement;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }
  }

  /**
   * Award XP to user
   */
  private static async awardXP(amount: number): Promise<void> {
    const stats = await this.getUserStats();
    stats.totalXP += amount;
    await this.saveUserStats(stats);
  }

  /**
   * Get user stats with defaults
   */
  static async getUserStats(): Promise<UserStats> {
    try {
      const stats = await EnhancedStorageManager.getUserStats();
      return stats || this.getDefaultStats();
    } catch (error) {
      console.error('Error loading user stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Save user stats (with premium sync)
   */
  static async saveUserStats(stats: UserStats): Promise<void> {
    try {
      // Always save locally first
      await EnhancedStorageManager.saveUserStats(stats);
      
      // Sync to cloud if premium user
      if (this.currentUser && this.subscriptionStatus === 'active') {
        await AchievementPremiumSync.syncUserStats(
          this.currentUser,
          stats,
          this.subscriptionStatus
        );
      }
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  }

  /**
   * Get default user stats
   */
  private static getDefaultStats(): UserStats {
    return {
      currentStreak: 0,
      longestStreak: 0,
      drillsCompleted: 0,
      wordsSaved: 0,
      sentencesRead: 0,
      storiesCompleted: 0,
      gamesPlayed: 0,
      articlesRead: 0,
      flashcardSessions: 0,
      totalXP: 0,
      lastStudyDate: '',
      totalStudyTime: 0,
      listsCreated: 0,
      kanjiStudied: 0
    };
  }

  /**
   * Get unlocked achievements
   */
  static async getUnlockedAchievements(): Promise<UnlockedAchievement[]> {
    try {
      return await EnhancedStorageManager.getUnlockedAchievements();
    } catch (error) {
      console.error('Error loading unlocked achievements:', error);
      return [];
    }
  }

  /**
   * Save unlocked achievement (with premium sync)
   */
  private static async saveUnlockedAchievement(unlockedAchievement: UnlockedAchievement): Promise<void> {
    try {
      // Always save locally first
      await EnhancedStorageManager.saveUnlockedAchievement(unlockedAchievement);
      
      // Sync to cloud if premium user
      if (this.currentUser && this.subscriptionStatus === 'active') {
        await AchievementPremiumSync.syncUnlockedAchievement(
          this.currentUser,
          unlockedAchievement,
          this.subscriptionStatus
        );
      }
    } catch (error) {
      console.error('Error saving unlocked achievement:', error);
    }
  }

  /**
   * Get achievement by ID
   */
  static async getAchievementById(id: string): Promise<Achievement | null> {
    const allAchievements = await this.loadAllAchievements();
    return allAchievements.find(a => a.id === id) || null;
  }

  /**
   * Get achievements available to a specific user type
   */
  static async getAchievementsForUserType(userType: 'guest' | 'free' | 'premium'): Promise<Achievement[]> {
    const allAchievements = await this.loadAllAchievements();
    return allAchievements.filter(achievement => 
      !achievement.requiredUserType || achievement.requiredUserType === userType
    );
  }

  /**
   * Get achievement progress for display
   */
  static async getAchievementProgress(achievementId: string, stats: UserStats): Promise<{ current: number; target: number; percentage: number }> {
    const achievement = await this.getAchievementById(achievementId);
    
    if (!achievement || achievement.conditionType !== 'simple' || !achievement.conditionField || achievement.conditionValue === undefined) {
      return { current: 0, target: 1, percentage: 0 };
    }

    const current = stats[achievement.conditionField];
    const target = achievement.conditionValue;
    const percentage = Math.min((current / target) * 100, 100);

    return { current, target, percentage };
  }

  /**
   * Clear cache (useful for admin updates)
   */
  static clearCache(): void {
    this.cache = null;
    this.lastLoaded = 0;
  }

  /**
   * Update daily streak (should be called on app start)
   */
  static async updateDailyStreak(): Promise<UnlockedAchievement[]> {
    const stats = await this.getUserStats();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (stats.lastStudyDate === yesterday) {
      // Continue streak
      stats.currentStreak += 1;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else if (stats.lastStudyDate !== today) {
      // Reset streak (unless it's the same day)
      stats.currentStreak = 1;
    }
    
    stats.lastStudyDate = today;
    await this.saveUserStats(stats);
    
    // Check for newly unlocked achievements
    return await this.checkAchievements(stats);
  }

  /**
   * Check multi-level achievement progress
   */
  private static async checkMultiLevelAchievement(
    achievement: Achievement, 
    stats: UserStats, 
    unlockedAchievements: UnlockedAchievement[]
  ): Promise<UnlockedAchievement[]> {
    if (!achievement.levels || !achievement.conditionField) {
      return [];
    }

    const currentValue = stats[achievement.conditionField];
    const newlyUnlocked: UnlockedAchievement[] = [];

    // Find the highest level already unlocked for this achievement
    const unlockedLevels = unlockedAchievements
      .filter(u => u.achievementId.startsWith(achievement.id))
      .map(u => {
        const levelMatch = u.achievementId.match(/_level_(\d+)$/);
        return levelMatch ? parseInt(levelMatch[1]) : 0;
      })
      .sort((a, b) => b - a);

    const highestUnlockedLevel = unlockedLevels[0] || 0;

    // Check each level to see if it should be unlocked
    for (const level of achievement.levels) {
      if (level.level <= highestUnlockedLevel) {
        continue; // Already unlocked
      }

      if (currentValue >= level.targetValue) {
        const levelAchievementId = `${achievement.id}_level_${level.level}`;
        const unlockedAchievement = await this.unlockMultiLevelAchievement(
          levelAchievementId,
          achievement,
          level
        );
        
        if (unlockedAchievement) {
          newlyUnlocked.push(unlockedAchievement);
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Unlock a multi-level achievement
   */
  private static async unlockMultiLevelAchievement(
    levelAchievementId: string,
    baseAchievement: Achievement,
    level: any
  ): Promise<UnlockedAchievement | null> {
    try {
      const unlockedAchievement: UnlockedAchievement = {
        id: `${levelAchievementId}_${Date.now()}`,
        achievementId: levelAchievementId,
        unlockedAt: new Date().toISOString(),
        progress: 100,
        notificationShown: false
      };

      // Save to storage
      await this.saveUnlockedAchievement(unlockedAchievement);

      // Award XP if it's an XP reward
      if (level.rewardType === 'xp') {
        await this.awardXP(level.rewardValue as number);
      }

      return unlockedAchievement;
    } catch (error) {
      console.error('Error unlocking multi-level achievement:', error);
      return null;
    }
  }

  /**
   * Check hidden achievements
   * Note: This should only be called when a user completes an activity,
   * not on page load or achievement viewing
   */
  private static async checkHiddenAchievements(
    stats: UserStats, 
    unlockedIds: Set<string>,
    isActivityCompletion: boolean = false
  ): Promise<UnlockedAchievement[]> {
    const newlyUnlocked: UnlockedAchievement[] = [];
    const now = new Date();

    // Only check time-based achievements when user actually completes an activity
    if (isActivityCompletion) {
      // Early Bird - Study before 6 AM
      if (!unlockedIds.has('early_bird') && now.getHours() < 6) {
        console.log('[AchievementManager] User completed activity before 6 AM - awarding Early Bird');
        const unlocked = await this.unlockAchievement('early_bird');
        if (unlocked) newlyUnlocked.push(unlocked);
      }

      // Night Owl - Study after 11 PM
      if (!unlockedIds.has('night_owl') && now.getHours() >= 23) {
        console.log('[AchievementManager] User completed activity after 11 PM - awarding Night Owl');
        const unlocked = await this.unlockAchievement('night_owl');
        if (unlocked) newlyUnlocked.push(unlocked);
      }

      // Weekend Warrior - Study on both Saturday and Sunday
      if (isActivityCompletion && !unlockedIds.has('weekend_warrior')) {
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
        
        if (isWeekend) {
          // Track which weekend days have been studied
          const dateStr = now.toDateString();
          this.weekendDaysStudied.add(dateStr);
          this.saveWeekendTracking();
          
          // Check if both Saturday and Sunday have been studied in the current week
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - dayOfWeek); // Go to Sunday
          
          let saturdayStudied = false;
          let sundayStudied = false;
          
          // Check the current week's weekend days
          for (let i = 0; i < 7; i++) {
            const checkDate = new Date(weekStart);
            checkDate.setDate(weekStart.getDate() + i);
            const checkDateStr = checkDate.toDateString();
            
            if (checkDate.getDay() === 6 && this.weekendDaysStudied.has(checkDateStr)) {
              saturdayStudied = true;
            }
            if (checkDate.getDay() === 0 && this.weekendDaysStudied.has(checkDateStr)) {
              sundayStudied = true;
            }
          }
          
          if (saturdayStudied && sundayStudied) {
            console.log('[AchievementManager] User studied both Saturday and Sunday - awarding Weekend Warrior');
            const unlocked = await this.unlockAchievement('weekend_warrior');
            if (unlocked) newlyUnlocked.push(unlocked);
            
            // Clear old weekend days from tracking (keep only last 2 weeks)
            const twoWeeksAgo = new Date(now);
            twoWeeksAgo.setDate(now.getDate() - 14);
            this.weekendDaysStudied = new Set(
              Array.from(this.weekendDaysStudied).filter(dateStr => 
                new Date(dateStr) > twoWeeksAgo
              )
            );
            this.saveWeekendTracking();
          }
        }
      }
    }

    // Speed Demon - Complete 10 drills in under 30 minutes
    // This would need session tracking, for now skip

    return newlyUnlocked;
  }

  /**
   * Get multi-level achievement progress
   */
  static async getMultiLevelProgress(
    achievementId: string, 
    stats: UserStats
  ): Promise<{
    currentLevel: number;
    nextLevel: number | null;
    currentProgress: number;
    nextTarget: number | null;
    percentage: number;
    totalLevels: number;
  }> {
    const achievement = await this.getAchievementById(achievementId);
    
    if (!achievement?.isMultiLevel || !achievement.levels || !achievement.conditionField) {
      return {
        currentLevel: 0,
        nextLevel: null,
        currentProgress: 0,
        nextTarget: null,
        percentage: 0,
        totalLevels: 0
      };
    }

    const currentValue = stats[achievement.conditionField];
    const unlockedAchievements = await this.getUnlockedAchievements();
    
    // Find highest unlocked level
    const unlockedLevels = unlockedAchievements
      .filter(u => u.achievementId.startsWith(achievement.id))
      .map(u => {
        const levelMatch = u.achievementId.match(/_level_(\d+)$/);
        return levelMatch ? parseInt(levelMatch[1]) : 0;
      })
      .sort((a, b) => b - a);

    const currentLevel = unlockedLevels[0] || 0;
    const nextLevel = achievement.levels.find(l => l.level > currentLevel);
    
    return {
      currentLevel,
      nextLevel: nextLevel?.level || null,
      currentProgress: currentValue,
      nextTarget: nextLevel?.targetValue || null,
      percentage: nextLevel ? Math.min((currentValue / nextLevel.targetValue) * 100, 100) : 100,
      totalLevels: achievement.levels.length
    };
  }

  /**
   * Get cosmetic rewards owned by user
   */
  static async getCosmeticRewards(): Promise<string[]> {
    const unlockedAchievements = await this.getUnlockedAchievements();
    const allAchievements = await this.loadAllAchievements();
    
    const cosmetics: string[] = [];
    
    for (const unlocked of unlockedAchievements) {
      // Handle both regular and multi-level achievements
      const baseId = unlocked.achievementId.replace(/_level_\d+$/, '');
      const achievement = allAchievements.find(a => a.id === baseId);
      
      if (achievement) {
        if (achievement.isMultiLevel && achievement.levels) {
          // Find the specific level
          const levelMatch = unlocked.achievementId.match(/_level_(\d+)$/);
          if (levelMatch) {
            const levelNum = parseInt(levelMatch[1]);
            const level = achievement.levels.find(l => l.level === levelNum);
            if (level && level.rewardType === 'cosmetic') {
              cosmetics.push(level.rewardValue as string);
            }
          }
        } else if (achievement.rewardType === 'cosmetic') {
          cosmetics.push(achievement.rewardValue as string);
        }
      }
    }
    
    return cosmetics;
  }

  /**
   * Initialize user stats if they don't exist
   * This should be called when a new user is created
   */
  static async initializeUserStats(): Promise<void> {
    const existingStats = await EnhancedStorageManager.getUserStats();
    if (!existingStats) {
      console.log('[AchievementManager] Initializing new user stats');
      await this.saveUserStats(this.getDefaultStats());
    }
    
    // Load weekend tracking data from localStorage
    try {
      const savedWeekendDays = localStorage.getItem('doshi_weekend_days_studied');
      if (savedWeekendDays) {
        this.weekendDaysStudied = new Set(JSON.parse(savedWeekendDays));
      }
    } catch (error) {
      console.error('Error loading weekend tracking data:', error);
    }
  }
  
  /**
   * Save weekend tracking data
   */
  private static saveWeekendTracking(): void {
    try {
      localStorage.setItem('doshi_weekend_days_studied', 
        JSON.stringify(Array.from(this.weekendDaysStudied))
      );
    } catch (error) {
      console.error('Error saving weekend tracking data:', error);
    }
  }

  /**
   * Debug method to log current achievement state
   */
  static async debugAchievementState(): Promise<void> {
    const stats = await this.getUserStats();
    const unlocked = await this.getUnlockedAchievements();
    console.log('[AchievementManager] Current state:', {
      stats,
      unlockedCount: unlocked.length,
      unlockedIds: unlocked.map(u => u.achievementId)
    });
  }

  /**
   * Clear all local achievement data (called on logout)
   */
  private static async clearLocalAchievementData(): Promise<void> {
    try {
      console.log('[AchievementManager] Clearing local achievement data due to logout');
      
      // Clear from IndexedDB
      await EnhancedStorageManager.clearUserStats();
      await EnhancedStorageManager.clearUnlockedAchievements();
      
      // Clear weekend tracking from localStorage
      localStorage.removeItem('doshi_weekend_days_studied');
      
      // Clear any other achievement-related localStorage items
      const keysToRemove = ['achievement_last_checked', 'achievement_streak_date'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('[AchievementManager] Local achievement data cleared');
    } catch (error) {
      console.error('[AchievementManager] Error clearing local achievement data:', error);
    }
  }
}