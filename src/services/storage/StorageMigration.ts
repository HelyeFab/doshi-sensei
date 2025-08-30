/**
 * Storage Migration Service
 * Migrates existing data to the Unified Storage Layer
 * 
 * This ensures all existing user data is preserved when upgrading
 * to the new universal sync system
 */

import { auth } from '@/lib/firebase';
import { unifiedStorage } from './UnifiedStorageLayer';
import { vocabStorage } from '../textbook-vocabulary/storage';
import { kanjiStorage } from '../kanji-mastery/storage';
import EnhancedStorageManager from '@/utils/storage';
import { DatabaseManager } from '@/utils/indexedDB';
import StudyListManager from '@/utils/studyListManager';

interface MigrationResult {
  feature: string;
  migrated: number;
  errors: number;
  errorDetails: string[];
}

export class StorageMigration {
  private static instance: StorageMigration;
  private dbManager: DatabaseManager;
  
  private constructor() {
    this.dbManager = new DatabaseManager();
  }

  static getInstance(): StorageMigration {
    if (!StorageMigration.instance) {
      StorageMigration.instance = new StorageMigration();
    }
    return StorageMigration.instance;
  }

  /**
   * Main migration method - migrates all features
   */
  async migrateAllData(): Promise<MigrationResult[]> {
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ User not logged in - skipping migration');
      return [];
    }

    console.log('🔄 Starting universal data migration...');
    
    const results: MigrationResult[] = [];

    // Migrate textbook vocabulary data
    results.push(await this.migrateTextbookVocabulary());
    
    // Migrate kanji mastery data  
    results.push(await this.migrateKanjiMastery());
    
    // Migrate study lists
    results.push(await this.migrateStudyLists());
    
    // Migrate user settings
    results.push(await this.migrateUserSettings());
    
    // Migrate game progress
    results.push(await this.migrateGameProgress());
    
    // Migrate achievements
    results.push(await this.migrateAchievements());

    // Summary
    const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    
    console.log(`✅ Migration complete: ${totalMigrated} items migrated, ${totalErrors} errors`);
    
    return results;
  }

  /**
   * Migrate textbook vocabulary progress and sessions
   */
  private async migrateTextbookVocabulary(): Promise<MigrationResult> {
    const result: MigrationResult = {
      feature: 'textbook_vocabulary',
      migrated: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      console.log('📚 Migrating textbook vocabulary data...');

      // Get existing progress from old storage
      const existingProgress = await this.getExistingIndexedDBData('progress');
      
      // Migrate progress items
      for (const progress of existingProgress) {
        try {
          await unifiedStorage.save(
            'textbook_vocabulary_progress', 
            progress.id, 
            progress,
            { skipSync: true } // Skip initial sync, let it sync naturally
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Progress ${progress.id}: ${error}`);
        }
      }

      // Get existing sessions
      const existingSessions = await this.getExistingIndexedDBData('sessions');
      
      // Migrate session items
      for (const session of existingSessions) {
        try {
          await unifiedStorage.save(
            'textbook_vocabulary_sessions',
            session.id,
            session,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Session ${session.id}: ${error}`);
        }
      }

      console.log(`📚 Textbook vocabulary: ${result.migrated} items migrated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Textbook vocabulary migration failed:', error);
      result.errorDetails.push(`General error: ${error}`);
    }

    return result;
  }

  /**
   * Migrate kanji mastery progress and sessions
   */
  private async migrateKanjiMastery(): Promise<MigrationResult> {
    const result: MigrationResult = {
      feature: 'kanji_mastery',
      migrated: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      console.log('㊗️ Migrating kanji mastery data...');

      // Get existing progress from Enhanced Storage Manager
      const progressData = await EnhancedStorageManager.loadData('kanji_mastery_progress');
      const sessionData = await EnhancedStorageManager.loadData('kanji_study_sessions');

      // Migrate progress
      if (progressData && Array.isArray(progressData)) {
        for (const progress of progressData) {
          try {
            await unifiedStorage.save(
              'kanji_mastery_progress',
              progress.id,
              progress,
              { skipSync: true }
            );
            result.migrated++;
          } catch (error) {
            result.errors++;
            result.errorDetails.push(`Progress ${progress.id}: ${error}`);
          }
        }
      }

      // Migrate sessions
      if (sessionData && Array.isArray(sessionData)) {
        for (const session of sessionData) {
          try {
            await unifiedStorage.save(
              'kanji_study_sessions',
              session.id,
              session,
              { skipSync: true }
            );
            result.migrated++;
          } catch (error) {
            result.errors++;
            result.errorDetails.push(`Session ${session.id}: ${error}`);
          }
        }
      }

      console.log(`㊗️ Kanji mastery: ${result.migrated} items migrated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Kanji mastery migration failed:', error);
      result.errorDetails.push(`General error: ${error}`);
    }

    return result;
  }

  /**
   * Migrate study lists and saved items
   */
  private async migrateStudyLists(): Promise<MigrationResult> {
    const result: MigrationResult = {
      feature: 'study_lists',
      migrated: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      console.log('📋 Migrating study lists...');

      // Get existing study lists
      const existingLists = await StudyListManager.getAllStudyLists();
      
      // Migrate lists
      for (const list of existingLists) {
        try {
          await unifiedStorage.save(
            'study_lists',
            list.id,
            list,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`List ${list.id}: ${error}`);
        }
      }

      // Get existing saved items
      const existingItems = await StudyListManager.getSavedStudyItems();
      
      // Migrate saved items
      for (const item of existingItems) {
        try {
          await unifiedStorage.save(
            'saved_study_items',
            item.id,
            item,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Item ${item.id}: ${error}`);
        }
      }

      console.log(`📋 Study lists: ${result.migrated} items migrated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Study lists migration failed:', error);
      result.errorDetails.push(`General error: ${error}`);
    }

    return result;
  }

  /**
   * Migrate user settings and preferences
   */
  private async migrateUserSettings(): Promise<MigrationResult> {
    const result: MigrationResult = {
      feature: 'user_settings',
      migrated: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      console.log('⚙️ Migrating user settings...');

      // Get existing settings
      const existingSettings = await EnhancedStorageManager.loadSettings();
      
      if (existingSettings) {
        try {
          await unifiedStorage.save(
            'user_settings',
            'user_settings',
            existingSettings,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Settings: ${error}`);
        }
      }

      // Get recently viewed items
      const recentlyViewed = await EnhancedStorageManager.getRecentlyViewedWordIds();
      
      if (recentlyViewed.length > 0) {
        try {
          await unifiedStorage.save(
            'recently_viewed',
            'recently_viewed',
            { items: recentlyViewed, updatedAt: new Date() },
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Recently viewed: ${error}`);
        }
      }

      console.log(`⚙️ User settings: ${result.migrated} items migrated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ User settings migration failed:', error);
      result.errorDetails.push(`General error: ${error}`);
    }

    return result;
  }

  /**
   * Migrate game progress from localStorage
   */
  private async migrateGameProgress(): Promise<MigrationResult> {
    const result: MigrationResult = {
      feature: 'game_progress',
      migrated: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      console.log('🎮 Migrating game progress...');

      // List of games to migrate
      const games = ['stroke_order_game', 'kanji_quest', 'kana_drop', 'sentence_scramble', 'memory_match'];
      
      for (const gameId of games) {
        try {
          // Check localStorage for game data
          const gameDataStr = localStorage.getItem(gameId);
          if (gameDataStr) {
            const gameData = JSON.parse(gameDataStr);
            
            await unifiedStorage.save(
              gameId,
              gameId,
              {
                ...gameData,
                gameId,
                migratedAt: new Date()
              },
              { skipSync: true }
            );
            result.migrated++;
            
            // Clean up old localStorage
            localStorage.removeItem(gameId);
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`${gameId}: ${error}`);
        }
      }

      console.log(`🎮 Game progress: ${result.migrated} items migrated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Game progress migration failed:', error);
      result.errorDetails.push(`General error: ${error}`);
    }

    return result;
  }

  /**
   * Migrate achievement progress
   */
  private async migrateAchievements(): Promise<MigrationResult> {
    const result: MigrationResult = {
      feature: 'achievements',
      migrated: 0,
      errors: 0,
      errorDetails: []
    };

    try {
      console.log('🏆 Migrating achievements...');

      // Get user stats
      const userStats = await EnhancedStorageManager.getUserStats();
      if (userStats) {
        try {
          await unifiedStorage.save(
            'user_stats',
            'user_stats',
            userStats,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`User stats: ${error}`);
        }
      }

      // Get unlocked achievements
      const unlockedAchievements = await EnhancedStorageManager.getUnlockedAchievements();
      for (const achievement of unlockedAchievements) {
        try {
          await unifiedStorage.save(
            'achievement_progress',
            achievement.id,
            achievement,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Achievement ${achievement.id}: ${error}`);
        }
      }

      // Get achievement progress
      const achievementProgress = await EnhancedStorageManager.getAchievementProgress();
      for (const progress of achievementProgress) {
        try {
          await unifiedStorage.save(
            'achievement_progress',
            `progress_${progress.achievementId}`,
            progress,
            { skipSync: true }
          );
          result.migrated++;
        } catch (error) {
          result.errors++;
          result.errorDetails.push(`Progress ${progress.achievementId}: ${error}`);
        }
      }

      console.log(`🏆 Achievements: ${result.migrated} items migrated, ${result.errors} errors`);
    } catch (error) {
      console.error('❌ Achievements migration failed:', error);
      result.errorDetails.push(`General error: ${error}`);
    }

    return result;
  }

  /**
   * Helper method to get data from IndexedDB
   */
  private async getExistingIndexedDBData(storeName: string): Promise<any[]> {
    try {
      return await this.dbManager.getAll(storeName as any) || [];
    } catch (error) {
      console.warn(`⚠️ Could not get existing data from ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    // Check if migration marker exists
    const migrationMarker = localStorage.getItem('unified_storage_migrated');
    if (migrationMarker) return false;

    // Check for existing data that needs migration
    const hasTextbookData = await this.hasExistingData('progress');
    const hasKanjiData = await EnhancedStorageManager.loadData('kanji_mastery_progress');
    const hasStudyLists = (await StudyListManager.getAllStudyLists()).length > 0;
    
    return hasTextbookData || !!hasKanjiData || hasStudyLists;
  }

  /**
   * Mark migration as complete
   */
  markMigrationComplete(): void {
    localStorage.setItem('unified_storage_migrated', Date.now().toString());
    console.log('✅ Migration marked as complete');
  }

  /**
   * Check if specific data exists
   */
  private async hasExistingData(storeName: string): Promise<boolean> {
    try {
      const count = await this.dbManager.count(storeName as any);
      return count > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const storageMigration = StorageMigration.getInstance();

/**
 * Auto-migration hook - run this on app startup
 */
export async function runAutoMigration(): Promise<void> {
  if (await storageMigration.needsMigration()) {
    console.log('🔄 Auto-migration starting...');
    const results = await storageMigration.migrateAllData();
    
    // Show summary to user (optional)
    const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
    if (totalMigrated > 0) {
      console.log(`✅ Auto-migration complete: ${totalMigrated} items migrated`);
      
      // Could show a toast notification here
      // toast.success(`Migrated ${totalMigrated} items to new sync system`);
    }
    
    storageMigration.markMigrationComplete();
  }
}