'use client';

import { useSettings } from '@/contexts/SettingsContext';
import { useStrings } from '@/contexts/LanguageContext';
import SmartHeader from '@/components/SmartHeader';
import { Switch } from '@/components/Switch';
import { ThemeSelector } from '@/components/ThemeSelector';
import { CacheManagement } from '@/components/CacheManagement';

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
  const { settings, updateSetting } = useSettings();

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
                  <p className="text-xs text-secondary-foreground">
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
                  <p className="text-xs text-secondary-foreground">
                    Swipe from the edge of the screen to go back or forward in your navigation history
                  </p>
                </div>
              </div>
            </SettingsSection>

            {/* Cache & Storage Management */}
            <SettingsSection title="Cache & Storage">
              <CacheManagement />
            </SettingsSection>

            {/* Support & Feedback */}
            <SettingsSection title="Support & Feedback">
              <div className="space-y-3">
                <a
                  href="/contact"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Contact Us</div>
                  <div className="text-xs text-muted-foreground mt-1">Get in touch with our support team</div>
                </a>
                <a
                  href="/contact?type=bug"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Report a Bug</div>
                  <div className="text-xs text-muted-foreground mt-1">Help us improve by reporting issues</div>
                </a>
                <a
                  href="/contact?type=feedback"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Send Feedback</div>
                  <div className="text-xs text-muted-foreground mt-1">Share your thoughts and suggestions</div>
                </a>
                <a
                  href="/contact?type=help"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Help & FAQ</div>
                  <div className="text-xs text-muted-foreground mt-1">Find answers to common questions</div>
                </a>
              </div>
            </SettingsSection>

            {/* Legal & Privacy */}
            <SettingsSection title="Legal & Privacy">
              <div className="space-y-3">
                <a
                  href="/settings/privacy-policy"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Privacy Policy</div>
                  <div className="text-xs text-muted-foreground mt-1">Learn how we protect your data</div>
                </a>
                <a
                  href="/settings/terms-of-service"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Terms of Service</div>
                  <div className="text-xs text-muted-foreground mt-1">Review our terms and conditions</div>
                </a>
                <a
                  href="/settings/data-usage"
                  className="block w-full p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
                >
                  <div className="text-sm font-medium text-foreground">Data Usage</div>
                  <div className="text-xs text-muted-foreground mt-1">Understand how your data is used</div>
                </a>
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