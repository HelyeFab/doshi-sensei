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
  forceSyncFromFirebase: () => Promise<boolean>;
  lastSyncTime: Date | null;
};

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  updateSetting: () => {},
  resetSettings: () => {},
  forceSyncFromFirebase: async () => false,
  lastSyncTime: null
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
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user } = useAuth();
  const { subscription } = useSubscription2();

  // Load settings - Firebase ALWAYS wins for authenticated users
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // For ALL authenticated users, Firebase is the source of truth
        if (user && db) {
          console.log('🎨 Loading settings from Firebase (source of truth)');
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.settings) {
                console.log('✅ Settings loaded from Firebase - overwriting local');
                const cloudSettings = userData.settings as AppSettings;
                const mergedSettings = {
                  ...defaultSettings,
                  ...cloudSettings,
                  companionHistory: cloudSettings.companionHistory || defaultSettings.companionHistory,
                  navigationPreferences: cloudSettings.navigationPreferences || defaultSettings.navigationPreferences
                };
                
                // Firebase wins - update both state and localStorage
                setSettings(mergedSettings);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
                setLastSyncTime(new Date());
                setIsLoading(false);
                return;
              }
            }
            
            // No settings in Firebase yet, but user is authenticated
            // Use local settings if available, otherwise defaults
            const savedSettings = localStorage.getItem(SETTINGS_KEY);
            if (savedSettings) {
              const parsedSettings = JSON.parse(savedSettings) as AppSettings;
              const mergedSettings = {
                ...defaultSettings,
                ...parsedSettings,
                companionHistory: parsedSettings.companionHistory || defaultSettings.companionHistory,
                navigationPreferences: parsedSettings.navigationPreferences || defaultSettings.navigationPreferences
              };
              setSettings(mergedSettings);
              
              // Save to Firebase for first time
              if (hasPaidPlan(subscription)) {
                try {
                  await setDoc(
                    doc(db, 'users', user.uid),
                    { settings: mergedSettings },
                    { merge: true }
                  );
                  console.log('📤 Initial settings uploaded to Firebase');
                } catch (error) {
                  console.warn('Could not upload initial settings:', error);
                }
              }
            } else {
              setSettings(defaultSettings);
            }
          } catch (error) {
            console.error('Error loading settings from Firebase:', error);
            // Fall back to localStorage only on Firebase error
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
          }
        } else {
          // Not authenticated - use localStorage only
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
          if (user && hasPaidPlan(subscription) && db) {
            console.log('💾 Saving settings to Firebase');
            try {
              const userRef = doc(db, 'users', user.uid);
              await setDoc(
                userRef,
                { settings },
                { merge: true }
              );
            } catch (fbError) {
              console.warn('Could not save settings to Firebase:', fbError);
              // Continue without throwing - settings are already in localStorage
            }
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

  // Force sync from Firebase (for manual trigger)
  const forceSyncFromFirebase = async (): Promise<boolean> => {
    if (!user || !db) {
      console.log('❌ Cannot sync: User not authenticated or DB not available');
      return false;
    }

    try {
      console.log('⚡ Force sync triggered by user');
      
      // Parallel sync all data types
      const syncPromises: Promise<void>[] = [];
      
      // 1. Sync settings - two-way sync
      syncPromises.push(
        getDoc(doc(db, 'users', user.uid)).then(async (userDoc) => {
          const hasCloudSettings = userDoc.exists() && userDoc.data().settings;
          
          if (hasCloudSettings) {
            // Cloud has settings - use as source of truth
            const cloudSettings = userDoc.data().settings as AppSettings;
            const mergedSettings = {
              ...defaultSettings,
              ...cloudSettings,
              companionHistory: cloudSettings.companionHistory || defaultSettings.companionHistory,
              navigationPreferences: cloudSettings.navigationPreferences || defaultSettings.navigationPreferences
            };
            
            setSettings(mergedSettings);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedSettings));
            console.log('✅ Settings synced from Firebase');
          } else if (settings && Object.keys(settings).length > 0) {
            // No cloud settings but have local - upload them
            console.log('📤 Uploading local settings to cloud...');
            await setDoc(
              doc(db, 'users', user.uid),
              { settings },
              { merge: true }
            );
            console.log('✅ Settings uploaded to Firebase');
          }
        }).catch(error => console.warn('Could not sync settings:', error))
      );
      
      // 2. Sync achievements and stats for paid users
      if (hasPaidPlan(subscription)) {
        // Sync user stats - two-way sync
        syncPromises.push(
          getDoc(doc(db, 'users', user.uid, 'achievementStats', 'current')).then(async (statsDoc) => {
            const localStatsStr = localStorage.getItem('doshi_sensei_achievements');
            const localStats = localStatsStr ? JSON.parse(localStatsStr) : null;
            
            if (statsDoc.exists()) {
              // Cloud has stats - use as source of truth
              const cloudStats = statsDoc.data();
              localStorage.setItem('doshi_sensei_achievements', JSON.stringify(cloudStats));
              console.log('✅ Achievement stats synced from Firebase');
            } else if (localStats) {
              // No cloud stats but have local - upload them
              console.log('📤 Uploading local achievement stats to cloud...');
              const { AchievementPremiumSync } = await import('@/lib/achievements/premiumSync');
              await AchievementPremiumSync.syncUserStats(user, localStats, subscription);
              console.log('✅ Achievement stats uploaded to Firebase');
            }
          }).catch(error => console.warn('Could not sync achievement stats:', error))
        );
        
        // Sync achievements - upload local to cloud if they don't exist there
        syncPromises.push(
          (async () => {
            try {
              const { AchievementPremiumSync } = await import('@/lib/achievements/premiumSync');
              const { default: EnhancedStorageManager } = await import('@/utils/storage');
              
              // Get local achievements
              const localAchievements = await EnhancedStorageManager.getUnlockedAchievements();
              
              // Download cloud achievements to see what's there
              const cloudAchievements = await AchievementPremiumSync.downloadUnlockedAchievements(user, subscription);
              
              // If we have local achievements but no cloud achievements, upload them
              if (localAchievements.length > 0 && (!cloudAchievements || cloudAchievements.length === 0)) {
                console.log('📤 Uploading local achievements to cloud...');
                for (const achievement of localAchievements) {
                  await AchievementPremiumSync.syncUnlockedAchievement(user, achievement, subscription);
                }
                console.log(`✅ Uploaded ${localAchievements.length} achievements to cloud`);
              } else if (cloudAchievements && cloudAchievements.length > 0) {
                // Cloud has achievements, use them (cloud wins)
                console.log('📥 Using cloud achievements as source of truth');
                await EnhancedStorageManager.clearUnlockedAchievements();
                for (const achievement of cloudAchievements) {
                  await EnhancedStorageManager.saveUnlockedAchievement(achievement);
                }
              } else {
                console.log('ℹ️ No achievements to sync');
              }
            } catch (error) {
              console.warn('Could not sync achievements:', error);
            }
          })()
        );
        
        // Sync user stats document - two-way sync
        syncPromises.push(
          getDoc(doc(db, 'userStats', user.uid)).then(async (statsDoc) => {
            const localStatsStr = localStorage.getItem('doshi_sensei_stats');
            const localStats = localStatsStr ? JSON.parse(localStatsStr) : null;
            
            if (statsDoc.exists()) {
              // Cloud has stats - use as source of truth
              const cloudStats = statsDoc.data();
              localStorage.setItem('doshi_sensei_stats', JSON.stringify(cloudStats));
              console.log('✅ User stats synced from Firebase');
            } else if (localStats) {
              // No cloud stats but have local - upload them
              console.log('📤 Uploading local user stats to cloud...');
              await setDoc(doc(db, 'userStats', user.uid), localStats);
              console.log('✅ User stats uploaded to Firebase');
            }
          }).catch(error => console.warn('Could not sync user stats:', error))
        );
      }
      
      // Wait for all syncs to complete
      await Promise.all(syncPromises);
      
      setLastSyncTime(new Date());
      console.log('✅ Force sync completed successfully');
      
      // Force a window refresh event to update UI
      window.dispatchEvent(new Event('storage'));
      
      return true;
      
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return false;
    }
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
    resetSettings,
    forceSyncFromFirebase,
    lastSyncTime
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