'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '@/types/settings';
import { applyTheme } from '@/utils/themes';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { hasPaidPlan } from '@/lib/subscriptions/helpers';

// Default settings
const defaultSettings: AppSettings = {
  theme: 'light',
  colorScheme: 'default',
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
  const { user } = useAuth();
  const { subscription } = useSubscription2();

  // Load settings - Firebase first for paid users, then localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // For paid users, try Firebase first
        if (user && hasPaidPlan(subscription)) {
          console.log('🎨 Loading settings from Firebase for paid user');
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.settings) {
                console.log('✅ Settings loaded from Firebase');
                const cloudSettings = userData.settings as AppSettings;
                setSettings({
                  ...defaultSettings,
                  ...cloudSettings,
                  companionHistory: cloudSettings.companionHistory || defaultSettings.companionHistory,
                  navigationPreferences: cloudSettings.navigationPreferences || defaultSettings.navigationPreferences
                });
                // Also save to localStorage for offline access
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(cloudSettings));
                setIsLoading(false);
                return;
              }
            }
          } catch (error) {
            console.error('Error loading settings from Firebase:', error);
          }
        }
        
        // Fall back to localStorage
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings) as AppSettings;
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
  }, [user, subscription]);

  // Save settings to localStorage and Firebase whenever they change
  useEffect(() => {
    if (!isLoading) {
      const saveSettings = async () => {
        try {
          // Always save to localStorage for offline access
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          
          // Save to Firebase for paid users
          if (user && hasPaidPlan(subscription)) {
            console.log('💾 Saving settings to Firebase');
            await setDoc(
              doc(db, 'users', user.uid),
              { settings },
              { merge: true }
            );
          }
        } catch (error) {
          console.error('Error saving settings:', error);
        }
      };
      
      saveSettings();
    }
  }, [settings, isLoading, user, subscription]);

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