'use client';

import { useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useStrings } from '@/contexts/LanguageContext';
import SmartHeader from '@/components/SmartHeader';
import { Switch } from '@/components/Switch';
import { ThemeSelector } from '@/components/ThemeSelector';

// Settings Section Component
interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b border-border">
        <h2 className="font-medium text-foreground">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// Toggle Setting Component using Switch
interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 pr-4">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        size="md"
      />
    </div>
  );
}


export default function SettingsClient() {
  const strings = useStrings();
  const { settings, updateSetting, resetSettings } = useSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetData = () => {
    if (showResetConfirm) {
      resetSettings();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
      // Auto-hide confirmation after 5 seconds
      setTimeout(() => setShowResetConfirm(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SmartHeader title={strings.settings.title} />

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="space-y-6">
            
            {/* Virtual Companion Settings */}
            <SettingsSection title={strings.settings.virtualCompanion}>
              <div className="space-y-4">
                <ToggleSetting
                  label={strings.settings.showVirtualCompanion}
                  description={strings.settings.showVirtualCompanionDesc}
                  checked={settings.showCompanion ?? true}
                  onChange={(checked) => updateSetting('showCompanion', checked)}
                />
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {strings.settings.virtualCompanionInfo}
                  </p>
                </div>
              </div>
            </SettingsSection>

            {/* Appearance Section */}
            <SettingsSection title={strings.settings.appearance}>
              <ThemeSelector
                currentTheme={settings.theme}
                currentColorScheme={settings.colorScheme}
                onThemeChange={(theme, colorScheme) => {
                  updateSetting('theme', theme);
                  updateSetting('colorScheme', colorScheme);
                }}
              />
            </SettingsSection>

            {/* Tutorial & Learning */}
            <SettingsSection title={strings.settings.tutorialLearning}>
              <div className="space-y-4">
                <ToggleSetting
                  label={strings.settings.showRomaji}
                  description="Display romanized Japanese text"
                  checked={settings.showRomaji}
                  onChange={(checked) => updateSetting('showRomaji', checked)}
                />
                <ToggleSetting
                  label={strings.settings.showFurigana}
                  description="Show reading aids above kanji"
                  checked={settings.showFurigana ?? true}
                  onChange={(checked) => updateSetting('showFurigana', checked)}
                />
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {strings.settings.tutorialInfo}
                  </p>
                </div>
              </div>
            </SettingsSection>

            {/* Navigation Settings */}
            <SettingsSection title={strings.settings.navigation}>
              <div className="space-y-4">
                <ToggleSetting
                  label={strings.settings.navigationGestures}
                  description={strings.settings.navigationGesturesDesc}
                  checked={settings.navigationGestures !== false}
                  onChange={(checked) => updateSetting('navigationGestures', checked)}
                />
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Swipe from the edge of the screen to go back or forward in your navigation history
                  </p>
                </div>
              </div>
            </SettingsSection>

            {/* Goals & Progress Section */}
            <SettingsSection title={strings.settings.goalsProgress}>
              <div className="space-y-4">
                {/* Daily Goal */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    {strings.settings.dailyGoalWords}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSetting('dailyGoal', Math.max(1, settings.dailyGoal - 5))}
                      className="p-2 rounded-lg border border-border hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="px-4 py-2 bg-muted rounded-lg min-w-[80px] text-center">
                      <span className="font-medium">{settings.dailyGoal}</span>
                    </div>
                    <button
                      onClick={() => updateSetting('dailyGoal', settings.dailyGoal + 5)}
                      className="p-2 rounded-lg border border-border hover:bg-muted"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Practice Reminders */}
                <ToggleSetting
                  label={strings.settings.practiceReminders}
                  description="Get daily reminders to practice"
                  checked={settings.practiceReminders}
                  onChange={(checked) => updateSetting('practiceReminders', checked)}
                />
              </div>
            </SettingsSection>

            {/* Data Management Section */}
            <SettingsSection title={strings.settings.dataManagement}>
              <div className="space-y-3">
                <button
                  onClick={handleResetData}
                  className={`w-full p-3 rounded-lg border transition-all ${
                    showResetConfirm 
                      ? 'border-destructive bg-destructive/10 text-destructive' 
                      : 'border-border hover:border-destructive/50 text-foreground hover:text-destructive'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {showResetConfirm ? strings.settings.resetAllDataConfirm : strings.settings.resetAllData}
                  </div>
                  {!showResetConfirm && (
                    <div className="text-xs text-muted-foreground mt-1">{strings.settings.resetAllDataDesc}</div>
                  )}
                </button>
              </div>
            </SettingsSection>

            {/* About Section */}
            <SettingsSection title={strings.settings.about}>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Dōshi Sensei v1.0</p>
                <p>© 2025 Dōshi Sensei Team</p>
                <p>Learn Japanese with confidence</p>
              </div>
            </SettingsSection>
          </div>
        </main>
      </div>
    </div>
  );
}