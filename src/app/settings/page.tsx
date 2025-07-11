                                              'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStrings } from '@/hooks/useLanguage';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { clearProgress } from '@/utils/storage';
import { PageHeader } from '@/components/PageHeader';
import EnhancedStorageManager from '@/utils/storage';
import WordListManager from '@/utils/wordLists';
import useCloudSync from '@/hooks/useCloudSync';
import { usePremiumSync } from '@/hooks/usePremiumSync';
import { SyncStatusIndicator } from '@/components/sync/SyncStatusIndicator';
import { ThemeSelector } from '@/components/ThemeSelector';
import { AVAILABLE_NAV_ITEMS, DEFAULT_NAV_ITEMS } from '@/config/navigation';
import { CacheCleaner } from '@/utils/cacheCleaner';

export default function SettingsPage() {
  const strings = useStrings();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { syncStatus: oldSyncStatus, canSync } = useCloudSync();
  const {
    syncStatus,
    lastSyncTime,
    syncProgress,
    isSyncing: premiumSyncing,
    syncError,
    queuedItems,
    triggerSync: triggerPremiumSync,
    cancelSync,
    clearSyncError
  } = usePremiumSync();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
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

  // Ensure strings are loaded
  if (!strings || !strings.settings) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading...</div>;
  }

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

  const handleClearCache = async () => {
    try {
      const stats = await CacheCleaner.getCacheStats();
      setCacheStats(stats);
      setShowCacheModal(true);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      setShowCacheModal(true);
    }
  };

  const performCacheClear = async () => {
    setIsClearingCache(true);
    setShowCacheModal(false); // Close modal immediately
    
    try {
      const result = await CacheCleaner.clearAllCaches();
      
      // Show success message
      setSyncModal({
        show: true,
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Cache Cleared Successfully' : 'Cache Clear Partially Successful',
        message: result.success 
          ? 'All browser cache has been cleared. The page will now reload.'
          : `Some items could not be cleared: ${result.errors.join(', ')}. The page will reload anyway.`
      });
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Cache clear failed:', error);
      
      // Even on error, try to reload as it might help
      setSyncModal({
        show: true,
        type: 'error',
        title: 'Cache Clear Error',
        message: 'There was an error clearing the cache. The page will reload anyway.'
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const handleReplayTutorial = () => {
    try {
      // Clear the onboarding completion status
      localStorage.removeItem('doshi_onboarding_completed');
      localStorage.removeItem('doshi_onboarding_date');

      // Show confirmation modal with immediate navigation option
      setSyncModal({
        show: true,
        type: 'success',
        title: 'Tutorial Reset',
        message: 'The tutorial has been reset! Click OK to start the tutorial now.'
      });
    } catch (error) {
      console.error('Error resetting tutorial:', error);
      setSyncModal({
        show: true,
        type: 'error',
        title: 'Reset Failed',
        message: 'Failed to reset the tutorial. Please try again.'
      });
    }
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
    if (!canSync || premiumSyncing) return;

    try {
      await triggerPremiumSync();
      // Success/error handling is done in the hook
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleUpgradeForSync = () => {
    router.push('/account');
  };

  const closeSyncModal = () => {
    const wasTutorialReset = syncModal.title === 'Tutorial Reset' && syncModal.type === 'success';

    setSyncModal({
      show: false,
      type: 'success',
      title: '',
      message: ''
    });

    // Navigate to tutorial if this was a successful tutorial reset
    if (wasTutorialReset) {
      // Use window.location to force a full page reload and ensure OnboardingWrapper detects the parameter
      window.location.href = '/?tutorial=true';
    }
  };

  // Handle reset all data
  const handleResetAllData = async () => {
    setIsResetting(true);
    try {

      // Clear all data from EnhancedStorageManager (settings, progress, recently viewed, etc.)
      await EnhancedStorageManager.clearAllData();

      // Clear word lists and saved words
      await WordListManager.clearAllWordLists();

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
        }
      });

      // Clear any sessionStorage items
      sessionStorage.clear();


      // Reset settings to defaults (this will trigger a reload)
      resetSettings();

      // Force page reload to ensure clean state
      router.refresh();

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
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Header */}
        <PageHeader title={strings.settings.title} helpKey="settings" />

        {/* Main Content */}
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
          <div className="space-y-8">
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

            {/* Theme Settings */}
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
                <LinkButton
                  label={strings.settings.replayTutorial}
                  description={strings.settings.replayTutorialDesc}
                  onClick={handleReplayTutorial}
                />
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {strings.settings.tutorialInfo}
                  </p>
                </div>
              </div>
            </SettingsSection>

            {/* Goals & Progress */}
            <SettingsSection title={strings.settings.goalsProgress}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    {strings.settings.dailyGoalWords}
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


                <div className="pt-2">
                  <div>
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                    >
                      {strings.settings.resetAllData}
                    </button>
                    <p className="text-xs text-muted-foreground mt-2">
                      {strings.settings.resetAllDataDesc}
                    </p>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* Data Management */}
            <SettingsSection title={strings.settings.dataManagement}>
              <div className="space-y-4">
                <LinkButton
                  label={strings.settings.exportData}
                  description={strings.settings.exportDataDesc}
                  onClick={handleExportData}
                />
                <LinkButton
                  label={strings.settings.importData}
                  description={strings.settings.importDataDesc}
                  onClick={handleImportData}
                />
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {strings.settings.dataManagementInfo}
                  </p>
                </div>
              </div>
            </SettingsSection>

            {/* Cloud Sync */}
            <SettingsSection title={strings.settings.cloudSync}>
              <div className="space-y-4">
                {canSync ? (
                  <>
                    {/* Enhanced Sync Status Indicator */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <SyncStatusIndicator />
                    </div>

                    {/* Sync Progress */}
                    {syncProgress && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{syncProgress.operation}</span>
                          <span className="text-sm text-muted-foreground">
                            {syncProgress.current}/{syncProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sync Error */}
                    {syncError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-destructive font-medium">Sync Error</p>
                            <p className="text-xs text-destructive/80 mt-1">{syncError}</p>
                          </div>
                          <button
                            onClick={clearSyncError}
                            className="ml-2 text-destructive/60 hover:text-destructive"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Queued Items */}
                    {queuedItems > 0 && !premiumSyncing && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          {queuedItems} item{queuedItems > 1 ? 's' : ''} waiting to sync
                        </p>
                      </div>
                    )}


                    {/* Sync Info */}
                    <div className="pt-2 border-t border-border space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {strings.settings.cloudSyncInfo}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        • Automatic sync every 30 minutes
                        <br />
                        • Background sync when device is idle
                        <br />
                        • All your data is encrypted and secure
                      </div>
                    </div>

                    {/* Cache Clear Button */}
                    <div className="pt-4 border-t border-border">
                      <LinkButton
                        label="Clear Browser Cache"
                        description="Fix sync issues by clearing cached data"
                        onClick={handleClearCache}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        If you're experiencing sync problems, clearing the cache can help resolve them.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Premium Required */}
                    <div className="text-center p-6 border border-border rounded-lg">
                      <div className="text-3xl mb-3">☁️</div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {strings.settings.cloudSyncAvailable}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {strings.settings.cloudSyncDesc}
                      </p>
                      <button
                        onClick={handleUpgradeForSync}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        {strings.settings.upgradeToPremium}
                      </button>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground">
                        {strings.settings.premiumUsersInfo}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </SettingsSection>

            {/* Support & Feedback */}
            <SettingsSection title={strings.settings.supportFeedback}>
              <div className="space-y-4">
                <LinkButton
                  label={strings.settings.contactUs}
                  description={strings.settings.contactUsDesc}
                  onClick={handleContactUs}
                />
                <LinkButton
                  label={strings.settings.reportBug}
                  description={strings.settings.reportBugDesc}
                  onClick={handleReportBug}
                />
                <LinkButton
                  label={strings.settings.sendFeedback}
                  description={strings.settings.sendFeedbackDesc}
                  onClick={handleSendFeedback}
                />
                <LinkButton
                  label={strings.settings.helpFAQ}
                  description={strings.settings.helpFAQDesc}
                  onClick={handleHelpFAQ}
                />
              </div>
            </SettingsSection>

            {/* Legal & Privacy */}
            <SettingsSection title={strings.settings.legalPrivacy}>
              <div className="space-y-4">
                <LinkButton
                  label={strings.settings.privacyPolicy}
                  description={strings.settings.privacyPolicyDesc}
                  onClick={handlePrivacyPolicy}
                />
                <LinkButton
                  label={strings.settings.termsOfService}
                  description={strings.settings.termsOfServiceDesc}
                  onClick={handleTermsOfService}
                />
                <LinkButton
                  label={strings.settings.dataUsage}
                  description={strings.settings.dataUsageDesc}
                  onClick={handleDataUsage}
                />
              </div>
            </SettingsSection>

            {/* About */}
            <SettingsSection title={strings.settings.about}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{strings.settings.version}</span>
                  <span className="text-sm text-foreground">1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{strings.settings.build}</span>
                  <span className="text-sm text-foreground">2025.06.12</span>
                </div>
                <div className="pt-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    {strings.settings.aboutInfo}
                  </p>
                </div>
                <div className="space-y-3 border-t border-border pt-4">
                  <LinkButton
                    label={strings.settings.rateApp}
                    description={strings.settings.rateAppDesc}
                    onClick={handleRateApp}
                  />
                  <LinkButton
                    label={strings.settings.shareWithFriends}
                    description={strings.settings.shareWithFriendsDesc}
                    onClick={handleShareApp}
                  />
                  <LinkButton
                    label={strings.settings.acknowledgments}
                    description={strings.settings.acknowledgmentsDesc}
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
                  {strings.settings.ok}
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
                  {strings.settings.resetAllDataTitle}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {strings.settings.resetAllDataDesc}
                </p>
                <ul className="text-muted-foreground text-sm mt-2 space-y-1">
                  {strings.settings?.resetAllDataItems?.map((item, index) => (
                    <li key={index}>• {item}</li>
                  )) || []}
                </ul>
                <p className="text-red-400 font-medium text-sm mt-4">
                  {strings.settings.resetAllDataWarning}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {strings.settings.cancel}
                </button>
                <button
                  onClick={handleResetAllData}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full"></div>
                      {strings.settings.resetting}
                    </div>
                  ) : (
                    strings.settings.resetAllData
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cache Clear Modal */}
        {showCacheModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🧹</div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Clear Browser Cache
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  This will clear all cached data to fix loading issues or sync problems.
                </p>
                
                {/* Cache Stats */}
                {cacheStats && (
                  <div className="text-left bg-muted/50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium mb-2">Current Cache:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Service Workers: {cacheStats.serviceworkers || 0}</li>
                      <li>• Cached Files: {cacheStats.caches?.length || 0}</li>
                      <li>• Local Storage: {cacheStats.localStorageSize ? `${(cacheStats.localStorageSize / 1024).toFixed(1)} KB` : '0 KB'}</li>
                      <li>• Databases: {cacheStats.indexedDBs?.length || 0}</li>
                    </ul>
                  </div>
                )}
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ This will log you out and reload the page
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCacheModal(false)}
                  disabled={isClearingCache}
                  className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={performCacheClear}
                  disabled={isClearingCache}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearingCache ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                      Clearing...
                    </div>
                  ) : (
                    'Clear Cache'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
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

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between py-2">
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
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors px-1 ${checked ? 'bg-primary' : 'bg-muted'}`}
        style={{ minWidth: 56 }}
        aria-pressed={checked}
        tabIndex={0}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`}
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
