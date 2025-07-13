'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/config/strings';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  strings: any; // Will be properly typed based on the language
  isLoading: boolean;
  supportedLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const languageData = useLanguage();

  return (
    <LanguageContext.Provider value={languageData}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Hook for getting strings with proper typing
 * Use this instead of useStrings() for better type safety
 */
export function useTypedStrings() {
  const { strings } = useLanguageContext();
  return strings;
}
