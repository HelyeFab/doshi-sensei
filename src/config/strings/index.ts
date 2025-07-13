import { en } from './en';
import { fr } from './translations/fr';
import { it } from './translations/it';
import { de } from './translations/de';
import { es } from './translations/es';
import { ar } from './translations/ar';
import { ko } from './translations/ko';

// All available languages
export const strings = {
  en,
  fr,
  it,
  de,
  es,
  ar,
  ko
};

export type Language = keyof typeof strings;
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
