'use client';

import { useLanguageSwitcher } from '@/hooks/useLanguage';
import { Language } from '@/config/strings';

const languageInfo: Record<Language | 'it' | 'de' | 'es', { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  fr: { name: 'Français', flag: '🇫🇷' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  es: { name: 'Español', flag: '🇪🇸' },
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
        
        {/* Future languages - disabled for now */}
        {(['it', 'de', 'es'] as const).map((lang) => {
          const info = languageInfo[lang];
          
          return (
            <button
              key={lang}
              disabled
              className="
                flex items-center justify-center gap-2 p-3 rounded-lg border
                border-border/50 bg-muted/20 text-muted-foreground/50 cursor-not-allowed
                relative overflow-hidden
              "
            >
              <span className="text-2xl opacity-50">{info.flag}</span>
              <span className="font-medium">{info.name}</span>
              <span className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs">
                Coming Soon
              </span>
            </button>
          );
        })}
      </div>
      
      {supportedLanguages.length < 5 && (
        <p className="text-sm text-muted-foreground text-center">
          🌍 More languages coming soon!
        </p>
      )}
    </div>
  );
}