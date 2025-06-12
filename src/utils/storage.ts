import { AppSettings } from '@/types';

// Local storage keys
export const SETTINGS_KEY = 'doshi_sensei_settings';
export const PROGRESS_KEY = 'doshi_sensei_progress';

/**
 * Load settings from localStorage
 * @returns The saved settings or null if not found
 */
export function loadSettings(): AppSettings | null {
  if (typeof window === 'undefined') return null;

  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

/**
 * Save settings to localStorage
 * @param settings The settings to save
 */
export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

/**
 * Clear progress data from localStorage
 */
export function clearProgress(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch (error) {
    console.error('Error clearing progress:', error);
  }
}

/**
 * Check if localStorage is available
 * @returns True if localStorage is available
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}
