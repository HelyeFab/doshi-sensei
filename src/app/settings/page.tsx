'use client';

import { strings } from '@/config/strings';
import { useSettings } from '@/contexts/SettingsContext';
import { clearProgress } from '@/utils/storage';
import { PageHeader } from '@/components/PageHeader';

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useSettings();

  // Handle reset progress
  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      clearProgress();
      console.log('Progress reset');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <PageHeader title={strings.settings.title} />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto">
        <div className="space-y-8">
          {/* Theme Settings */}
          <SettingsSection title="Theme">
            <div className="grid grid-cols-3 gap-3">
              <ThemeOption
                value="light"
                label={strings.settings.lightMode}
                selected={settings.theme === 'light'}
                onClick={() => updateSetting('theme', 'light')}
              />
              <ThemeOption
                value="dark"
                label={strings.settings.darkMode}
                selected={settings.theme === 'dark'}
                onClick={() => updateSetting('theme', 'dark')}
              />
              <ThemeOption
                value="system"
                label="System"
                selected={settings.theme === 'system'}
                onClick={() => updateSetting('theme', 'system')}
              />
            </div>
          </SettingsSection>

          {/* Display Settings */}
          <SettingsSection title="Display">
            <div className="space-y-4">
              <ToggleSetting
                label="Show Romaji"
                description="Display romaji transliteration for Japanese words"
                checked={settings.showRomaji}
                onChange={(checked) => updateSetting('showRomaji', checked)}
              />

              {/* Language selector - not in settings context yet */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Language
                </label>
                <select
                  value="en"
                  onChange={() => {}}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground"
                  disabled
                >
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Language selection will be available in a future update
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* Goals & Progress */}
          <SettingsSection title="Goals & Progress">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Daily Goal (words)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={settings.dailyGoal}
                    onChange={(e) => updateSetting('dailyGoal', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-foreground font-medium w-8 text-center">
                    {settings.dailyGoal}
                  </span>
                </div>
              </div>

              <ToggleSetting
                label="Practice Reminders"
                description="Receive daily reminders to practice"
                checked={settings.practiceReminders}
                onChange={(checked) => updateSetting('practiceReminders', checked)}
              />

              <div className="pt-2 space-y-4">
                <div>
                  <button
                    onClick={handleResetProgress}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                  >
                    Reset Progress
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will reset all your progress, statistics, and learning history.
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
                        resetSettings();
                      }
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                  >
                    Reset Settings
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will reset all settings to their default values.
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* About */}
          <SettingsSection title="About">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm text-foreground">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Build</span>
                <span className="text-sm text-foreground">2025.06.12</span>
              </div>
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  Doshi Sensei is a Japanese verb and adjective conjugation practice app.
                  Built with Next.js and designed to help you master Japanese conjugations.
                </p>
              </div>
            </div>
          </SettingsSection>
        </div>
      </main>
    </div>
  );
}

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

interface ThemeOptionProps {
  value: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function ThemeOption({ value, label, selected, onClick }: ThemeOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-center transition-colors ${
        selected
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-background border-border text-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
}

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
