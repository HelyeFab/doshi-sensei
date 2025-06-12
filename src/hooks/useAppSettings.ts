'use client';

import { useSettings } from '@/contexts/SettingsContext';
import { AppSettings } from '@/types';

/**
 * Custom hook for accessing and updating app settings
 * This hook provides a simplified interface for components to interact with settings
 */
export function useAppSettings() {
  const { settings, updateSetting, resetSettings } = useSettings();

  // Theme-related functions
  const setTheme = (theme: AppSettings['theme']) => updateSetting('theme', theme);
  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Romaji display functions
  const toggleRomaji = () => updateSetting('showRomaji', !settings.showRomaji);

  // Daily goal functions
  const setDailyGoal = (goal: number) => updateSetting('dailyGoal', goal);

  // Practice reminders functions
  const togglePracticeReminders = () =>
    updateSetting('practiceReminders', !settings.practiceReminders);

  return {
    // Raw settings and update functions
    settings,
    updateSetting,
    resetSettings,

    // Theme helpers
    theme: settings.theme,
    setTheme,
    toggleTheme,
    isDarkMode: settings.theme === 'dark' ||
      (settings.theme === 'system' &&
       typeof window !== 'undefined' &&
       window.matchMedia('(prefers-color-scheme: dark)').matches),

    // Display helpers
    showRomaji: settings.showRomaji,
    toggleRomaji,

    // Goals helpers
    dailyGoal: settings.dailyGoal,
    setDailyGoal,

    // Reminders helpers
    practiceReminders: settings.practiceReminders,
    togglePracticeReminders,
  };
}
