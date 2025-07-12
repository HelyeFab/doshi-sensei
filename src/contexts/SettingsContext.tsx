'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '@/types';
import { SettingsManager } from '@/utils/indexedDB';

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  colorScheme: 'default',
  showRomaji: true,
  dailyGoal: 10,
  practiceReminders: false,
  showCompanion: true, // Show virtual companion by default
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

  // Load settings from IndexedDB on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First try to load from IndexedDB
        const savedSettings = await SettingsManager.loadSettings();
        
        if (savedSettings) {
          // Ensure theme is explicitly set if saved
          if (savedSettings.theme && savedSettings.theme !== 'system') {
            console.log(`[Settings] Loading saved theme from IndexedDB: ${savedSettings.theme}`);
          }
          setSettings(savedSettings);
        } else {
          // Migration: Check localStorage for existing settings
          const localStorageSettings = localStorage.getItem(SETTINGS_KEY);
          if (localStorageSettings) {
            try {
              const parsedSettings = JSON.parse(localStorageSettings) as AppSettings;
              console.log(`[Settings] Migrating settings from localStorage to IndexedDB`);
              
              // Save to IndexedDB
              await SettingsManager.saveSettings(parsedSettings);
              setSettings(parsedSettings);
              
              // Clean up localStorage after successful migration
              localStorage.removeItem(SETTINGS_KEY);
              localStorage.removeItem('doshi_sensei_theme');
            } catch (e) {
              console.error('Error migrating settings from localStorage:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error loading settings from IndexedDB:', error);
        // Fallback to defaults if IndexedDB fails
        setSettings(defaultSettings);
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

      // Save to IndexedDB asynchronously
      SettingsManager.saveSettings(newSettings)
        .then(() => {
          if (key === 'theme') {
            console.log(`[Settings] Saved theme preference to IndexedDB: ${value}`);
          }
        })
        .catch(error => {
          console.error('Error saving settings to IndexedDB:', error);
        });

      return newSettings;
    });
  };

  // Reset all settings to defaults
  const resetSettings = () => {
    setSettings(defaultSettings);

    // Save to IndexedDB
    SettingsManager.saveSettings(defaultSettings)
      .then(() => {
        console.log('[Settings] Reset settings saved to IndexedDB');
      })
      .catch(error => {
        console.error('Error saving reset settings to IndexedDB:', error);
      });
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
