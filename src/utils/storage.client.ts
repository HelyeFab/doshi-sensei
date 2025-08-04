'use client';

// Client-only wrapper for storage utilities
// This prevents Fast Refresh issues by ensuring these are only imported in React components

export {
  SETTINGS_KEY,
  PROGRESS_KEY,
  RECENT_WORDS_KEY,
  EnhancedStorageManager,
  isLocalStorageAvailable,
  loadSettings,
  saveSettings,
  clearProgress,
  isStorageAvailable
} from './storage';

export default EnhancedStorageManager;