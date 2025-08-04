/**
 * Wrapper for console-log-manager to handle dynamic imports in API routes
 * This avoids build issues with relative path imports
 */

export async function getConsoleLogManager() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Console log management is not available in production');
  }
  
  try {
    // Use eval to prevent webpack from analyzing the import
    // This is safe because we control the path and it's dev-only
    const path = require('path');
    const scriptPath = path.join(process.cwd(), 'scripts', 'console-log-manager.js');
    delete require.cache[scriptPath]; // Clear cache to get fresh instance
    const ConsoleLogManager = require(scriptPath);
    return ConsoleLogManager;
  } catch (error) {
    console.error('Failed to load console-log-manager:', error);
    throw new Error('Console log manager not available');
  }
}