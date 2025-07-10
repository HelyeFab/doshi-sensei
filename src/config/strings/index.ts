import { en } from './en';
import { fr } from './fr';

// Current languages
export const strings = {
  en,
  fr,
  // Future languages will be added here:
  // ja: Japanese
  // de: German
  // es: Spanish
  // it: Italian
  // ko: Korean
  // zh: Chinese
};

export type Language = keyof typeof strings;
export type StringKeys = keyof typeof en;

/**
 * Get strings for a specific language
 * @param language - The language code (e.g., 'en', 'fr', 'ja')
 * @returns The strings object for the specified language, falls back to English
 */
export function getStrings(language: Language = 'en') {
  return strings[language] || strings.en;
}

/**
 * Get list of supported languages
 * @returns Array of supported language codes
 */
export function getSupportedLanguages(): Language[] {
  return Object.keys(strings) as Language[];
}

/**
 * Check if a language is supported
 * @param language - The language code to check
 * @returns True if the language is supported
 */
export function isLanguageSupported(language: string): language is Language {
  return language in strings;
}

/**
 * Get user's preferred language from browser
 * @returns The user's preferred language if supported, otherwise 'en'
 */
export function getUserPreferredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  const userLang = navigator.language.split('-')[0] as Language;
  return isLanguageSupported(userLang) ? userLang : 'en';
}

// Default export for backward compatibility
export { en as default } from './en';
