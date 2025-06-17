'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { strings } from '@/config/strings';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { clearProgress } from '@/utils/storage';
import { PageHeader } from '@/components/PageHeader';
import EnhancedStorageManager from '@/utils/storage';
import WordListManager from '@/utils/wordLists';
import useCloudSync from '@/hooks/useCloudSync';

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { user } = useAuth();
  const { userSubscription } = useSubscription();
  const { syncStatus, canSync, triggerSync } = useCloudSync();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncModal, setSyncModal] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });
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
      setSyncModal({
        show: true,
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.'
      });
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

        setSyncModal({
          show: true,
          type: 'success',
          title: 'Import Successful',
          message: 'Data imported successfully! Please refresh the page to see your imported data.'
        });
      } catch (error) {
        console.error('Import failed:', error);
        setSyncModal({
          show: true,
          type: 'error',
          title: 'Import Failed',
          message: 'Failed to import data. Please check the file format and try again.'
        });
      }
    };
    input.click();
  };

  const handleContactUs = () => {
    router.push('/contact');
  };

  const handleReportBug = () => {
    router.push('/contact?category=bug');
  };

  const handleSendFeedback = () => {
    router.push('/contact?category=feedback');
  };

  const handleHelpFAQ = () => {
    setSyncModal({
      show: true,
      type: 'success',
      title: 'Help & FAQ',
      message: 'Help & FAQ section coming soon! In the meantime, feel free to contact our support team.'
    });
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
    setSyncModal({
      show: true,
      type: 'success',
      title: 'Rate the App',
      message: 'Thank you for wanting to rate the app! This feature will be available when the app is published to app stores.'
    });
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
      setSyncModal({
        show: true,
        type: 'success',
        title: 'Share Link Copied',
        message: 'Share link has been copied to your clipboard!'
      });
    }
  };

  const handleAcknowledgments = () => {
    router.push('/settings/acknowledgments');
  };

  // Cloud Sync handlers
  const handleManualSync = async () => {
    if (!canSync || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await triggerSync();
      if (result.success) {
        setSyncModal({
          show: true,
          type: 'success',
          title: 'Sync Completed',
          message: 'Your data has been successfully synced across all devices!'
        });
      } else {
        setSyncModal({
          show: true,
          type: 'error',
          title: 'Sync Failed',
          message: result.error || 'Sync failed due to an unknown error. Please try again.'
        });
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncModal({
        show: true,
        type: 'error',
        title: 'Sync Failed',
        message: 'Unable to sync your data. Please check your internet connection and try again.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpgradeForSync = () => {
    router.push('/account');
  };

  const closeSyncModal = () => {
    setSyncModal({
      show: false,
      type: 'success',
      title: '',
      message: ''
    });
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
      setSyncModal({
        show: true,
        type: 'error',
        title: 'Reset Failed',
        message: 'An error occurred while resetting data. Please try again.'
      });
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

          {/* Cloud Sync */}
          <SettingsSection title="Cloud Sync">
            <div className="space-y-4">
              {canSync ? (
                <>
                  {/* Sync Status */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        syncStatus.isSyncing
                          ? 'bg-yellow-500 animate-pulse'
                          : syncStatus.isOnline
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {syncStatus.isSyncing
                            ? 'Syncing...'
                            : syncStatus.isOnline
                            ? 'Connected'
                            : 'Offline'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {syncStatus.lastSyncTime
                            ? `Last synced: ${syncStatus.lastSyncTime.toLocaleTimeString()}`
                            : 'Never synced'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Auto-sync enabled
                    </div>
                  </div>

                  {/* Manual Sync Button */}
                  <button
                    onClick={handleManualSync}
                    disabled={!syncStatus.isOnline || isSyncing || syncStatus.isSyncing}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(isSyncing || syncStatus.isSyncing) ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Sync Now</span>
                      </>
                    )}
                  </button>

                  {/* Sync Info */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Your vocabulary lists and progress are automatically synced across all your devices.
                      Click "Sync Now" to manually trigger a sync.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Premium Required */}
                  <div className="text-center p-6 border border-border rounded-lg">
                    <div className="text-3xl mb-3">☁️</div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Cloud Sync Available
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sync your vocabulary lists and progress across all your devices with a premium subscription.
                    </p>
                    <button
                      onClick={handleUpgradeForSync}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Upgrade to Premium
                    </button>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Premium users get unlimited cloud sync, vocabulary lists, and daily drills.
                    </p>
                  </div>
                </>
              )}
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

      {/* Sync Modal */}
      {syncModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {syncModal.type === 'success' ? '✅' : '❌'}
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {syncModal.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {syncModal.message}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={closeSyncModal}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

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
