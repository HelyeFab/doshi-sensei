import { en } from './en';

// English only - removed multi-language support
export const strings = {
  en
};

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
  
  const userLang = navigator.language.split('-')[0] as Language;
  return isLanguageSupported(userLang) ? userLang : 'en';
}

export { en as default } from './en';
