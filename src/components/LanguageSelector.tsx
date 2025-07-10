import React from 'react';
import { useLanguageSwitcher } from '@/hooks/useLanguage';

const languageNames: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  ja: '日本語',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  ko: '한국어',
  zh: '中文'
};

export function LanguageSelector() {
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguageSwitcher();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium">
        Language:
      </label>
      <select
        id="language-select"
        value={currentLanguage}
        onChange={(e) => changeLanguage(e.target.value as any)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang] || lang}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LanguageSelectorCompact() {
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguageSwitcher();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value as any)}
      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {supportedLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
