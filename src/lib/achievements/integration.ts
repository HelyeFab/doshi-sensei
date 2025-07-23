/**
 * Achievement Integration Helper
 * 
 * This file provides simple functions to integrate achievements into existing features.
 * Import these functions in your existing components to start tracking achievements.
 */

import { AchievementManager } from './manager';
import { UserStats } from './types';

/**
 * Track drill completion
 * Call this when a user completes a drill session
 */
export async function trackDrillCompletion() {
  try {
    const newAchievements = await AchievementManager.updateStats('drillsCompleted', 1);
    
    // Dispatch event for UI notifications
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking drill completion:', error);
    return [];
  }
}

/**
 * Track word saving
 * Call this when a user saves a word to their list
 */
export async function trackWordSaved() {
  try {
    const newAchievements = await AchievementManager.updateStats('wordsSaved', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking word saved:', error);
    return [];
  }
}

/**
 * Track sentence reading
 * Call this when a user reads/views a sentence
 */
export async function trackSentenceRead() {
  try {
    const newAchievements = await AchievementManager.updateStats('sentencesRead', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking sentence read:', error);
    return [];
  }
}

/**
 * Track story completion
 * Call this when a user completes reading a story
 */
export async function trackStoryCompleted() {
  try {
    const newAchievements = await AchievementManager.updateStats('storiesCompleted', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking story completion:', error);
    return [];
  }
}

/**
 * Track game played
 * Call this when a user plays/completes a game
 */
export async function trackGamePlayed() {
  try {
    const newAchievements = await AchievementManager.updateStats('gamesPlayed', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking game played:', error);
    return [];
  }
}

/**
 * Track article reading
 * Call this when a user reads an article
 */
export async function trackArticleRead() {
  try {
    const newAchievements = await AchievementManager.updateStats('articlesRead', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking article read:', error);
    return [];
  }
}

/**
 * Track flashcard session
 * Call this when a user completes a flashcard session
 */
export async function trackFlashcardSession() {
  try {
    const newAchievements = await AchievementManager.updateStats('flashcardSessions', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking flashcard session:', error);
    return [];
  }
}

/**
 * Track list creation
 * Call this when a user creates a new list
 */
export async function trackListCreated() {
  try {
    const newAchievements = await AchievementManager.updateStats('listsCreated', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking list creation:', error);
    return [];
  }
}

/**
 * Track kanji studied
 * Call this when a user studies/views kanji
 */
export async function trackKanjiStudied() {
  try {
    const newAchievements = await AchievementManager.updateStats('kanjiStudied', 1);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking kanji studied:', error);
    return [];
  }
}

/**
 * Track study time
 * Call this to add study time (in minutes)
 */
export async function trackStudyTime(minutes: number) {
  try {
    const newAchievements = await AchievementManager.updateStats('totalStudyTime', minutes);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error tracking study time:', error);
    return [];
  }
}

/**
 * Initialize daily streak on app start
 * Call this when the app starts or user logs in
 */
export async function initializeDailyStreak() {
  try {
    const newAchievements = await AchievementManager.updateDailyStreak();
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error initializing daily streak:', error);
    return [];
  }
}

/**
 * Get current user stats
 * Useful for displaying progress in UI
 */
export async function getCurrentStats(): Promise<UserStats> {
  try {
    return await AchievementManager.getUserStats();
  } catch (error) {
    console.error('Error getting current stats:', error);
    // Return default stats on error
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
}

/**
 * Award XP directly
 * Call this to award XP for specific actions
 */
export async function awardXP(amount: number) {
  try {
    const newAchievements = await AchievementManager.updateStats('totalXP', amount);
    
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('achievementsUnlocked', {
        detail: { achievements: newAchievements }
      }));
    }
    
    return newAchievements;
  } catch (error) {
    console.error('Error awarding XP:', error);
    return [];
  }
}