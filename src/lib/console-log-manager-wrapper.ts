/**
 * Wrapper for console-log-manager to handle dynamic imports in API routes
 * This avoids build issues with relative path imports
 */

export async function getConsoleLogManager() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Console log management is not available in production');
  }
  
  try {
    // Dynamic import to avoid build-time resolution
    const module = await import('../../scripts/console-log-manager.js');
    return module.default || module;
  } catch (error) {
    console.error('Failed to load console-log-manager:', error);
    throw new Error('Console log manager not available');
  }
}