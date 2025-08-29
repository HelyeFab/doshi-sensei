/**
 * Review Sources - Source Registration and Initialization
 * 
 * This file handles the registration of all review sources with the UnifiedReviewHub.
 * It provides functions to initialize sources based on user context and preferences.
 */

import { ReviewSourceRegistry } from '../registry';
import { SourcePriority } from '../review-source.interface';

// Import all source factory functions
import { createTextbookVocabularySource } from './textbook-vocabulary';
import { createKanjiMasterySource } from './kanji-mastery';
import { createFlashcardsSource } from './flashcards';
import { createHiraganaKatakanaSource } from './hiragana-katakana';
import { createArticlesSource } from './articles';
import { createStoriesSource } from './stories';
import { createMoodboardSource } from './moodboard';
import { createDictionarySource } from './dictionary';
import { createConjugationsSource } from './conjugations';
import { createDrillsSource } from './drills';

/**
 * Configuration for source registration
 */
interface SourceRegistrationConfig {
  sourceId: string;
  factory: (userId: string | null) => Promise<any>;
  defaultPriority: SourcePriority;
  enabled: boolean;
}

/**
 * All available source configurations
 */
const SOURCE_CONFIGS: SourceRegistrationConfig[] = [
  {
    sourceId: 'textbook-vocabulary',
    factory: createTextbookVocabularySource,
    defaultPriority: SourcePriority.HIGH,
    enabled: true
  },
  {
    sourceId: 'kanji-mastery',
    factory: createKanjiMasterySource,
    defaultPriority: SourcePriority.HIGH,
    enabled: true
  },
  {
    sourceId: 'flashcards',
    factory: createFlashcardsSource,
    defaultPriority: SourcePriority.MEDIUM,
    enabled: true
  },
  {
    sourceId: 'hiragana-katakana',
    factory: createHiraganaKatakanaSource,
    defaultPriority: SourcePriority.MEDIUM,
    enabled: true
  },
  {
    sourceId: 'articles',
    factory: createArticlesSource,
    defaultPriority: SourcePriority.MEDIUM,
    enabled: true
  },
  {
    sourceId: 'stories',
    factory: createStoriesSource,
    defaultPriority: SourcePriority.MEDIUM,
    enabled: true
  },
  {
    sourceId: 'moodboard',
    factory: createMoodboardSource,
    defaultPriority: SourcePriority.MEDIUM,
    enabled: true
  },
  {
    sourceId: 'dictionary',
    factory: createDictionarySource,
    defaultPriority: SourcePriority.LOW,
    enabled: true
  },
  {
    sourceId: 'conjugations',
    factory: createConjugationsSource,
    defaultPriority: SourcePriority.HIGH,
    enabled: true
  },
  {
    sourceId: 'drills',
    factory: createDrillsSource,
    defaultPriority: SourcePriority.MEDIUM,
    enabled: true
  }
];

/**
 * Initialize all review sources for a user
 * 
 * @param userId - User ID (null for guest users)
 * @param options - Configuration options
 */
export async function initializeAllReviewSources(
  userId: string | null,
  options: {
    enabledSources?: string[];
    debug?: boolean;
    forceReset?: boolean;
  } = {}
): Promise<ReviewSourceRegistry> {
  const { enabledSources, debug = false, forceReset = false } = options;

  // Get or create registry instance
  const registry = ReviewSourceRegistry.getInstance({
    debug,
    autoInitialize: false // We'll initialize sources manually
  });

  // If force reset is requested, clear existing sources
  if (forceReset && registry.hasAnySources()) {
    if (debug) {
      console.log(`[ReviewSources] Force reset requested, clearing existing sources`);
    }
    await ReviewSourceRegistry.reset();
    // Get new instance after reset
    const newRegistry = ReviewSourceRegistry.getInstance({ debug, autoInitialize: false });
    return initializeAllReviewSources(userId, { ...options, forceReset: false });
  }

  // Filter sources based on enabled list
  const sourcesToRegister = SOURCE_CONFIGS.filter(config => {
    if (!config.enabled) return false;
    if (enabledSources && !enabledSources.includes(config.sourceId)) return false;
    return true;
  });

  if (debug) {
    console.log(`[ReviewSources] Initializing ${sourcesToRegister.length} sources for user: ${userId || 'guest'} (${registry.getSourceCount()} already registered)`);
  }

  // Register and initialize each source
  const registrationPromises = sourcesToRegister.map(async (config) => {
    try {
      // Check if source is already registered
      if (registry.hasSource(config.sourceId)) {
        if (debug) {
          console.log(`[ReviewSources] Source already registered: ${config.sourceId}`);
        }
        return { sourceId: config.sourceId, success: true, alreadyRegistered: true };
      }

      if (debug) {
        console.log(`[ReviewSources] Registering source: ${config.sourceId}`);
      }

      // Create source instance
      const source = await config.factory(userId);

      // Register with registry
      await registry.register(source, config.defaultPriority);

      if (debug) {
        console.log(`[ReviewSources] Successfully registered: ${config.sourceId}`);
      }

      return { sourceId: config.sourceId, success: true, alreadyRegistered: false };

    } catch (error) {
      console.error(`[ReviewSources] Failed to register source ${config.sourceId}:`, error);
      return { sourceId: config.sourceId, success: false, error };
    }
  });

  // Wait for all registrations to complete
  const results = await Promise.allSettled(registrationPromises);

  // Log results
  const successful = results.filter(result =>
    result.status === 'fulfilled' && result.value.success
  ).length;

  const alreadyRegistered = results.filter(result =>
    result.status === 'fulfilled' && result.value.success && result.value.alreadyRegistered
  ).length;

  const newlyRegistered = successful - alreadyRegistered;
  const failed = results.length - successful;

  console.log(`[ReviewSources] Registration complete: ${newlyRegistered} newly registered, ${alreadyRegistered} already registered, ${failed} failed`);

  if (failed > 0 && debug) {
    results.forEach((result, index) => {
      if (result.status === 'rejected' || !result.value.success) {
        const config = sourcesToRegister[index];
        console.error(`[ReviewSources] Failed: ${config.sourceId}`,
          result.status === 'rejected' ? result.reason : result.value.error
        );
      }
    });
  }

  // Initialize the registry
  await registry.init();

  if (debug) {
    console.log(`[ReviewSources] Registry initialized with ${successful} active sources`);
  }

  return registry;
}

/**
 * Initialize specific review sources
 * 
 * @param userId - User ID (null for guest users)
 * @param sourceIds - Array of source IDs to initialize
 * @param debug - Enable debug logging
 */
export async function initializeSpecificReviewSources(
  userId: string | null,
  sourceIds: string[],
  debug: boolean = false
): Promise<ReviewSourceRegistry> {
  return initializeAllReviewSources(userId, {
    enabledSources: sourceIds,
    debug
  });
}

/**
 * Get default source configuration for a source ID
 */
export function getSourceConfig(sourceId: string): SourceRegistrationConfig | null {
  return SOURCE_CONFIGS.find(config => config.sourceId === sourceId) || null;
}

/**
 * Get all available source IDs
 */
export function getAllAvailableSourceIds(): string[] {
  return SOURCE_CONFIGS.map(config => config.sourceId);
}

/**
 * Check if a source is available
 */
export function isSourceAvailable(sourceId: string): boolean {
  return SOURCE_CONFIGS.some(config => config.sourceId === sourceId && config.enabled);
}

/**
 * Create a single source by ID
 * 
 * @param sourceId - ID of the source to create
 * @param userId - User ID (null for guest users)
 */
export async function createSource(sourceId: string, userId: string | null) {
  const config = getSourceConfig(sourceId);
  if (!config) {
    throw new Error(`Unknown source ID: ${sourceId}`);
  }

  return config.factory(userId);
}

/**
 * Register a single source with the registry
 * 
 * @param sourceId - ID of the source to register
 * @param userId - User ID (null for guest users)
 * @param registry - Registry instance (optional, uses singleton if not provided)
 */
export async function registerSingleSource(
  sourceId: string,
  userId: string | null,
  registry?: ReviewSourceRegistry
): Promise<void> {
  const config = getSourceConfig(sourceId);
  if (!config) {
    throw new Error(`Unknown source ID: ${sourceId}`);
  }

  const targetRegistry = registry || ReviewSourceRegistry.getInstance();

  // Create and register source
  const source = await config.factory(userId);
  await targetRegistry.register(source, config.defaultPriority);
}

// Re-export source factory functions for direct use
export {
  createTextbookVocabularySource,
  createKanjiMasterySource,
  createFlashcardsSource,
  createHiraganaKatakanaSource,
  createArticlesSource,
  createStoriesSource,
  createMoodboardSource,
  createDictionarySource,
  createConjugationsSource,
  createDrillsSource
};