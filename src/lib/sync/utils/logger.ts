/**
 * Sync logger utility that only logs in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const syncLogger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[Sync]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[Sync]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors but with less detail in production
    if (isDevelopment) {
      console.error('[Sync]', ...args);
    } else {
      // In production, only log the error message, not the full stack
      const message = args[0]?.message || args[0] || 'Sync error';
      console.error('[Sync]', message);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[Sync]', ...args);
    }
  }
};