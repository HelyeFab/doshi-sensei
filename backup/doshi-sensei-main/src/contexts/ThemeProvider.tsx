'use client';

import { useEffect, useState } from 'react';
import { AppSettings } from '@/types';

interface ThemeProviderProps {
  children: React.ReactNode;
  theme: AppSettings['theme'];
}

/**
 * ThemeProvider component
 * Applies the selected theme to the document
 */
export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Only run once on mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only apply theme after component has mounted to avoid hydration mismatch
    if (!mounted) return;

    // Function to apply theme
    const applyTheme = (theme: 'dark' | 'light' | 'system') => {
      const root = document.documentElement;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const effectiveTheme = theme === 'system' ? systemTheme : theme;

      // Remove both classes first
      root.classList.remove('dark', 'light');
      // Add the appropriate class
      root.classList.add(effectiveTheme);
    };

    // Apply theme on settings change
    applyTheme(theme);

    // Listen for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        applyTheme('system');
      };

      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme, mounted]);

  // Return children regardless of mounted state to avoid hydration mismatch
  return <>{children}</>;
}
