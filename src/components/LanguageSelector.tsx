'use client';

import { useLanguageSwitcher } from '@/hooks/useLanguage';
import { Language } from '@/config/strings';

const languageInfo: Record<Language, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  fr: { name: 'Français', flag: '🇫🇷' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  es: { name: 'Español', flag: '🇪🇸' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  ko: { name: '한국어', flag: '🇰🇷' },
};

export function LanguageSelector() {
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguageSwitcher();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {supportedLanguages.map((lang) => {
          const info = languageInfo[lang];
          const isSelected = currentLanguage === lang;

          return (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`
                flex items-center justify-center gap-2 p-3 rounded-lg border transition-all
                ${isSelected 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <span className="text-2xl">{info.flag}</span>
              <span className="font-medium">{info.name}</span>
              {isSelected && <span className="text-primary">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}