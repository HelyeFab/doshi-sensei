'use client';

import { useState, useEffect } from 'react';
import { getStrings, Language, getUserPreferredLanguage, getSupportedLanguages, strings } from '@/config/strings';

export function useLanguage() {
  // Initialize with default language
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get saved language on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('doshi-language') as Language;
      if (saved && saved in strings) {
        return saved;
      }
    }
    return 'en';
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check localStorage first
    const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('doshi-language') as Language : null;
    
    // Use saved language if available, otherwise detect user's preferred language
    const preferredLanguage = savedLanguage && savedLanguage in strings ? savedLanguage : getUserPreferredLanguage();
    
    // Only update if different from current
    if (preferredLanguage !== language) {
      setLanguage(preferredLanguage);
    }
  }, [language]);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi-language', newLanguage);
      // Reload the page to apply the new language
      window.location.reload();
    }
  };

  return {
    language,
    setLanguage: changeLanguage,
    strings: getStrings(language),
    isLoading,
    supportedLanguages: getSupportedLanguages()
  };
}

/**
 * Hook for getting strings without language switching
 * Useful for components that don't need language switching
 */
export function useStrings() {
  const { strings } = useLanguage();
  return strings;
}

/**
 * Hook for language switching functionality
 * Useful for language selector components
 */
export function useLanguageSwitcher() {
  const { language, setLanguage, supportedLanguages } = useLanguage();

  return {
    currentLanguage: language,
    changeLanguage: setLanguage,
    supportedLanguages
  };
}
