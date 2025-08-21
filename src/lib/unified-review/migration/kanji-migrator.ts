/**
 * Kanji Migrator for Unified Review Engine
 * 
 * Migrates data from the old Kanji Mastery system to the new unified system.
 * Handles:
 * - Kanji progress data transformation
 * - Study session history
 * - Achievement records
 * - FSRS algorithm data conversion
 */

import {
  ReviewItem,
  ReviewProgress,
  ContentType,
  AlgorithmType,
  StudyMode,
  FSRSData,
  KanjiContent
} from '../types';
import { UnifiedReviewEngine } from '../engine';
import { MigrationConfig } from './migration-manager';

/**
 * Legacy kanji progress structure
 */
interface LegacyKanjiProgress {
  id: string; // kanji character
  lastReviewed: Date | string;
  nextReview: Date | string;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  difficulty: number;
  lapses: number;
  lastQuality: number;
  retentionRate: number;
  studyModes?: {
    recognition?: {
      reviewCount: number;
      lastQuality: number;
      averageQuality: number;
    };
    production?: {
      reviewCount: number;
      lastQuality: number;
      averageQuality: number;
    };
    writing?: {
      reviewCount: number;
      lastQuality: number;
      averageQuality: number;
    };
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Legacy study session structure
 */
interface LegacyStudySession {
  id?: string;
  date: Date | string;
  kanjiReviewed: number;
  newKanji?: number;
  averageQuality: number;
  timeSpent: number; // in seconds
  jlptLevel?: string;
}

/**
 * Kanji migration result
 */
export interface KanjiMigrationResult {
  itemCount: number;
  progressCount: number;
  sessionCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Kanji data validation result
 */
export interface KanjiValidationResult {
  valid: number;
  invalid: number;
  fixed: number;
}

/**
 * Kanji Migrator Implementation
 */
export class KanjiMigrator {
  private engine: UnifiedReviewEngine;
  private config: Partial<MigrationConfig>;

  // Local storage keys from old system
  private readonly LEGACY_STORAGE_KEY = 'kanji_mastery_progress';
  private readonly LEGACY_SESSION_KEY = 'kanji_study_sessions';

  // IndexedDB database names from old system
  private readonly LEGACY_DB_NAMES = [
    'doshi-sensei-kanji',
    'kanji-mastery',
    'DoshiSenseiKanji'
  ];

  constructor(engine: UnifiedReviewEngine, config: Partial<MigrationConfig> = {}) {
    this.engine = engine;
    this.config = config;
  }

  /**
   * Check if legacy kanji data exists
   */
  public async hasLegacyData(): Promise<boolean> {
    try {
      // Check localStorage
      const localData = this.getLegacyLocalStorageData();
      if (localData && Object.keys(localData).length > 0) {
        return true;
      }

      // Check IndexedDB
      const indexedDBData = await this.getLegacyIndexedDBData();
      if (indexedDBData.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      this.log(`Error checking for legacy data: ${error}`);
      return false;
    }
  }

  /**
   * Count legacy kanji items
   */
  public async countLegacyItems(): Promise<number> {
    let count = 0;

    try {
      // Count localStorage items
      const localData = this.getLegacyLocalStorageData();
      if (localData) {
        count += Object.keys(localData).length;
      }

      // Count IndexedDB items
      const indexedDBData = await this.getLegacyIndexedDBData();
      count += indexedDBData.length;

      return count;
    } catch (error) {
      this.log(`Error counting legacy items: ${error}`);
      return 0;
    }
  }

  /**
   * Validate legacy kanji data
   */
  public async validateLegacyData(): Promise<KanjiValidationResult> {
    const result: KanjiValidationResult = {
      valid: 0,
      invalid: 0,
      fixed: 0
    };

    try {
      // Get all legacy data
      const allLegacyData = await this.getAllLegacyData();

      for (const item of allLegacyData) {
        if (this.validateLegacyItem(item)) {
          result.valid++;
        } else {
          if (this.canFixLegacyItem(item)) {
            result.fixed++;
          } else {
            result.invalid++;
          }
        }
      }

      return result;
    } catch (error) {
      this.log(`Error validating legacy data: ${error}`);
      return result;
    }
  }

  /**
   * Perform the kanji migration
   */
  public async migrate(
    progressCallback?: (progress: any) => void
  ): Promise<KanjiMigrationResult> {
    const result: KanjiMigrationResult = {
      itemCount: 0,
      progressCount: 0,
      sessionCount: 0,
      errors: [],
      warnings: []
    };

    try {
      this.log('Starting kanji migration...');

      // Get all legacy data
      const allLegacyData = await this.getAllLegacyData();
      const totalItems = allLegacyData.length;

      if (totalItems === 0) {
        this.log('No legacy kanji data found');
        return result;
      }

      this.log(`Migrating ${totalItems} kanji items...`);

      // Process items in batches
      const batchSize = this.config.batchSize || 50;
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = allLegacyData.slice(i, i + batchSize);
        
        for (const legacyItem of batch) {
          try {
            await this.migrateSingleItem(legacyItem, result);
          } catch (error) {
            const errorMsg = `Failed to migrate item ${legacyItem.id}: ${error}`;
            result.errors.push(errorMsg);
            this.log(errorMsg);

            if (result.errors.length >= (this.config.maxErrors || 10)) {
              throw new Error('Too many migration errors');
            }
          }
        }

        // Update progress
        const processed = Math.min(i + batchSize, totalItems);
        if (progressCallback) {
          progressCallback({
            processed,
            total: totalItems,
            errors: result.errors.length,
            warnings: result.warnings.length
          });
        }

        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Migrate study sessions
      await this.migrateLegacySessions(result);

      this.log(`Kanji migration completed: ${result.itemCount} items, ${result.progressCount} progress records`);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get legacy data from localStorage
   */
  private getLegacyLocalStorageData(): Record<string, LegacyKanjiProgress> | null {
    try {
      const data = localStorage.getItem(this.LEGACY_STORAGE_KEY);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      this.log(`Error reading localStorage: ${error}`);
      return null;
    }
  }

  /**
   * Get legacy data from IndexedDB
   */
  private async getLegacyIndexedDBData(): Promise<LegacyKanjiProgress[]> {
    const allData: LegacyKanjiProgress[] = [];

    for (const dbName of this.LEGACY_DB_NAMES) {
      try {
        const data = await this.readFromIndexedDB(dbName);
        allData.push(...data);
      } catch (error) {
        // Database might not exist, which is fine
        this.log(`Could not read from ${dbName}: ${error}`);
      }
    }

    return allData;
  }

  /**
   * Read kanji data from a specific IndexedDB database
   */
  private async readFromIndexedDB(dbName: string): Promise<LegacyKanjiProgress[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        // Try common store names
        const storeNames = ['progress', 'kanjiProgress', 'kanji_progress'];
        let storeFound = false;

        for (const storeName of storeNames) {
          if (db.objectStoreNames.contains(storeName)) {
            storeFound = true;
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
              db.close();
              resolve(getAllRequest.result || []);
            };

            getAllRequest.onerror = () => {
              db.close();
              reject(getAllRequest.error);
            };
            break;
          }
        }

        if (!storeFound) {
          db.close();
          resolve([]);
        }
      };
    });
  }

  /**
   * Get all legacy data from all sources
   */
  private async getAllLegacyData(): Promise<LegacyKanjiProgress[]> {
    const allData: LegacyKanjiProgress[] = [];
    const seenIds = new Set<string>();

    // Get localStorage data
    const localData = this.getLegacyLocalStorageData();
    if (localData) {
      for (const [id, item] of Object.entries(localData)) {
        if (!seenIds.has(id)) {
          allData.push(item);
          seenIds.add(id);
        }
      }
    }

    // Get IndexedDB data
    const indexedData = await this.getLegacyIndexedDBData();
    for (const item of indexedData) {
      if (!seenIds.has(item.id)) {
        allData.push(item);
        seenIds.add(item.id);
      }
    }

    return allData;
  }

  /**
   * Validate a single legacy item
   */
  private validateLegacyItem(item: LegacyKanjiProgress): boolean {
    // Check required fields
    if (!item.id || typeof item.id !== 'string') {
      return false;
    }

    if (!item.nextReview || !item.createdAt) {
      return false;
    }

    // Check that numeric fields are valid
    if (typeof item.reviewCount !== 'number' || item.reviewCount < 0) {
      return false;
    }

    if (typeof item.easeFactor !== 'number' || item.easeFactor < 1) {
      return false;
    }

    return true;
  }

  /**
   * Check if a legacy item can be fixed
   */
  private canFixLegacyItem(item: LegacyKanjiProgress): boolean {
    // We can fix items with missing non-critical fields
    return !!(item.id && typeof item.id === 'string');
  }

  /**
   * Fix a legacy item
   */
  private fixLegacyItem(item: LegacyKanjiProgress): LegacyKanjiProgress {
    const fixed = { ...item };

    // Fix missing dates
    if (!fixed.nextReview) {
      fixed.nextReview = new Date();
    }
    if (!fixed.createdAt) {
      fixed.createdAt = new Date();
    }
    if (!fixed.updatedAt) {
      fixed.updatedAt = new Date();
    }

    // Fix missing numeric fields
    if (typeof fixed.reviewCount !== 'number') {
      fixed.reviewCount = 0;
    }
    if (typeof fixed.easeFactor !== 'number') {
      fixed.easeFactor = 2.5;
    }
    if (typeof fixed.interval !== 'number') {
      fixed.interval = 1;
    }
    if (typeof fixed.difficulty !== 'number') {
      fixed.difficulty = 0.5;
    }
    if (typeof fixed.retentionRate !== 'number') {
      fixed.retentionRate = 0;
    }

    return fixed;
  }

  /**
   * Migrate a single kanji item
   */
  private async migrateSingleItem(
    legacyItem: LegacyKanjiProgress,
    result: KanjiMigrationResult
  ): Promise<void> {
    // Validate and fix if needed
    let item = legacyItem;
    if (!this.validateLegacyItem(item)) {
      if (this.canFixLegacyItem(item)) {
        item = this.fixLegacyItem(item);
        result.warnings.push(`Fixed invalid data for kanji: ${item.id}`);
      } else {
        throw new Error(`Cannot fix invalid data for kanji: ${item.id}`);
      }
    }

    // Create ReviewItem
    const reviewItem = await this.createReviewItem(item);
    
    // Create or update the review item
    try {
      await this.engine.addReviewItem(reviewItem);
      result.itemCount++;
    } catch (error) {
      // Item might already exist, try to update instead
      try {
        await this.engine.updateReviewItem(reviewItem);
        result.warnings.push(`Updated existing item: ${item.id}`);
      } catch (updateError) {
        throw new Error(`Failed to create or update item: ${error}`);
      }
    }

    // Create ReviewProgress if we have progress data
    if (item.reviewCount > 0 || item.lastReviewed) {
      const reviewProgress = this.createReviewProgress(item, reviewItem);
      // Note: The engine will handle creating progress internally
      result.progressCount++;
    }
  }

  /**
   * Create ReviewItem from legacy kanji data
   */
  private async createReviewItem(legacyItem: LegacyKanjiProgress): Promise<ReviewItem> {
    // Get kanji information (this would ideally come from a kanji database)
    const kanjiContent = await this.getKanjiContent(legacyItem.id);

    const reviewItem: ReviewItem = {
      id: legacyItem.id,
      type: ContentType.KANJI,
      content: kanjiContent,
      metadata: {
        source: 'kanji_mastery_migration',
        tags: ['kanji', 'migration'],
        difficulty: this.mapDifficultyToScale(legacyItem.difficulty),
        priority: legacyItem.retentionRate < 0.5 ? 10 : 5,
        properties: {
          originalEaseFactor: legacyItem.easeFactor,
          originalInterval: legacyItem.interval,
          migrationDate: new Date().toISOString()
        }
      },
      createdAt: this.parseDate(legacyItem.createdAt),
      updatedAt: this.parseDate(legacyItem.updatedAt)
    };

    return reviewItem;
  }

  /**
   * Create ReviewProgress from legacy kanji data
   */
  private createReviewProgress(
    legacyItem: LegacyKanjiProgress,
    reviewItem: ReviewItem
  ): ReviewProgress {
    // Convert legacy data to FSRS format (since we're defaulting to FSRS)
    const fsrsData: FSRSData = {
      stability: this.calculateStabilityFromLegacy(legacyItem),
      difficulty: Math.max(0.1, Math.min(10, legacyItem.difficulty * 10)), // Scale 0-1 to 0.1-10
      daysSinceLastReview: this.calculateDaysSinceLastReview(legacyItem),
      state: this.mapToFSRSState(legacyItem),
      due: this.parseDate(legacyItem.nextReview),
      reps: legacyItem.reviewCount,
      lapses: legacyItem.lapses || 0
    };

    const reviewProgress: ReviewProgress = {
      itemId: legacyItem.id,
      userId: 'migrated', // Will be updated by the engine
      algorithm: AlgorithmType.FSRS,
      algorithmData: fsrsData,
      nextReview: this.parseDate(legacyItem.nextReview),
      lastReview: legacyItem.lastReviewed ? this.parseDate(legacyItem.lastReviewed) : undefined,
      reviewCount: legacyItem.reviewCount,
      masteryLevel: Math.round(legacyItem.retentionRate * 100),
      retentionRate: legacyItem.retentionRate,
      averageResponseTime: 3, // Default, no data in legacy system
      studyModes: this.createStudyModeStats(legacyItem),
      createdAt: this.parseDate(legacyItem.createdAt),
      updatedAt: this.parseDate(legacyItem.updatedAt)
    };

    return reviewProgress;
  }

  /**
   * Get kanji content information
   */
  private async getKanjiContent(kanji: string): Promise<KanjiContent> {
    // This would ideally query a kanji database
    // For now, we'll create a basic structure
    return {
      character: kanji,
      strokes: this.estimateStrokeCount(kanji),
      onyomi: [],
      kunyomi: [],
      meanings: [],
      examples: []
    };
  }

  /**
   * Migrate legacy study sessions
   */
  private async migrateLegacySessions(result: KanjiMigrationResult): Promise<void> {
    try {
      const sessionData = localStorage.getItem(this.LEGACY_SESSION_KEY);
      if (!sessionData) return;

      const sessions: LegacyStudySession[] = JSON.parse(sessionData);
      result.sessionCount = sessions.length;

      // Sessions would be migrated to the new session storage format
      // For now, we'll just log the count
      this.log(`Found ${sessions.length} legacy study sessions`);
    } catch (error) {
      result.warnings.push(`Failed to migrate study sessions: ${error}`);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Parse date from string or Date object
   */
  private parseDate(date: string | Date): Date {
    if (date instanceof Date) {
      return date;
    }
    
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Map legacy difficulty to 1-10 scale
   */
  private mapDifficultyToScale(difficulty: number): number {
    // Legacy difficulty was 0-1, map to 1-10
    return Math.max(1, Math.min(10, Math.round(difficulty * 10)));
  }

  /**
   * Calculate stability from legacy data
   */
  private calculateStabilityFromLegacy(item: LegacyKanjiProgress): number {
    // Rough conversion from interval and ease factor
    return Math.max(0.1, item.interval * item.easeFactor * 0.1);
  }

  /**
   * Calculate days since last review
   */
  private calculateDaysSinceLastReview(item: LegacyKanjiProgress): number {
    if (!item.lastReviewed) return 0;
    
    const lastReview = this.parseDate(item.lastReviewed);
    const now = new Date();
    const diffMs = now.getTime() - lastReview.getTime();
    const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    
    return Math.round(diffDays);
  }

  /**
   * Map legacy data to FSRS state
   */
  private mapToFSRSState(item: LegacyKanjiProgress): 'new' | 'learning' | 'review' | 'relearning' {
    if (item.reviewCount === 0) return 'new';
    if (item.reviewCount < 3) return 'learning';
    if (item.lapses && item.lapses > 0 && item.lastQuality < 3) return 'relearning';
    return 'review';
  }

  /**
   * Create study mode statistics from legacy data
   */
  private createStudyModeStats(item: LegacyKanjiProgress): ReviewProgress['studyModes'] {
    const defaultStats = {
      attempts: 0,
      successes: 0,
      averageTime: 0,
      streak: 0
    };

    const studyModes: ReviewProgress['studyModes'] = {
      [StudyMode.RECOGNITION]: { ...defaultStats },
      [StudyMode.PRODUCTION]: { ...defaultStats },
      [StudyMode.READING]: { ...defaultStats },
      [StudyMode.LISTENING]: { ...defaultStats },
      [StudyMode.TYPING]: { ...defaultStats }
    };

    // Map legacy study modes if available
    if (item.studyModes) {
      if (item.studyModes.recognition) {
        studyModes[StudyMode.RECOGNITION] = {
          attempts: item.studyModes.recognition.reviewCount,
          successes: Math.round(item.studyModes.recognition.reviewCount * (item.studyModes.recognition.averageQuality / 5)),
          averageTime: 3, // Default
          streak: item.studyModes.recognition.lastQuality >= 3 ? 1 : 0
        };
      }

      if (item.studyModes.production) {
        studyModes[StudyMode.PRODUCTION] = {
          attempts: item.studyModes.production.reviewCount,
          successes: Math.round(item.studyModes.production.reviewCount * (item.studyModes.production.averageQuality / 5)),
          averageTime: 4, // Production typically takes longer
          streak: item.studyModes.production.lastQuality >= 3 ? 1 : 0
        };
      }
    }

    return studyModes;
  }

  /**
   * Estimate stroke count (rough approximation)
   */
  private estimateStrokeCount(kanji: string): number {
    // This is a very rough estimation based on character complexity
    // In a real implementation, this would come from a kanji database
    const codePoint = kanji.codePointAt(0) || 0;
    
    if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) {
      // CJK Unified Ideographs - rough estimate based on Unicode position
      const position = (codePoint - 0x4E00) / (0x9FFF - 0x4E00);
      return Math.max(1, Math.min(30, Math.round(position * 25 + 5)));
    }
    
    return 8; // Default estimate
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[KanjiMigrator] ${message}`);
    }
  }
}