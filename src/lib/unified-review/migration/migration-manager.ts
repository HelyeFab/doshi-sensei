/**
 * Migration Manager for Unified Review Engine
 * 
 * Orchestrates the migration of data from the old fragmented systems
 * to the new unified review system. Handles:
 * - Kanji Mastery system migration
 * - Textbook Vocabulary migration  
 * - Legacy flashcard systems
 * - Data validation and cleanup
 */

import { ContentType, ReviewItem, ReviewProgress, AlgorithmType, StudyMode } from '../types';
import { UnifiedReviewEngine } from '../engine';
import { KanjiMigrator } from './kanji-migrator';
import { VocabularyMigrator } from './vocab-migrator';

/**
 * Migration configuration options
 */
export interface MigrationConfig {
  /** Enable dry run mode (no actual migration) */
  dryRun?: boolean;
  
  /** Batch size for migration operations */
  batchSize?: number;
  
  /** Skip validation for faster migration */
  skipValidation?: boolean;
  
  /** Maximum errors before aborting */
  maxErrors?: number;
  
  /** Debug output */
  debug?: boolean;
}

/**
 * Migration progress information
 */
export interface MigrationProgress {
  /** Current phase */
  phase: string;
  
  /** Items processed */
  processed: number;
  
  /** Total items to process */
  total: number;
  
  /** Percentage complete */
  percentage: number;
  
  /** Current status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** Error count */
  errors: number;
  
  /** Warnings count */
  warnings: number;
  
  /** Estimated time remaining (seconds) */
  estimatedTimeRemaining?: number;
}

/**
 * Migration result summary
 */
export interface MigrationResult {
  /** Overall success */
  success: boolean;
  
  /** Migration summary */
  summary: {
    kanjiItems: number;
    vocabularyItems: number;
    flashcardItems: number;
    totalItems: number;
    totalProgress: number;
    migrationTime: number;
  };
  
  /** Errors encountered */
  errors: string[];
  
  /** Warnings generated */
  warnings: string[];
  
  /** Data validation results */
  validation?: {
    valid: number;
    invalid: number;
    fixed: number;
  };
}

/**
 * Legacy system identifiers
 */
export enum LegacySystem {
  KANJI_MASTERY = 'kanji_mastery',
  TEXTBOOK_VOCABULARY = 'textbook_vocabulary',
  CUSTOM_FLASHCARDS = 'custom_flashcards',
  OLD_SPACED_REPETITION = 'old_spaced_repetition'
}

/**
 * Default migration configuration
 */
const DEFAULT_CONFIG: Required<MigrationConfig> = {
  dryRun: false,
  batchSize: 50,
  skipValidation: false,
  maxErrors: 10,
  debug: false
};

/**
 * Migration Manager Implementation
 */
export class MigrationManager {
  private config: Required<MigrationConfig>;
  private engine: UnifiedReviewEngine;
  private kanjiMigrator: KanjiMigrator;
  private vocabularyMigrator: VocabularyMigrator;
  
  // Progress tracking
  private currentProgress: MigrationProgress;
  private progressCallback?: (progress: MigrationProgress) => void;
  private startTime: number = 0;
  private cancelled = false;

  constructor(
    engine: UnifiedReviewEngine,
    config: Partial<MigrationConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.engine = engine;
    this.kanjiMigrator = new KanjiMigrator(engine, config);
    this.vocabularyMigrator = new VocabularyMigrator(engine, config);
    
    this.currentProgress = {
      phase: 'idle',
      processed: 0,
      total: 0,
      percentage: 0,
      status: 'running',
      errors: 0,
      warnings: 0
    };
  }

  /**
   * Start the complete migration process
   */
  public async migrate(
    systems: LegacySystem[] = Object.values(LegacySystem),
    progressCallback?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    this.progressCallback = progressCallback;
    this.startTime = Date.now();
    this.cancelled = false;

    const result: MigrationResult = {
      success: false,
      summary: {
        kanjiItems: 0,
        vocabularyItems: 0,
        flashcardItems: 0,
        totalItems: 0,
        totalProgress: 0,
        migrationTime: 0
      },
      errors: [],
      warnings: []
    };

    try {
      this.log('Starting migration process...');
      
      // Phase 1: Discovery and analysis
      await this.updateProgress('Discovery', 0, 100);
      const discoveryResults = await this.discoverLegacyData(systems);
      
      if (discoveryResults.totalItems === 0) {
        this.log('No legacy data found to migrate');
        result.success = true;
        return result;
      }

      this.log(`Found ${discoveryResults.totalItems} items to migrate`);
      
      // Phase 2: Pre-migration validation
      if (!this.config.skipValidation) {
        await this.updateProgress('Validation', 0, discoveryResults.totalItems);
        const validationResults = await this.validateLegacyData(discoveryResults);
        result.validation = validationResults;
        
        if (validationResults.invalid > this.config.maxErrors) {
          throw new Error(`Too many validation errors: ${validationResults.invalid}`);
        }
      }

      // Phase 3: Migration execution
      await this.updateProgress('Migration', 0, discoveryResults.totalItems);
      
      for (const system of systems) {
        if (this.cancelled) break;
        
        switch (system) {
          case LegacySystem.KANJI_MASTERY:
            if (discoveryResults.kanjiItems > 0) {
              const kanjiResult = await this.kanjiMigrator.migrate(
                (progress) => this.updateMigratorProgress(progress)
              );
              result.summary.kanjiItems = kanjiResult.itemCount;
              result.summary.totalProgress += kanjiResult.progressCount;
              result.errors.push(...kanjiResult.errors);
              result.warnings.push(...kanjiResult.warnings);
            }
            break;
            
          case LegacySystem.TEXTBOOK_VOCABULARY:
            if (discoveryResults.vocabularyItems > 0) {
              const vocabResult = await this.vocabularyMigrator.migrate(
                (progress) => this.updateMigratorProgress(progress)
              );
              result.summary.vocabularyItems = vocabResult.itemCount;
              result.summary.totalProgress += vocabResult.progressCount;
              result.errors.push(...vocabResult.errors);
              result.warnings.push(...vocabResult.warnings);
            }
            break;
            
          // Additional migrators would be handled here
          default:
            result.warnings.push(`Migrator not implemented for system: ${system}`);
        }
      }

      // Phase 4: Post-migration validation
      if (!this.config.skipValidation) {
        await this.updateProgress('Post-validation', 0, 100);
        await this.validateMigratedData(result);
      }

      // Phase 5: Cleanup and optimization
      await this.updateProgress('Cleanup', 0, 100);
      await this.performCleanup();

      result.summary.totalItems = result.summary.kanjiItems + result.summary.vocabularyItems + result.summary.flashcardItems;
      result.summary.migrationTime = (Date.now() - this.startTime) / 1000;
      result.success = result.errors.length === 0;

      await this.updateProgress('Completed', 100, 100);
      this.log(`Migration completed in ${result.summary.migrationTime}s`);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      result.success = false;
      
      this.currentProgress.status = 'failed';
      this.notifyProgress();
      
      throw error;
    }
  }

  /**
   * Cancel the migration process
   */
  public cancel(): void {
    this.cancelled = true;
    this.currentProgress.status = 'cancelled';
    this.notifyProgress();
    this.log('Migration cancelled by user');
  }

  /**
   * Get current migration progress
   */
  public getProgress(): MigrationProgress {
    return { ...this.currentProgress };
  }

  /**
   * Check if migration is needed
   */
  public async checkMigrationNeeded(): Promise<{
    needed: boolean;
    systems: LegacySystem[];
    itemCount: number;
  }> {
    const systems: LegacySystem[] = [];
    let itemCount = 0;

    // Check each legacy system
    if (await this.kanjiMigrator.hasLegacyData()) {
      systems.push(LegacySystem.KANJI_MASTERY);
      itemCount += await this.kanjiMigrator.countLegacyItems();
    }

    if (await this.vocabularyMigrator.hasLegacyData()) {
      systems.push(LegacySystem.TEXTBOOK_VOCABULARY);
      itemCount += await this.vocabularyMigrator.countLegacyItems();
    }

    return {
      needed: systems.length > 0,
      systems,
      itemCount
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Discover legacy data across all systems
   */
  private async discoverLegacyData(systems: LegacySystem[]): Promise<{
    kanjiItems: number;
    vocabularyItems: number;
    flashcardItems: number;
    totalItems: number;
  }> {
    let kanjiItems = 0;
    let vocabularyItems = 0;
    let flashcardItems = 0;

    for (const system of systems) {
      switch (system) {
        case LegacySystem.KANJI_MASTERY:
          if (await this.kanjiMigrator.hasLegacyData()) {
            kanjiItems = await this.kanjiMigrator.countLegacyItems();
          }
          break;
          
        case LegacySystem.TEXTBOOK_VOCABULARY:
          if (await this.vocabularyMigrator.hasLegacyData()) {
            vocabularyItems = await this.vocabularyMigrator.countLegacyItems();
          }
          break;
          
        // Additional systems would be handled here
      }
    }

    const totalItems = kanjiItems + vocabularyItems + flashcardItems;

    return {
      kanjiItems,
      vocabularyItems,
      flashcardItems,
      totalItems
    };
  }

  /**
   * Validate legacy data before migration
   */
  private async validateLegacyData(discoveryResults: any): Promise<{
    valid: number;
    invalid: number;
    fixed: number;
  }> {
    let valid = 0;
    let invalid = 0;
    let fixed = 0;

    // Validate kanji data
    if (discoveryResults.kanjiItems > 0) {
      const kanjiValidation = await this.kanjiMigrator.validateLegacyData();
      valid += kanjiValidation.valid;
      invalid += kanjiValidation.invalid;
      fixed += kanjiValidation.fixed;
    }

    // Validate vocabulary data
    if (discoveryResults.vocabularyItems > 0) {
      const vocabValidation = await this.vocabularyMigrator.validateLegacyData();
      valid += vocabValidation.valid;
      invalid += vocabValidation.invalid;
      fixed += vocabValidation.fixed;
    }

    return { valid, invalid, fixed };
  }

  /**
   * Validate migrated data after migration
   */
  private async validateMigratedData(result: MigrationResult): Promise<void> {
    // This would check the integrity of migrated data
    // For now, it's a placeholder
    this.log('Validating migrated data...');
    
    // Could check:
    // - All items have valid progress records
    // - Progress timestamps are reasonable
    // - Algorithm data is well-formed
    // - No duplicate items
  }

  /**
   * Perform cleanup after migration
   */
  private async performCleanup(): Promise<void> {
    if (this.config.dryRun) {
      this.log('Skipping cleanup in dry run mode');
      return;
    }

    this.log('Performing post-migration cleanup...');
    
    // This could:
    // - Remove temporary migration data
    // - Optimize IndexedDB
    // - Update user preferences
    // - Create migration history record
  }

  /**
   * Update migration progress
   */
  private async updateProgress(
    phase: string, 
    processed: number, 
    total: number
  ): Promise<void> {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    const elapsed = Date.now() - this.startTime;
    
    let estimatedTimeRemaining: number | undefined;
    if (processed > 0 && percentage < 100) {
      const avgTimePerItem = elapsed / processed;
      const remaining = total - processed;
      estimatedTimeRemaining = Math.round((avgTimePerItem * remaining) / 1000);
    }

    this.currentProgress = {
      phase,
      processed,
      total,
      percentage,
      status: this.cancelled ? 'cancelled' : 'running',
      errors: this.currentProgress.errors,
      warnings: this.currentProgress.warnings,
      estimatedTimeRemaining
    };

    this.notifyProgress();
  }

  /**
   * Handle progress updates from sub-migrators
   */
  private updateMigratorProgress(progress: any): void {
    // Update our progress based on sub-migrator progress
    this.currentProgress.processed = progress.processed || this.currentProgress.processed;
    this.currentProgress.errors += progress.errors || 0;
    this.currentProgress.warnings += progress.warnings || 0;
    
    this.notifyProgress();
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    if (this.progressCallback) {
      this.progressCallback({ ...this.currentProgress });
    }
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Migration] ${message}`);
    }
  }

  /**
   * Export migration report
   */
  public generateReport(result: MigrationResult): string {
    const report = [
      '# Migration Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Success: ${result.success ? 'Yes' : 'No'}`,
      `- Total Items: ${result.summary.totalItems}`,
      `- Kanji Items: ${result.summary.kanjiItems}`,
      `- Vocabulary Items: ${result.summary.vocabularyItems}`,
      `- Total Progress Records: ${result.summary.totalProgress}`,
      `- Migration Time: ${result.summary.migrationTime}s`,
      '',
      '## Errors',
      result.errors.length > 0 ? result.errors.map(e => `- ${e}`).join('\n') : '- None',
      '',
      '## Warnings',
      result.warnings.length > 0 ? result.warnings.map(w => `- ${w}`).join('\n') : '- None'
    ];

    if (result.validation) {
      report.push(
        '',
        '## Validation',
        `- Valid Items: ${result.validation.valid}`,
        `- Invalid Items: ${result.validation.invalid}`,
        `- Fixed Items: ${result.validation.fixed}`
      );
    }

    return report.join('\n');
  }
}