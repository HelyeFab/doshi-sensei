'use client';

import { useEffect, useState } from 'react';
import { AppSettings, ThemeMode, ColorScheme } from '@/types';
import { applyTheme } from '@/utils/themes';

interface ThemeProviderProps {
  children: React.ReactNode;
  theme: AppSettings['theme'];
  colorScheme: AppSettings['colorScheme'];
}

/**
 * ThemeProvider component
 * Applies the selected theme and color scheme to the document
 */
export function ThemeProvider({ children, theme, colorScheme }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Only run once on mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only apply theme after component has mounted to avoid hydration mismatch
    if (!mounted) return;

    // Function to apply theme and color scheme
    const applyThemeAndScheme = (themeMode: ThemeMode, scheme: ColorScheme) => {
      applyTheme(scheme, themeMode);
    };

    // Apply theme on settings change
    applyThemeAndScheme(theme, colorScheme);

    // Listen for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        applyThemeAndScheme('system', colorScheme);
      };

      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme, colorScheme, mounted]);

  // Return children regardless of mounted state to avoid hydration mismatch
  return <>{children}</>;
}
