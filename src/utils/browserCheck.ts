/**
 * Utility to check if code is running in browser environment
 */
export const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

/**
 * Safely access navigator object
 */
export const safeNavigator = isBrowser ? navigator : undefined;

/**
 * Safely access window object
 */
export const safeWindow = isBrowser ? window : undefined;

/**
 * Wrapper for browser-only code
 */
export function runInBrowser<T>(callback: () => T, fallback?: T): T | undefined {
  if (isBrowser) {
    return callback();
  }
  return fallback;
}