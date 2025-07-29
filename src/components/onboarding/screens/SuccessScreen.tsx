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
  const tutorial = strings?.tutorial;
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

    onComplete();
  };

  if (settingsShown) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="space-y-4 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {tutorial.success.settingsTitle}
          </h2>
          <p className="text-foreground/80">
            {tutorial.success.settingsDescription}
          </p>

          {/* Theme Selection */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">
              {tutorial.success.themeHeader}
            </h3>
            <div className="flex justify-center gap-3 flex-wrap">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === theme.name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full mb-2"
                    style={{ backgroundColor: theme.color }}
                  />
                  <span className="text-sm text-foreground">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Romaji Toggle */}
          <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-4 max-w-md mx-auto shadow-lg">
            <h3 className="font-medium text-foreground mb-3">
              {tutorial.success.preferencesHeader}
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-foreground">{tutorial.success.romajiLabel}</div>
                <div className="text-sm text-foreground/70">{tutorial.success.romajiDescription}</div>
              </div>
              <input
                type="checkbox"
                checked={showRomaji}
                onChange={(e) => setShowRomaji(e.target.checked)}
                className="w-5 h-5 rounded border-border"
              />
            </label>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-4 max-w-md mx-auto shadow-lg">
            <h3 className="text-sm font-medium text-foreground/70 mb-2">
              {tutorial.success.previewHeader}
            </h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">食べる</div>
              {showRomaji && (
                <div className="text-sm text-foreground/70">{tutorial.success.demoRomaji}</div>
              )}
              <div className="text-sm text-foreground/70 mt-1">{tutorial.success.demoWord}</div>
            </div>
          </div>

          <p className="text-sm text-foreground/70">
            {tutorial.success.settingsNote}
          </p>
        </div>

        <TutorialButton onClick={handleFinish} variant="primary" size="large">
          {tutorial.success.startButtonSettings}
        </TutorialButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      {/* Success Animation */}
      <div className="text-6xl md:text-7xl animate-bounce">🎉</div>

      {/* Main Content */}
      <div className="space-y-4 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          {tutorial.success.title}
        </h2>
        <p className="text-lg text-foreground/80">
          {tutorial.success.description}
        </p>
        <p className="text-lg font-semibold text-primary">
          {tutorial.success.emphasis}
        </p>

        {/* Checklist */}
        <div className="bg-gradient-to-br from-background to-background/80 border border-primary/20 rounded-lg p-4 max-w-md mx-auto shadow-lg">
          <h3 className="font-medium text-foreground mb-3">
            {tutorial.success.checklistHeader}
          </h3>
          <div className="space-y-2 text-left">
            <div className="text-sm text-foreground/90">{tutorial.success.checklistItems.vocabulary}</div>
            <div className="text-sm text-foreground/90">{tutorial.success.checklistItems.conjugations}</div>
            <div className="text-sm text-foreground/90">{tutorial.success.checklistItems.games}</div>
            <div className="text-sm text-foreground/90">{tutorial.success.checklistItems.reading}</div>
            <div className="text-sm text-foreground/90">{tutorial.success.checklistItems.tracking}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <TutorialButton onClick={handleFinish} variant="primary" size="large">
          {tutorial.success.startButton}
        </TutorialButton>
        
        <div className="text-center">
          <button
            onClick={handleSettingsDemo}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {tutorial.success.settingsButton}
          </button>
          <p className="text-xs text-foreground/60 mt-1">
            {tutorial.success.settingsSubtext}
          </p>
        </div>
      </div>
    </div>
  );
}