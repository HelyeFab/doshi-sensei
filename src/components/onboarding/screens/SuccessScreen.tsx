'use client';

import { useState } from 'react';
import { TutorialButton } from '../components/TutorialButton';
import { ColorScheme } from '@/types';

export interface SuccessScreenProps {
  onComplete: () => void;
}

export function SuccessScreen({ onComplete }: SuccessScreenProps) {
  const [settingsShown, setSettingsShown] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorScheme>('default');
  const [showRomaji, setShowRomaji] = useState(true);

  const themes: { name: ColorScheme; color: string; label: string }[] = [
    { name: 'default', color: '#6366f1', label: 'Classic' },
    { name: 'ocean', color: '#0ea5e9', label: 'Ocean' },
    { name: 'forest', color: '#22c55e', label: 'Forest' },
    { name: 'sunset', color: '#f97316', label: 'Sunset' }
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

  return (
    <div className="space-y-6 p-6">
      {!settingsShown ? (
        // Success Screen
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="text-6xl animate-bounce">🎌</div>
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🌟</div>
            <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse delay-300">✨</div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              おめでとう！ Congratulations!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              You're now equipped with the knowledge to conquer Japanese conjugations.
              <span className="font-semibold text-primary"> The verbs don't stand a chance! </span>
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-foreground">🎯 You're ready to:</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Browse and save Japanese vocabulary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Study detailed conjugation patterns</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Practice with intelligent drills</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Track your learning progress</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <TutorialButton
              onClick={handleSettingsDemo}
              variant="secondary"
              className="mb-2"
            >
              🎨 Quick Settings Preview
            </TutorialButton>
            <p className="text-xs text-muted-foreground">
              (Optional: Customize your experience)
            </p>
          </div>
        </div>
      ) : (
        // Settings Demo
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Make It Yours! 🎨
            </h2>
            <p className="text-muted-foreground">
              Quick settings to personalize your learning experience
            </p>
          </div>

          {/* Theme Selection Demo */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Choose Your Vibe:</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`p-3 border rounded-lg transition-all text-center ${
                    selectedTheme === theme.name
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
                  className={`w-12 h-6 rounded-full transition-colors ${
                    showRomaji ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      showRomaji ? 'translate-x-6' : 'translate-x-0.5'
                    } mt-0.5`}
                  ></div>
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

      {/* Final Action */}
      <div className="text-center pt-4">
        {!settingsShown ? (
          <TutorialButton onClick={handleFinish} variant="primary" size="large">
            🚀 Start Learning Japanese!
          </TutorialButton>
        ) : (
          <div className="space-y-3">
            <TutorialButton onClick={handleFinish} variant="primary" size="large">
              Perfect! Let's Start Learning! 🎌
            </TutorialButton>
            <p className="text-xs text-muted-foreground">
              You can always change these settings later in the Settings page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
