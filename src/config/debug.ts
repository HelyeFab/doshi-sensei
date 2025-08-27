/**
 * Debug Configuration
 * Allows disabling specific systems to isolate Firebase 400 errors
 */

export const DEBUG_CONFIG = {
  // Disable specific systems for debugging
  DISABLE_LEARNING_EVENTS: false,  // Disable LearningEventsService - NOT THE CULPRIT
  DISABLE_STATS_TRACKER: false,   // Disable StatsTracker - RE-ENABLED AFTER FIX
  DISABLE_EVENT_QUEUE: false,     // Disable EventQueueManager
  
  // Log all Firebase writes
  LOG_FIREBASE_WRITES: true,
  
  // Add delay between Firebase writes to identify problematic writes
  FIREBASE_WRITE_DELAY: 100, // milliseconds
};

// Helper to check if a system is enabled
export function isSystemEnabled(system: 'learning' | 'stats' | 'queue'): boolean {
  switch (system) {
    case 'learning':
      return !DEBUG_CONFIG.DISABLE_LEARNING_EVENTS;
    case 'stats':
      return !DEBUG_CONFIG.DISABLE_STATS_TRACKER;
    case 'queue':
      return !DEBUG_CONFIG.DISABLE_EVENT_QUEUE;
    default:
      return true;
  }
}

