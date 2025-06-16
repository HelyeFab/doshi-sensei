'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { strings } from '@/config/strings';
import { useSettings } from '@/contexts/SettingsContext';
import { clearProgress } from '@/utils/storage';
import { PageHeader } from '@/components/PageHeader';
import EnhancedStorageManager from '@/utils/storage';
import WordListManager from '@/utils/wordLists';

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const router = useRouter();

  // Handler functions for new settings
  const handleExportData = async () => {
    try {
      // Export all user data
      const wordListsData = await WordListManager.exportWordLists();
      const statsData = await import('@/utils/stats').then(m => m.StatsManager.exportStats());

      const exportData = {
        wordLists: JSON.parse(wordListsData),
        stats: JSON.parse(statsData),
        settings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doshi-sensei-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.wordLists) {
          await WordListManager.importWordLists(JSON.stringify(data.wordLists));
        }

        alert('Data imported successfully! Please refresh the page.');
      } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    input.click();
  };

  const handleContactUs = () => {
    window.open('mailto:support@doshi-sensei.app?subject=Support Request', '_blank');
  };

  const handleReportBug = () => {
    window.open('mailto:support@doshi-sensei.app?subject=Bug Report&body=Please describe the bug you encountered:', '_blank');
  };

  const handleSendFeedback = () => {
    window.open('mailto:feedback@doshi-sensei.app?subject=App Feedback&body=We\'d love to hear your thoughts:', '_blank');
  };

  const handleHelpFAQ = () => {
    alert('Help & FAQ section coming soon!');
  };

  const handlePrivacyPolicy = () => {
    router.push('/settings/privacy-policy');
  };

  const handleTermsOfService = () => {
    router.push('/settings/terms-of-service');
  };

  const handleDataUsage = () => {
    router.push('/settings/privacy-policy'); // Data usage is covered in privacy policy
  };

  const handleRateApp = () => {
    alert('Thank you for wanting to rate the app! This feature will be available when the app is published to app stores.');
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Doshi Sensei - Japanese Conjugation Practice',
        text: 'Check out this amazing app for learning Japanese verb and adjective conjugations!',
        url: window.location.origin
      });
    } else {
      const shareText = `Check out Doshi Sensei - an amazing app for learning Japanese conjugations! ${window.location.origin}`;
      navigator.clipboard.writeText(shareText);
      alert('Share link copied to clipboard!');
    }
  };

  const handleAcknowledgments = () => {
    router.push('/settings/acknowledgments');
  };

  // Handle reset all data
  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      console.log('Starting complete data reset...');

      // Clear all data from EnhancedStorageManager (settings, progress, recently viewed, etc.)
      await EnhancedStorageManager.clearAllData();
      console.log('Cleared all storage manager data');

      // Clear word lists and saved words
      await WordListManager.clearAllWordLists();
      console.log('Cleared all word lists and saved words');

      // Clear any remaining localStorage items
      const keysToCheck = [
        'doshi_sensei_settings',
        'doshi_sensei_progress',
        'doshi_sensei_recent_words',
        'doshi_sensei_word_lists',
        'doshi_sensei_saved_words'
      ];

      keysToCheck.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`Cleared localStorage key: ${key}`);
        }
      });

      // Clear any sessionStorage items
      sessionStorage.clear();
      console.log('Cleared sessionStorage');

      console.log('Complete data reset successful');

      // Reset settings to defaults (this will trigger a reload)
      resetSettings();

      // Force page reload to ensure clean state
      window.location.reload();

    } catch (error) {
      console.error('Error during data reset:', error);
      alert('An error occurred while resetting data. Please try again.');
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <PageHeader title={strings.settings.title} />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
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

              <div className="pt-2">
                <div>
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                  >
                    Reset All Data
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will reset all your progress, statistics, word lists, and settings.
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Data Management */}
          <SettingsSection title="Data Management">
            <div className="space-y-4">
              <LinkButton
                label="Export Data"
                description="Download your progress and word lists"
                onClick={handleExportData}
              />
              <LinkButton
                label="Import Data"
                description="Restore from a previously exported file"
                onClick={handleImportData}
              />
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Keep your data safe by regularly exporting your progress and word lists.
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* Support & Feedback */}
          <SettingsSection title="Support & Feedback">
            <div className="space-y-4">
              <LinkButton
                label="Contact Us"
                description="Get in touch with our support team"
                onClick={handleContactUs}
              />
              <LinkButton
                label="Report a Bug"
                description="Help us improve by reporting issues"
                onClick={handleReportBug}
              />
              <LinkButton
                label="Send Feedback"
                description="Share your thoughts and suggestions"
                onClick={handleSendFeedback}
              />
              <LinkButton
                label="Help & FAQ"
                description="Find answers to common questions"
                onClick={handleHelpFAQ}
              />
            </div>
          </SettingsSection>

          {/* Legal & Privacy */}
          <SettingsSection title="Legal & Privacy">
            <div className="space-y-4">
              <LinkButton
                label="Privacy Policy"
                description="How we handle your data"
                onClick={handlePrivacyPolicy}
              />
              <LinkButton
                label="Terms of Service"
                description="Terms and conditions of use"
                onClick={handleTermsOfService}
              />
              <LinkButton
                label="Data Usage"
                description="What data we collect and why"
                onClick={handleDataUsage}
              />
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
              <div className="pt-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  Doshi Sensei is a Japanese verb and adjective conjugation practice app.
                  Built with Next.js and designed to help you master Japanese conjugations.
                </p>
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <LinkButton
                  label="Rate the App"
                  description="Help others discover Doshi Sensei"
                  onClick={handleRateApp}
                />
                <LinkButton
                  label="Share with Friends"
                  description="Spread the word about learning Japanese"
                  onClick={handleShareApp}
                />
                <LinkButton
                  label="Acknowledgments"
                  description="Credits and open source libraries"
                  onClick={handleAcknowledgments}
                />
              </div>
            </div>
          </SettingsSection>
        </div>
      </main>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Reset All Data?
              </h3>
              <p className="text-muted-foreground text-sm">
                This action will permanently delete:
              </p>
              <ul className="text-muted-foreground text-sm mt-2 space-y-1">
                <li>• All your word lists and saved words</li>
                <li>• Practice progress and statistics</li>
                <li>• Settings and preferences</li>
                <li>• Recently viewed words</li>
              </ul>
              <p className="text-red-400 font-medium text-sm mt-4">
                This action cannot be undone!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAllData}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full"></div>
                    Resetting...
                  </div>
                ) : (
                  'Reset All Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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

interface LinkButtonProps {
  label: string;
  description: string;
  onClick: () => void;
}

function LinkButton({ label, description, onClick }: LinkButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {label}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {description}
          </div>
        </div>
        <div className="text-muted-foreground group-hover:text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
