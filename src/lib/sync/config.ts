/**
 * Sync configuration
 */

export const SYNC_CONFIG = {
  // Disable sync entirely in development to avoid console noise
  ENABLED: process.env.NODE_ENV === 'production',
  
  // Only log sync operations in development when explicitly enabled
  DEBUG: process.env.NEXT_PUBLIC_DEBUG_SYNC === 'true',
  
  // Sync intervals
  AUTO_SYNC_INTERVAL: 30 * 60 * 1000, // 30 minutes
  PERIODIC_SYNC_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
};