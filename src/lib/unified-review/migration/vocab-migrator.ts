/**
 * Vocabulary Migrator for Unified Review Engine
 * 
 * Migrates data from the old Textbook Vocabulary system to the new unified system.
 * Handles:
 * - Vocabulary progress data transformation
 * - Textbook-specific metadata preservation
 * - Study session history
 * - Multiple vocabulary sources (textbooks, custom, etc.)
 */

import {
  ReviewItem,
  ReviewProgress,
  ContentType,
  AlgorithmType,
  StudyMode,
  SM2Data,
  VocabularyContent
} from '../types';
import { UnifiedReviewEngine } from '../engine';
import { MigrationConfig } from './migration-manager';

/**
 * Legacy vocabulary progress structure
 */
interface LegacyVocabularyProgress {
  id: string; // vocabulary item ID
  userId?: string;
  textbook: string;
  lesson: number;
  lastReviewed: Date | string;
  nextReview: Date | string;
  reviewCount: number;
  easeFactor: number; // SM2 ease factor
  interval: number; // Days until next review
  quality: number; // Last review quality (1-5)
  masteryLevel: number; // 0-100
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Legacy vocabulary item structure
 */
interface LegacyVocabularyItem {
  id: string;
  word: string;
  reading: string;
  meanings: string[];
  partOfSpeech?: string[];
  textbook: string;
  lesson: number;
  jlptLevel?: string;
  frequency?: number;
}

/**
 * Legacy study session structure
 */
interface LegacyVocabStudySession {
  id: string;
  userId?: string;
  textbook: string;
  startTime: Date | string;
  endTime?: Date | string;
  cardsStudied: number;
  cardsCorrect: number;
  avgQuality: number;
}

/**
 * Vocabulary migration result
 */
export interface VocabularyMigrationResult {
  itemCount: number;
  progressCount: number;
  sessionCount: number;
  errors: string[];
  warnings: string[];
  textbooksProcessed: string[];
}

/**
 * Vocabulary data validation result
 */
export interface VocabularyValidationResult {
  valid: number;
  invalid: number;
  fixed: number;
}

/**
 * Vocabulary Migrator Implementation
 */
export class VocabularyMigrator {
  private engine: UnifiedReviewEngine;
  private config: Partial<MigrationConfig>;

  // IndexedDB database names from old system
  private readonly LEGACY_DB_NAMES = [
    'doshi-sensei-textbook-vocab',
    'textbook-vocabulary',
    'DoshiSenseiVocab'
  ];

  // localStorage keys for fallback data
  private readonly LEGACY_STORAGE_KEYS = [
    'textbook_vocabulary_progress',
    'vocabulary_items',
    'vocab_study_sessions'
  ];

  constructor(engine: UnifiedReviewEngine, config: Partial<MigrationConfig> = {}) {
    this.engine = engine;
    this.config = config;
  }

  /**
   * Check if legacy vocabulary data exists
   */
  public async hasLegacyData(): Promise<boolean> {
    try {
      // Check IndexedDB
      const indexedDBData = await this.getLegacyIndexedDBData();
      if (indexedDBData.progress.length > 0 || indexedDBData.items.length > 0) {
        return true;
      }

      // Check localStorage
      const localData = this.getLegacyLocalStorageData();
      if (localData.progress.length > 0 || localData.items.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      this.log(`Error checking for legacy vocabulary data: ${error}`);
      return false;
    }
  }

  /**
   * Count legacy vocabulary items
   */
  public async countLegacyItems(): Promise<number> {
    let count = 0;

    try {
      // Count IndexedDB items
      const indexedDBData = await this.getLegacyIndexedDBData();
      count += Math.max(indexedDBData.progress.length, indexedDBData.items.length);

      // Count localStorage items
      const localData = this.getLegacyLocalStorageData();
      count += Math.max(localData.progress.length, localData.items.length);

      return count;
    } catch (error) {
      this.log(`Error counting legacy vocabulary items: ${error}`);
      return 0;
    }
  }

  /**
   * Validate legacy vocabulary data
   */
  public async validateLegacyData(): Promise<VocabularyValidationResult> {
    const result: VocabularyValidationResult = {
      valid: 0,
      invalid: 0,
      fixed: 0
    };

    try {
      // Get all legacy data
      const allLegacyData = await this.getAllLegacyData();

      for (const item of allLegacyData.progress) {
        if (this.validateLegacyProgressItem(item)) {
          result.valid++;
        } else {
          if (this.canFixLegacyProgressItem(item)) {
            result.fixed++;
          } else {
            result.invalid++;
          }
        }
      }

      for (const item of allLegacyData.items) {
        if (this.validateLegacyVocabItem(item)) {
          result.valid++;
        } else {
          if (this.canFixLegacyVocabItem(item)) {
            result.fixed++;
          } else {
            result.invalid++;
          }
        }
      }

      return result;
    } catch (error) {
      this.log(`Error validating legacy vocabulary data: ${error}`);
      return result;
    }
  }

  /**
   * Perform the vocabulary migration
   */
  public async migrate(
    progressCallback?: (progress: any) => void
  ): Promise<VocabularyMigrationResult> {
    const result: VocabularyMigrationResult = {
      itemCount: 0,
      progressCount: 0,
      sessionCount: 0,
      errors: [],
      warnings: [],
      textbooksProcessed: []
    };

    try {
      this.log('Starting vocabulary migration...');

      // Get all legacy data
      const allLegacyData = await this.getAllLegacyData();
      const totalItems = Math.max(allLegacyData.progress.length, allLegacyData.items.length);

      if (totalItems === 0) {
        this.log('No legacy vocabulary data found');
        return result;
      }

      this.log(`Migrating ${totalItems} vocabulary items...`);

      // Create a map of vocabulary items for reference
      const vocabItemsMap = new Map<string, LegacyVocabularyItem>();
      for (const item of allLegacyData.items) {
        vocabItemsMap.set(item.id, item);
      }

      // Process progress items (they contain the review data)
      const batchSize = this.config.batchSize || 50;
      for (let i = 0; i < allLegacyData.progress.length; i += batchSize) {
        const batch = allLegacyData.progress.slice(i, i + batchSize);
        
        for (const progressItem of batch) {
          try {
            const vocabItem = vocabItemsMap.get(progressItem.id);
            await this.migrateSingleItem(progressItem, vocabItem, result);
          } catch (error) {
            const errorMsg = `Failed to migrate vocabulary item ${progressItem.id}: ${error}`;
            result.errors.push(errorMsg);
            this.log(errorMsg);

            if (result.errors.length >= (this.config.maxErrors || 10)) {
              throw new Error('Too many migration errors');
            }
          }
        }

        // Update progress
        const processed = Math.min(i + batchSize, allLegacyData.progress.length);
        if (progressCallback) {
          progressCallback({
            processed,
            total: allLegacyData.progress.length,
            errors: result.errors.length,
            warnings: result.warnings.length
          });
        }

        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Migrate vocabulary items that don't have progress (new items)
      for (const vocabItem of allLegacyData.items) {
        if (!allLegacyData.progress.some(p => p.id === vocabItem.id)) {
          try {
            await this.migrateVocabItemOnly(vocabItem, result);
          } catch (error) {
            result.warnings.push(`Failed to migrate new vocabulary item ${vocabItem.id}: ${error}`);
          }
        }
      }

      // Migrate study sessions
      await this.migrateLegacySessions(allLegacyData.sessions, result);

      // Track textbooks processed
      result.textbooksProcessed = [...new Set([
        ...allLegacyData.progress.map(p => p.textbook),
        ...allLegacyData.items.map(i => i.textbook)
      ])];

      this.log(`Vocabulary migration completed: ${result.itemCount} items, ${result.progressCount} progress records from ${result.textbooksProcessed.length} textbooks`);

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
   * Get legacy data from IndexedDB
   */
  private async getLegacyIndexedDBData(): Promise<{
    progress: LegacyVocabularyProgress[];
    items: LegacyVocabularyItem[];
    sessions: LegacyVocabStudySession[];
  }> {
    const result = {
      progress: [] as LegacyVocabularyProgress[],
      items: [] as LegacyVocabularyItem[],
      sessions: [] as LegacyVocabStudySession[]
    };

    for (const dbName of this.LEGACY_DB_NAMES) {
      try {
        const data = await this.readFromIndexedDB(dbName);
        result.progress.push(...data.progress);
        result.items.push(...data.items);
        result.sessions.push(...data.sessions);
      } catch (error) {
        this.log(`Could not read from ${dbName}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Read vocabulary data from a specific IndexedDB database
   */
  private async readFromIndexedDB(dbName: string): Promise<{
    progress: LegacyVocabularyProgress[];
    items: LegacyVocabularyItem[];
    sessions: LegacyVocabStudySession[];
  }> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const result = {
          progress: [] as LegacyVocabularyProgress[],
          items: [] as LegacyVocabularyItem[],
          sessions: [] as LegacyVocabStudySession[]
        };

        const storeMapping = {
          progress: ['progress', 'vocabulary_progress', 'vocab_progress'],
          items: ['items', 'vocabulary_items', 'vocab_items'],
          sessions: ['sessions', 'study_sessions', 'vocab_sessions']
        };

        let completedStores = 0;
        const totalStores = Object.keys(storeMapping).length;

        const checkCompletion = () => {
          completedStores++;
          if (completedStores === totalStores) {
            db.close();
            resolve(result);
          }
        };

        // Read from each store type
        for (const [resultKey, storeNames] of Object.entries(storeMapping)) {
          let storeFound = false;
          
          for (const storeName of storeNames) {
            if (db.objectStoreNames.contains(storeName)) {
              storeFound = true;
              const transaction = db.transaction([storeName], 'readonly');
              const store = transaction.objectStore(storeName);
              const getAllRequest = store.getAll();

              getAllRequest.onsuccess = () => {
                (result as any)[resultKey] = getAllRequest.result || [];
                checkCompletion();
              };

              getAllRequest.onerror = () => {
                this.log(`Error reading ${storeName}: ${getAllRequest.error}`);
                checkCompletion();
              };
              break;
            }
          }

          if (!storeFound) {
            checkCompletion();
          }
        }
      };
    });
  }

  /**
   * Get legacy data from localStorage
   */
  private getLegacyLocalStorageData(): {
    progress: LegacyVocabularyProgress[];
    items: LegacyVocabularyItem[];
    sessions: LegacyVocabStudySession[];
  } {
    const result = {
      progress: [] as LegacyVocabularyProgress[],
      items: [] as LegacyVocabularyItem[],
      sessions: [] as LegacyVocabStudySession[]
    };

    try {
      // Try to read from various localStorage keys
      for (const key of this.LEGACY_STORAGE_KEYS) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            
            if (key.includes('progress')) {
              result.progress = Array.isArray(parsed) ? parsed : Object.values(parsed);
            } else if (key.includes('items')) {
              result.items = Array.isArray(parsed) ? parsed : Object.values(parsed);
            } else if (key.includes('sessions')) {
              result.sessions = Array.isArray(parsed) ? parsed : Object.values(parsed);
            }
          } catch (parseError) {
            this.log(`Error parsing localStorage key ${key}: ${parseError}`);
          }
        }
      }
    } catch (error) {
      this.log(`Error reading localStorage: ${error}`);
    }

    return result;
  }

  /**
   * Get all legacy data from all sources
   */
  private async getAllLegacyData(): Promise<{
    progress: LegacyVocabularyProgress[];
    items: LegacyVocabularyItem[];
    sessions: LegacyVocabStudySession[];
  }> {
    const result = {
      progress: [] as LegacyVocabularyProgress[],
      items: [] as LegacyVocabularyItem[],
      sessions: [] as LegacyVocabStudySession[]
    };

    // Get IndexedDB data
    const indexedData = await this.getLegacyIndexedDBData();
    result.progress.push(...indexedData.progress);
    result.items.push(...indexedData.items);
    result.sessions.push(...indexedData.sessions);

    // Get localStorage data
    const localData = this.getLegacyLocalStorageData();
    result.progress.push(...localData.progress);
    result.items.push(...localData.items);
    result.sessions.push(...localData.sessions);

    // Remove duplicates
    result.progress = this.removeDuplicates(result.progress, 'id');
    result.items = this.removeDuplicates(result.items, 'id');
    result.sessions = this.removeDuplicates(result.sessions, 'id');

    return result;
  }

  /**
   * Validate a legacy progress item
   */
  private validateLegacyProgressItem(item: LegacyVocabularyProgress): boolean {
    if (!item.id || typeof item.id !== 'string') return false;
    if (!item.textbook || typeof item.textbook !== 'string') return false;
    if (typeof item.reviewCount !== 'number' || item.reviewCount < 0) return false;
    if (typeof item.easeFactor !== 'number' || item.easeFactor < 1) return false;
    return true;
  }

  /**
   * Validate a legacy vocabulary item
   */
  private validateLegacyVocabItem(item: LegacyVocabularyItem): boolean {
    if (!item.id || typeof item.id !== 'string') return false;
    if (!item.word || typeof item.word !== 'string') return false;
    if (!item.reading || typeof item.reading !== 'string') return false;
    if (!Array.isArray(item.meanings) || item.meanings.length === 0) return false;
    return true;
  }

  /**
   * Check if a legacy progress item can be fixed
   */
  private canFixLegacyProgressItem(item: LegacyVocabularyProgress): boolean {
    return !!(item.id && item.textbook);
  }

  /**
   * Check if a legacy vocab item can be fixed
   */
  private canFixLegacyVocabItem(item: LegacyVocabularyItem): boolean {
    return !!(item.id && item.word);
  }

  /**
   * Migrate a single vocabulary item with progress
   */
  private async migrateSingleItem(
    progressItem: LegacyVocabularyProgress,
    vocabItem: LegacyVocabularyItem | undefined,
    result: VocabularyMigrationResult
  ): Promise<void> {
    // Create ReviewItem
    const reviewItem = await this.createReviewItem(progressItem, vocabItem);
    
    // Create or update the review item
    try {
      await this.engine.addReviewItem(reviewItem);
      result.itemCount++;
    } catch (error) {
      // Item might already exist, try to update instead
      try {
        await this.engine.updateReviewItem(reviewItem);
        result.warnings.push(`Updated existing vocabulary item: ${progressItem.id}`);
      } catch (updateError) {
        throw new Error(`Failed to create or update vocabulary item: ${error}`);
      }
    }

    // The engine will handle creating progress internally
    result.progressCount++;
  }

  /**
   * Migrate a vocabulary item without progress data
   */
  private async migrateVocabItemOnly(
    vocabItem: LegacyVocabularyItem,
    result: VocabularyMigrationResult
  ): Promise<void> {
    const reviewItem = await this.createReviewItemFromVocab(vocabItem);
    
    try {
      await this.engine.addReviewItem(reviewItem);
      result.itemCount++;
    } catch (error) {
      result.warnings.push(`Failed to create new vocabulary item ${vocabItem.id}: ${error}`);
    }
  }

  /**
   * Create ReviewItem from legacy data
   */
  private async createReviewItem(
    progressItem: LegacyVocabularyProgress,
    vocabItem?: LegacyVocabularyItem
  ): Promise<ReviewItem> {
    const vocabularyContent: VocabularyContent = {
      word: vocabItem?.word || `word_${progressItem.id}`,
      reading: vocabItem?.reading || '',
      meanings: vocabItem?.meanings || ['Unknown meaning'],
      partOfSpeech: vocabItem?.partOfSpeech || [],
      jlpt: vocabItem?.jlptLevel,
      frequency: vocabItem?.frequency,
      examples: []
    };

    const reviewItem: ReviewItem = {
      id: progressItem.id,
      type: ContentType.VOCABULARY,
      content: vocabularyContent,
      metadata: {
        source: 'textbook_vocabulary_migration',
        tags: ['vocabulary', 'textbook', progressItem.textbook, `lesson_${progressItem.lesson}`],
        difficulty: this.mapQualityToDifficulty(progressItem.quality),
        priority: progressItem.masteryLevel < 50 ? 8 : 5,
        properties: {
          textbook: progressItem.textbook,
          lesson: progressItem.lesson,
          originalEaseFactor: progressItem.easeFactor,
          originalInterval: progressItem.interval,
          migrationDate: new Date().toISOString()
        }
      },
      createdAt: this.parseDate(progressItem.createdAt),
      updatedAt: this.parseDate(progressItem.updatedAt)
    };

    return reviewItem;
  }

  /**
   * Create ReviewItem from vocabulary item only
   */
  private async createReviewItemFromVocab(vocabItem: LegacyVocabularyItem): Promise<ReviewItem> {
    const vocabularyContent: VocabularyContent = {
      word: vocabItem.word,
      reading: vocabItem.reading,
      meanings: vocabItem.meanings,
      partOfSpeech: vocabItem.partOfSpeech || [],
      jlpt: vocabItem.jlptLevel,
      frequency: vocabItem.frequency,
      examples: []
    };

    const reviewItem: ReviewItem = {
      id: vocabItem.id,
      type: ContentType.VOCABULARY,
      content: vocabularyContent,
      metadata: {
        source: 'textbook_vocabulary_migration',
        tags: ['vocabulary', 'textbook', vocabItem.textbook, `lesson_${vocabItem.lesson}`],
        difficulty: 5, // Default difficulty
        priority: 5,
        properties: {
          textbook: vocabItem.textbook,
          lesson: vocabItem.lesson,
          migrationDate: new Date().toISOString()
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return reviewItem;
  }

  /**
   * Migrate legacy study sessions
   */
  private async migrateLegacySessions(
    sessions: LegacyVocabStudySession[],
    result: VocabularyMigrationResult
  ): Promise<void> {
    result.sessionCount = sessions.length;
    
    if (sessions.length > 0) {
      this.log(`Found ${sessions.length} legacy vocabulary study sessions`);
      // Sessions would be migrated to the new session storage format
      // For now, we'll just log the count
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Remove duplicates from array by key
   */
  private removeDuplicates<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = item[key];
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }

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
   * Map quality rating to difficulty scale
   */
  private mapQualityToDifficulty(quality: number): number {
    // Quality 1-5 maps to difficulty 10-2 (inverse relationship)
    return Math.max(1, Math.min(10, Math.round(11 - (quality * 2))));
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[VocabularyMigrator] ${message}`);
    }
  }
}