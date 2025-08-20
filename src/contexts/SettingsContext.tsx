'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '@/types/settings';
import { applyTheme } from '@/utils/themes';

// Default settings
const defaultSettings: AppSettings = {
  theme: 'light',
  colorScheme: 'default',
  showRomaji: true,
  showFurigana: true,
  dailyGoal: 10,
  practiceReminders: false,
  showCompanion: true,
  companionHistory: {
    recentCharacters: [],
    lastShownDate: undefined
  },
  navigationPreferences: {
    customNavItems: ['drill', 'kanji-moods', 'resources'],
    useCustomNavigation: false
  },
  navigationGestures: true
};

// Settings context type
type SettingsContextType = {
  settings: AppSettings;
  isLoading: boolean;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
};

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  updateSetting: () => {},
  resetSettings: () => {}
});

// Settings provider props
interface SettingsProviderProps {
  children: ReactNode;
}

// Local storage key
const SETTINGS_KEY = 'doshi_sensei_settings';

/**
 * Settings Provider Component
 * Manages settings state and provides methods to update settings
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings) as AppSettings;
          // Merge with default settings to ensure all fields exist
          setSettings({
            ...defaultSettings,
            ...parsedSettings,
            companionHistory: parsedSettings.companionHistory || defaultSettings.companionHistory,
            navigationPreferences: parsedSettings.navigationPreferences || defaultSettings.navigationPreferences
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }
  }, [settings, isLoading]);

  // Apply theme when settings change
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      applyTheme(settings.colorScheme, settings.theme);
    }
  }, [settings.theme, settings.colorScheme, isLoading]);

  // Update a single setting
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset all settings to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
  };

  const value = {
    settings,
    isLoading,
    updateSetting,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to use settings context
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}