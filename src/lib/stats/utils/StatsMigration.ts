/**
 * Stats Migration Utility - Handle migration of existing oversized arrays
 * Ensures backward compatibility while enforcing new size limits (Issue #3)
 */

import { UserStatsV2 } from '../core/interfaces';
import { migrateOversizedArray, getArraySizeStats, type ArrayEvictionMetrics } from './ArrayManager';

/**
 * Migration result containing all migration details
 */
export interface MigrationResult {
  wasNeeded: boolean;
  migrationPerformed: boolean;
  errors: string[];
  metrics: ArrayEvictionMetrics[];
  beforeStats: {
    kanji: number;
    words: number;
    pokemon: number;
  };
  afterStats: {
    kanji: number;
    words: number;
    pokemon: number;
  };
  timestamp: number;
}

/**
 * Check if user stats need migration
 */
export function needsMigration(stats: UserStatsV2): boolean {
  const sizeStats = getArraySizeStats(stats);
  return sizeStats.kanji.needsMigration || 
         sizeStats.words.needsMigration || 
         sizeStats.pokemon.needsMigration;
}

/**
 * Migrate user stats with oversized arrays
 * @param stats - Current user stats
 * @param logger - Optional logger function
 * @returns Migration result with detailed information
 */
export function migrateUserStats(
  stats: UserStatsV2,
  logger?: (message: string) => void
): MigrationResult {
  const migrationStart = Date.now();
  logger?.(`[Migration] Starting stats migration for user: ${stats.userId}`);
  
  const beforeStats = {
    kanji: stats.learnedKanjiSet.length,
    words: stats.learnedWordsSet.length,
    pokemon: stats.caughtPokemonSet.length
  };

  const sizeStats = getArraySizeStats(stats);
  const wasNeeded = needsMigration(stats);
  
  if (!wasNeeded) {
    logger?.(`[Migration] No migration needed - all arrays within limits`);
    return {
      wasNeeded: false,
      migrationPerformed: false,
      errors: [],
      metrics: [],
      beforeStats,
      afterStats: beforeStats,
      timestamp: migrationStart
    };
  }

  logger?.(`[Migration] Migration needed - Kanji: ${sizeStats.kanji.utilization}%, Words: ${sizeStats.words.utilization}%, Pokemon: ${sizeStats.pokemon.utilization}%`);

  const errors: string[] = [];
  const metrics: ArrayEvictionMetrics[] = [];
  let migrationPerformed = false;

  try {
    // Migrate kanji array
    if (sizeStats.kanji.needsMigration) {
      logger?.(`[Migration] Migrating kanji array: ${stats.learnedKanjiSet.length} items`);
      const result = migrateOversizedArray(stats.learnedKanjiSet, 'kanji', logger);
      if (result.wasMigrated) {
        stats.learnedKanjiSet = result.migratedArray;
        stats.totalKanjiLearned = stats.learnedKanjiSet.length;
        migrationPerformed = true;
        if (result.metrics) {
          metrics.push(result.metrics);
        }
      }
    }

    // Migrate words array
    if (sizeStats.words.needsMigration) {
      logger?.(`[Migration] Migrating words array: ${stats.learnedWordsSet.length} items`);
      const result = migrateOversizedArray(stats.learnedWordsSet, 'words', logger);
      if (result.wasMigrated) {
        stats.learnedWordsSet = result.migratedArray;
        stats.totalWordsLearned = stats.learnedWordsSet.length;
        migrationPerformed = true;
        if (result.metrics) {
          metrics.push(result.metrics);
        }
      }
    }

    // Migrate pokemon array
    if (sizeStats.pokemon.needsMigration) {
      logger?.(`[Migration] Migrating pokemon array: ${stats.caughtPokemonSet.length} items`);
      const result = migrateOversizedArray(stats.caughtPokemonSet, 'pokemon', logger);
      if (result.wasMigrated) {
        stats.caughtPokemonSet = result.migratedArray;
        stats.pokemonCaught = stats.caughtPokemonSet.length;
        migrationPerformed = true;
        if (result.metrics) {
          metrics.push(result.metrics);
        }
      }
    }

    const afterStats = {
      kanji: stats.learnedKanjiSet.length,
      words: stats.learnedWordsSet.length,
      pokemon: stats.caughtPokemonSet.length
    };

    const totalItemsRemoved = (beforeStats.kanji + beforeStats.words + beforeStats.pokemon) - 
                             (afterStats.kanji + afterStats.words + afterStats.pokemon);

    if (migrationPerformed) {
      logger?.(`[Migration] Complete - Removed ${totalItemsRemoved} items total`);
      logger?.(`[Migration] After: Kanji: ${afterStats.kanji}, Words: ${afterStats.words}, Pokemon: ${afterStats.pokemon}`);
    }

    return {
      wasNeeded,
      migrationPerformed,
      errors,
      metrics,
      beforeStats,
      afterStats,
      timestamp: migrationStart
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown migration error';
    errors.push(errorMsg);
    logger?.(`[Migration] ERROR: ${errorMsg}`);
    
    return {
      wasNeeded,
      migrationPerformed: false,
      errors,
      metrics,
      beforeStats,
      afterStats: {
        kanji: stats.learnedKanjiSet.length,
        words: stats.learnedWordsSet.length,
        pokemon: stats.caughtPokemonSet.length
      },
      timestamp: migrationStart
    };
  }
}

/**
 * Batch migrate multiple user stats (for admin operations)
 */
export async function batchMigrateStats(
  statsList: UserStatsV2[],
  logger?: (message: string) => void,
  progressCallback?: (completed: number, total: number) => void
): Promise<MigrationResult[]> {
  logger?.(`[BatchMigration] Starting batch migration for ${statsList.length} users`);
  
  const results: MigrationResult[] = [];
  let migratedCount = 0;
  let totalItemsRemoved = 0;

  for (let i = 0; i < statsList.length; i++) {
    const stats = statsList[i];
    const result = migrateUserStats(stats, logger);
    results.push(result);
    
    if (result.migrationPerformed) {
      migratedCount++;
      const itemsRemoved = (result.beforeStats.kanji + result.beforeStats.words + result.beforeStats.pokemon) -
                          (result.afterStats.kanji + result.afterStats.words + result.afterStats.pokemon);
      totalItemsRemoved += itemsRemoved;
    }

    progressCallback?.(i + 1, statsList.length);
  }

  logger?.(`[BatchMigration] Complete - Migrated ${migratedCount}/${statsList.length} users, removed ${totalItemsRemoved} items total`);
  return results;
}

/**
 * Validate migration result for consistency
 */
export function validateMigrationResult(result: MigrationResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let isValid = true;

  // Check for data loss without migration
  if (result.wasNeeded && !result.migrationPerformed && result.errors.length === 0) {
    warnings.push('Migration was needed but not performed without errors');
    isValid = false;
  }

  // Check for reasonable data reduction
  const beforeTotal = result.beforeStats.kanji + result.beforeStats.words + result.beforeStats.pokemon;
  const afterTotal = result.afterStats.kanji + result.afterStats.words + result.afterStats.pokemon;
  const reductionRatio = beforeTotal > 0 ? (beforeTotal - afterTotal) / beforeTotal : 0;

  if (result.migrationPerformed && reductionRatio > 0.5) {
    warnings.push(`Large data reduction: ${Math.round(reductionRatio * 100)}% of data was removed`);
  }

  // Check metrics consistency
  if (result.migrationPerformed && result.metrics.length === 0) {
    warnings.push('Migration performed but no metrics recorded');
    isValid = false;
  }

  return { isValid, warnings };
}

/**
 * Generate migration report for logging/monitoring
 */
export function generateMigrationReport(results: MigrationResult[]): {
  summary: {
    totalProcessed: number;
    needingMigration: number;
    successfulMigrations: number;
    failedMigrations: number;
    totalItemsRemoved: number;
    totalErrors: number;
  };
  breakdown: {
    kanji: { before: number; after: number; removed: number };
    words: { before: number; after: number; removed: number };
    pokemon: { before: number; after: number; removed: number };
  };
  errors: string[];
} {
  let totalItemsRemoved = 0;
  let totalErrors = 0;
  const allErrors: string[] = [];
  
  let totalKanjiBefore = 0, totalKanjiAfter = 0;
  let totalWordsBefore = 0, totalWordsAfter = 0;
  let totalPokemonBefore = 0, totalPokemonAfter = 0;

  const needingMigration = results.filter(r => r.wasNeeded).length;
  const successfulMigrations = results.filter(r => r.migrationPerformed).length;
  const failedMigrations = results.filter(r => r.wasNeeded && !r.migrationPerformed && r.errors.length > 0).length;

  for (const result of results) {
    // Accumulate totals
    totalKanjiBefore += result.beforeStats.kanji;
    totalKanjiAfter += result.afterStats.kanji;
    totalWordsBefore += result.beforeStats.words;
    totalWordsAfter += result.afterStats.words;
    totalPokemonBefore += result.beforeStats.pokemon;
    totalPokemonAfter += result.afterStats.pokemon;

    // Count removed items
    const itemsRemoved = (result.beforeStats.kanji + result.beforeStats.words + result.beforeStats.pokemon) -
                        (result.afterStats.kanji + result.afterStats.words + result.afterStats.pokemon);
    totalItemsRemoved += itemsRemoved;

    // Collect errors
    if (result.errors.length > 0) {
      totalErrors += result.errors.length;
      allErrors.push(...result.errors);
    }
  }

  return {
    summary: {
      totalProcessed: results.length,
      needingMigration,
      successfulMigrations,
      failedMigrations,
      totalItemsRemoved,
      totalErrors
    },
    breakdown: {
      kanji: { 
        before: totalKanjiBefore, 
        after: totalKanjiAfter, 
        removed: totalKanjiBefore - totalKanjiAfter 
      },
      words: { 
        before: totalWordsBefore, 
        after: totalWordsAfter, 
        removed: totalWordsBefore - totalWordsAfter 
      },
      pokemon: { 
        before: totalPokemonBefore, 
        after: totalPokemonAfter, 
        removed: totalPokemonBefore - totalPokemonAfter 
      }
    },
    errors: allErrors
  };
}

/**
 * Create a migration task for scheduled execution
 */
export interface MigrationTask {
  userId: string;
  priority: 'high' | 'medium' | 'low';
  estimatedItems: number;
  createdAt: number;
}

/**
 * Analyze stats to create migration tasks
 */
export function createMigrationTasks(statsList: UserStatsV2[]): MigrationTask[] {
  const tasks: MigrationTask[] = [];

  for (const stats of statsList) {
    if (needsMigration(stats)) {
      const sizeStats = getArraySizeStats(stats);
      const totalItems = stats.learnedKanjiSet.length + stats.learnedWordsSet.length + stats.caughtPokemonSet.length;
      
      // Determine priority based on array sizes
      let priority: 'high' | 'medium' | 'low' = 'low';
      const maxUtilization = Math.max(sizeStats.kanji.utilization, sizeStats.words.utilization, sizeStats.pokemon.utilization);
      
      if (maxUtilization > 150) priority = 'high';      // 50% over limit
      else if (maxUtilization > 120) priority = 'medium'; // 20% over limit
      
      tasks.push({
        userId: stats.userId,
        priority,
        estimatedItems: totalItems,
        createdAt: Date.now()
      });
    }
  }

  // Sort by priority (high first) then by estimated items (larger first)
  return tasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedItems - a.estimatedItems;
  });
}