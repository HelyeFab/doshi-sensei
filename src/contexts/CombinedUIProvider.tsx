'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { LanguageProvider, useLanguageContext, useStrings } from './LanguageContext';
import { ClientThemeWrapper } from '@/components/ClientThemeWrapper';

// Combined context that provides all UI-related contexts
interface CombinedUIContextType {
  settings: ReturnType<typeof useSettings>;
  language: ReturnType<typeof useLanguageContext>;
  strings: ReturnType<typeof useStrings>;
}

const CombinedUIContext = createContext<CombinedUIContextType | null>(null);

// Hook to use combined UI context
export function useCombinedUI() {
  const context = useContext(CombinedUIContext);
  if (!context) {
    throw new Error('useCombinedUI must be used within CombinedUIProvider');
  }
  return context;
}

// Inner component that has access to all individual contexts
function CombinedUIInner({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const language = useLanguageContext();
  const strings = useStrings();

  const value = React.useMemo(() => ({
    settings,
    language,
    strings
  }), [settings, language, strings]);

  return (
    <CombinedUIContext.Provider value={value}>
      {children}
    </CombinedUIContext.Provider>
  );
}

// Main provider that wraps all UI-related providers
export function CombinedUIProvider({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <LanguageProvider>
        <ClientThemeWrapper>
          <CombinedUIInner>
            {children}
          </CombinedUIInner>
        </ClientThemeWrapper>
      </LanguageProvider>
    </SettingsProvider>
  );
}

// Export individual hooks for backward compatibility
export { useSettings } from './SettingsContext';
export { useLanguageContext, useStrings } from './LanguageContext';