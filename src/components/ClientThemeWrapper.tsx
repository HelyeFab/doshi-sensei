'use client';

import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";

/**
 * Client component to connect settings context to theme provider
 * Handles hydration issues by ensuring consistent rendering
 */
export function ClientThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  // Only run once on mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use system theme and default scheme during server rendering to avoid hydration mismatch
  const theme = mounted ? settings.theme : 'system';
  const colorScheme = mounted ? settings.colorScheme : 'default';

  return <ThemeProvider theme={theme} colorScheme={colorScheme}>{children}</ThemeProvider>;
}
