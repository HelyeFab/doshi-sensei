'use client';

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AppSettings } from "@/types";
import { SettingsManager } from "@/utils/indexedDB";

/**
 * Client component to connect settings context to theme provider
 * Handles hydration issues by ensuring consistent rendering
 */
export function ClientThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings, isLoading } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [initialTheme, setInitialTheme] = useState<AppSettings['theme']>('system');

  // Load theme from IndexedDB immediately to prevent flash
  useEffect(() => {
    const loadInitialTheme = async () => {
      try {
        // Try to get theme from IndexedDB before settings context loads
        const savedSettings = await SettingsManager.loadSettings();
        
        if (savedSettings && savedSettings.theme && savedSettings.theme !== 'system') {
          console.log(`[ClientThemeWrapper] Loading initial theme from IndexedDB: ${savedSettings.theme}`);
          setInitialTheme(savedSettings.theme);
        } else {
          // Migration fallback: Check localStorage for existing theme
          const localStorageSettings = localStorage.getItem('doshi_sensei_settings');
          const backupTheme = localStorage.getItem('doshi_sensei_theme');
          
          if (localStorageSettings) {
            try {
              const parsed = JSON.parse(localStorageSettings);
              if (parsed.theme && parsed.theme !== 'system') {
                console.log(`[ClientThemeWrapper] Found theme in localStorage during migration: ${parsed.theme}`);
                setInitialTheme(parsed.theme);
              }
            } catch (e) {
              // Fallback to backup theme
              if (backupTheme && backupTheme !== 'system') {
                setInitialTheme(backupTheme as AppSettings['theme']);
              }
            }
          } else if (backupTheme && backupTheme !== 'system') {
            setInitialTheme(backupTheme as AppSettings['theme']);
          }
        }
      } catch (error) {
        console.error('[ClientThemeWrapper] Error loading initial theme from IndexedDB:', error);
      }
      
      setMounted(true);
    };

    loadInitialTheme();
  }, []);

  // Use the initial theme until settings are loaded, then switch to settings theme
  const theme = !isLoading && mounted ? settings.theme : initialTheme;
  const colorScheme = !isLoading && mounted ? settings.colorScheme : 'default';

  return <ThemeProvider theme={theme} colorScheme={colorScheme}>{children}</ThemeProvider>;
}
