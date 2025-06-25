'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '@/types';

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  colorScheme: 'default',
  showRomaji: true,
  dailyGoal: 10,
  practiceReminders: false,
  companionHistory: {
    recentCharacters: [],
    lastShownDate: undefined
  },
  navigationPreferences: {
    customNavItems: ['drill', 'kanji-moods', 'resources'], // Default 3 navigation items
    useCustomNavigation: false // Start with default navigation
  }
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

// Local storage keys
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
          setSettings(parsedSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update a single setting
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings, [key]: value };

      // Save to localStorage
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error('Error saving settings:', error);
      }

      return newSettings;
    });
  };

  // Reset all settings to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);

    // Save to localStorage
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Custom hook to use settings context
 * @returns Settings context
 */
export function useSettings() {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}
