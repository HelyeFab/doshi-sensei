'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '@/types';

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  showRomaji: true,
  dailyGoal: 10,
  practiceReminders: false
};

// Settings context type
type SettingsContextType = {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
};

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
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
      }
    };

    loadSettings();
  }, []);

  // Update a single setting
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Save to localStorage
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
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
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
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
