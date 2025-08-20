import { en } from './en';

// English only - simplified for clean rebuild
export const strings = {
  en
} as const;

export type Language = 'en';
export type StringKeys = keyof typeof en;

// Helper functions
export function getStrings(language: Language = 'en') {
  return strings[language] || strings.en;
}

export function getSupportedLanguages(): Language[] {
  return Object.keys(strings) as Language[];
}

export function isLanguageSupported(language: string): language is Language {
  return language in strings;
}

export function getUserPreferredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  // For now, always return English since we only support it
  // In the future, this could be expanded to check navigator.language
  return 'en';
}

// Export the English strings as default
export { en as default } from './en';
export type EnglishStrings = typeof en;