/**
 * Array Manager - Utility for managing bounded arrays with FIFO behavior
 * Prevents unbounded growth of learned items arrays (Issue #3)
 */

import { ARRAY_SIZE_LIMITS } from '../core/constants';

/**
 * Metrics for tracking array limit hits and evictions
 */
export interface ArrayEvictionMetrics {
  arrayType: 'kanji' | 'words' | 'pokemon';
  originalSize: number;
  newSize: number;
  itemsEvicted: number;
  evictedItems: string[];
  timestamp: number;
}

/**
 * Configuration for array limits
 */
export interface ArrayLimitConfig {
  maxSize: number;
  trimToSize: number;
}

/**
 * Get limit configuration for an array type
 */
export function getArrayLimits(arrayType: 'kanji' | 'words' | 'pokemon'): ArrayLimitConfig {
  switch (arrayType) {
    case 'kanji':
      return {
        maxSize: ARRAY_SIZE_LIMITS.MAX_LEARNED_KANJI,
        trimToSize: ARRAY_SIZE_LIMITS.TRIM_TO_SIZE_KANJI
      };
    case 'words':
      return {
        maxSize: ARRAY_SIZE_LIMITS.MAX_LEARNED_WORDS,
        trimToSize: ARRAY_SIZE_LIMITS.TRIM_TO_SIZE_WORDS
      };
    case 'pokemon':
      return {
        maxSize: ARRAY_SIZE_LIMITS.MAX_CAUGHT_POKEMON,
        trimToSize: ARRAY_SIZE_LIMITS.TRIM_TO_SIZE_POKEMON
      };
    default:
      throw new Error(`Unknown array type: ${arrayType}`);
  }
}

/**
 * Add item to bounded array with FIFO behavior
 * @param array - Current array
 * @param newItem - Item to add
 * @param arrayType - Type of array for limit configuration
 * @param logger - Optional logger function
 * @returns Object containing updated array and eviction metrics
 */
export function addToBoundedArray(
  array: string[],
  newItem: string,
  arrayType: 'kanji' | 'words' | 'pokemon',
  logger?: (message: string) => void
): { 
  updatedArray: string[];
  metrics?: ArrayEvictionMetrics;
} {
  // Don't add if already exists
  if (array.includes(newItem)) {
    return { updatedArray: array };
  }

  const limits = getArrayLimits(arrayType);
  const newArray = [...array, newItem];

  // If under limit, just return the new array
  if (newArray.length <= limits.maxSize) {
    logger?.(`Added ${newItem} to ${arrayType} array (${newArray.length}/${limits.maxSize})`);
    return { updatedArray: newArray };
  }

  // Limit exceeded - implement FIFO trimming
  const originalSize = newArray.length;
  const itemsToRemove = originalSize - limits.trimToSize;
  
  // Keep the most recent items (FIFO: remove from beginning)
  const evictedItems = newArray.slice(0, itemsToRemove);
  const trimmedArray = newArray.slice(itemsToRemove);

  const metrics: ArrayEvictionMetrics = {
    arrayType,
    originalSize,
    newSize: trimmedArray.length,
    itemsEvicted: itemsToRemove,
    evictedItems,
    timestamp: Date.now()
  };

  logger?.(
    `FIFO trimming ${arrayType} array: ${originalSize} -> ${trimmedArray.length} ` +
    `(evicted ${itemsToRemove} items: ${evictedItems.slice(0, 3).join(', ')}${itemsToRemove > 3 ? '...' : ''})`
  );

  return { 
    updatedArray: trimmedArray,
    metrics
  };
}

/**
 * Migrate existing oversized array to bounded version
 * @param array - Existing array to migrate
 * @param arrayType - Type of array for limit configuration
 * @param logger - Optional logger function
 * @returns Migration result with metrics
 */
export function migrateOversizedArray(
  array: string[],
  arrayType: 'kanji' | 'words' | 'pokemon',
  logger?: (message: string) => void
): {
  migratedArray: string[];
  wasMigrated: boolean;
  metrics?: ArrayEvictionMetrics;
} {
  const limits = getArrayLimits(arrayType);

  // No migration needed if under limit
  if (array.length <= limits.maxSize) {
    logger?.(`${arrayType} array size OK: ${array.length}/${limits.maxSize}`);
    return {
      migratedArray: array,
      wasMigrated: false
    };
  }

  // Migration needed - keep most recent items
  const originalSize = array.length;
  const itemsToRemove = originalSize - limits.trimToSize;
  const evictedItems = array.slice(0, itemsToRemove);
  const migratedArray = array.slice(itemsToRemove);

  const metrics: ArrayEvictionMetrics = {
    arrayType,
    originalSize,
    newSize: migratedArray.length,
    itemsEvicted: itemsToRemove,
    evictedItems,
    timestamp: Date.now()
  };

  logger?.(
    `MIGRATION: Trimmed oversized ${arrayType} array: ${originalSize} -> ${migratedArray.length} ` +
    `(removed ${itemsToRemove} oldest items)`
  );

  return {
    migratedArray,
    wasMigrated: true,
    metrics
  };
}

/**
 * Merge two arrays while respecting size limits
 * Used during stats merging (sync conflicts, etc.)
 */
export function mergeBoundedArrays(
  array1: string[],
  array2: string[],
  arrayType: 'kanji' | 'words' | 'pokemon',
  logger?: (message: string) => void
): {
  mergedArray: string[];
  metrics?: ArrayEvictionMetrics;
} {
  // Create a Set to handle deduplication efficiently
  const uniqueItems = new Set([...array1, ...array2]);
  const mergedArray = Array.from(uniqueItems);
  
  const limits = getArrayLimits(arrayType);

  // If merged array is within limits, return as-is
  if (mergedArray.length <= limits.maxSize) {
    logger?.(`Merged ${arrayType} arrays: ${array1.length} + ${array2.length} = ${mergedArray.length}`);
    return { mergedArray };
  }

  // Trim to limits - keep most recent items
  // Note: In a merge scenario, we can't determine chronological order perfectly,
  // so we'll keep items from array2 (usually the newer/cloud version) preferentially
  const itemsFromArray2 = array2.filter(item => uniqueItems.has(item));
  const itemsFromArray1Only = array1.filter(item => !array2.includes(item));
  
  // Prioritize array2 items, then fill with array1 items
  const prioritizedArray = [...itemsFromArray2, ...itemsFromArray1Only];
  
  if (prioritizedArray.length <= limits.maxSize) {
    logger?.(`Merged and prioritized ${arrayType} arrays: ${prioritizedArray.length} items`);
    return { mergedArray: prioritizedArray };
  }

  // Still too large - trim to size
  const originalSize = prioritizedArray.length;
  const itemsToRemove = originalSize - limits.trimToSize;
  const evictedItems = prioritizedArray.slice(0, itemsToRemove);
  const trimmedArray = prioritizedArray.slice(itemsToRemove);

  const metrics: ArrayEvictionMetrics = {
    arrayType,
    originalSize,
    newSize: trimmedArray.length,
    itemsEvicted: itemsToRemove,
    evictedItems,
    timestamp: Date.now()
  };

  logger?.(
    `MERGE + TRIM: ${arrayType} arrays merged and trimmed: ${originalSize} -> ${trimmedArray.length} ` +
    `(evicted ${itemsToRemove} items)`
  );

  return {
    mergedArray: trimmedArray,
    metrics
  };
}

/**
 * Validate array size and log warnings if approaching limits
 */
export function validateArraySize(
  array: string[],
  arrayType: 'kanji' | 'words' | 'pokemon',
  logger?: (message: string) => void
): {
  isValid: boolean;
  warnings: string[];
  isNearLimit: boolean;
} {
  const limits = getArrayLimits(arrayType);
  const size = array.length;
  const warnings: string[] = [];
  
  // Check if over absolute limit
  if (size > limits.maxSize) {
    warnings.push(`${arrayType} array exceeds maximum size: ${size} > ${limits.maxSize}`);
    logger?.(`WARNING: ${arrayType} array is oversized and needs migration`);
    return {
      isValid: false,
      warnings,
      isNearLimit: true
    };
  }

  // Check if approaching limit (90% threshold)
  const warningThreshold = Math.floor(limits.maxSize * 0.9);
  const isNearLimit = size >= warningThreshold;
  
  if (isNearLimit) {
    warnings.push(`${arrayType} array approaching limit: ${size}/${limits.maxSize} (${Math.round(size/limits.maxSize*100)}%)`);
    logger?.(`INFO: ${arrayType} array is ${Math.round(size/limits.maxSize*100)}% full`);
  }

  return {
    isValid: true,
    warnings,
    isNearLimit
  };
}

/**
 * Get array size statistics for monitoring
 */
export function getArraySizeStats(arrays: {
  learnedKanjiSet: string[];
  learnedWordsSet: string[];
  caughtPokemonSet: string[];
}) {
  const kanjiLimits = getArrayLimits('kanji');
  const wordsLimits = getArrayLimits('words');
  const pokemonLimits = getArrayLimits('pokemon');

  return {
    kanji: {
      size: arrays.learnedKanjiSet.length,
      maxSize: kanjiLimits.maxSize,
      utilization: Math.round((arrays.learnedKanjiSet.length / kanjiLimits.maxSize) * 100),
      needsMigration: arrays.learnedKanjiSet.length > kanjiLimits.maxSize
    },
    words: {
      size: arrays.learnedWordsSet.length,
      maxSize: wordsLimits.maxSize,
      utilization: Math.round((arrays.learnedWordsSet.length / wordsLimits.maxSize) * 100),
      needsMigration: arrays.learnedWordsSet.length > wordsLimits.maxSize
    },
    pokemon: {
      size: arrays.caughtPokemonSet.length,
      maxSize: pokemonLimits.maxSize,
      utilization: Math.round((arrays.caughtPokemonSet.length / pokemonLimits.maxSize) * 100),
      needsMigration: arrays.caughtPokemonSet.length > pokemonLimits.maxSize
    }
  };
}