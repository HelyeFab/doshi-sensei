'use client';

import { useState } from 'react';
import { TutorialButton } from '../components/TutorialButton';
import { ColorScheme } from '@/types';
import { useStrings } from '@/contexts/LanguageContext';

export interface SuccessScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function SuccessScreen({ onComplete, onBack }: SuccessScreenProps) {
  const strings = useStrings();
  const tutorial = strings.tutorial;
  const [settingsShown, setSettingsShown] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorScheme>('default');
  const [showRomaji, setShowRomaji] = useState(true);

  if (!tutorial || !tutorial.success) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const themes: { name: ColorScheme; color: string; label: string }[] = [
    { name: 'default', color: '#6366f1', label: tutorial.success.themes.classic },
    { name: 'ocean', color: '#0ea5e9', label: tutorial.success.themes.ocean },
    { name: 'forest', color: '#22c55e', label: tutorial.success.themes.forest },
    { name: 'sunset', color: '#f97316', label: tutorial.success.themes.sunset }
  ];

  const handleSettingsDemo = () => {
    setSettingsShown(true);
  };

  const handleFinish = async () => {
    // Save onboarding completion
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_onboarding_completed', 'true');
      localStorage.setItem('doshi_onboarding_date', new Date().toISOString());

      // Apply selected settings if changed
      if (selectedTheme !== 'default' || !showRomaji) {
        const currentSettings = JSON.parse(localStorage.getItem('doshi_sensei_settings') || '{}');
        const newSettings = {
          ...currentSettings,
          colorScheme: selectedTheme,
          showRomaji: showRomaji
        };
        localStorage.setItem('doshi_sensei_settings', JSON.stringify(newSettings));
      }
    }

    // Just call onComplete instead of redirecting
    // The navigation system will handle the routing properly
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      {!settingsShown ? (
        // Success Screen
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="text-6xl animate-bounce">🎌</div>
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🌟</div>
            <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse delay-300">✨</div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">
              {tutorial.success.title}
            </h1>
            <p className="text-lg text-white/90 max-w-md mx-auto">
              {tutorial.success.description}
              <span className="font-semibold text-white"> {tutorial.success.emphasis} </span>
            </p>
          </div>


          {/* Settings button removed to avoid duplication with navigation bar */}
        </div>
      ) : (
        // Settings Demo
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {tutorial.success.settingsTitle}
            </h2>
            <p className="text-muted-foreground">
              {tutorial.success.settingsDescription}
            </p>
          </div>

          {/* Theme Selection Demo */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">{tutorial.success.themeHeader}</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`p-3 border rounded-lg transition-all text-center ${selectedTheme === theme.name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                    }`}
                  style={{
                    backgroundColor: selectedTheme === theme.name ? `${theme.color}10` : undefined,
                    borderColor: selectedTheme === theme.name ? theme.color : undefined
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: theme.color }}
                  ></div>
                  <div className="text-sm font-medium">{theme.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Romaji Toggle Demo */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Learning Preferences:</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-foreground">Show Romaji</div>
                <div className="text-sm text-muted-foreground">
                  Display romanized pronunciation (たべる → taberu)
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showRomaji}
                  onChange={(e) => setShowRomaji(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`relative inline-flex h-4 sm:h-6 w-14 items-center rounded-full transition-colors px-1 ${showRomaji ? 'bg-primary' : 'bg-muted'}`}
                  style={{ minWidth: 56 }}
                  aria-pressed={showRomaji}
                  tabIndex={0}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${showRomaji ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </div>
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-2">Preview:</div>
            <div className="space-y-1">
              <div className="text-lg japanese-text font-bold" style={{ color: themes.find(t => t.name === selectedTheme)?.color }}>
                食べる
              </div>
              {showRomaji && (
                <div className="text-sm text-muted-foreground">taberu</div>
              )}
              <div className="text-sm text-foreground">"to eat"</div>
            </div>
          </div>
        </div>
      )}

      {/* Get Started Button - Only shown when not in settings demo */}
      {!settingsShown && (
        <div className="text-center pt-4">
          <button
            onClick={handleFinish}
            className="px-8 py-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all transform hover:scale-105 text-lg"
          >
            🚀 Get Started
          </button>
        </div>
      )}

      {/* Settings Demo Button */}
      {!settingsShown && (
        <div className="text-center pt-4">
          <TutorialButton
            onClick={handleSettingsDemo}
            variant="secondary"
            className="mb-2"
          >
            {tutorial.success.settingsButton}
          </TutorialButton>
          <p className="text-xs text-white/70">
            {tutorial.success.settingsSubtext}
          </p>
        </div>
      )}

      {/* Finish Button - Only shown in settings demo */}
      {settingsShown && (
        <div className="text-center pt-4">
          <button
            onClick={handleFinish}
            className="px-8 py-4 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all transform hover:scale-105 text-lg"
          >
            🏠 Go to Homepage
          </button>
        </div>
      )}
    </div>
  );
}
