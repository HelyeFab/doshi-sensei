'use client';

import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useState } from 'react';

export function NotificationSettingsSection() {
  const {
    settings,
    isLoading,
    isSaving,
    toggleStudyReminders,
    toggleReviewReminders,
    toggleStreakReminders,
    updateReminderTimes,
    sendTestNotification,
    isSupported,
    canEnableNotifications,
    needsPermission,
    notificationsBlocked
  } = useNotificationSettings();

  const [showTestButton, setShowTestButton] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const handleToggleReviewReminders = async () => {
    if (settings.reviewReminders) {
      // Turning off
      await toggleReviewReminders(false);
    } else {
      // Turning on - may need permission
      if (needsPermission) {
        setTestMessage('Please allow notifications when prompted');
      }
      
      const success = await toggleReviewReminders(true);
      
      if (success) {
        setShowTestButton(true);
        setTestMessage('Notifications enabled! You can test them below.');
      } else if (notificationsBlocked) {
        setTestMessage('⚠️ Notifications are blocked. Please enable them in your browser settings (click the lock icon in the address bar).');
      } else {
        setTestMessage('Failed to enable notifications. Please try again.');
      }
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      setTestMessage('Test notification sent! Check your notifications.');
    } catch (error: any) {
      setTestMessage(error.message);
    }
  };

  const handleTimeToggle = (time: string) => {
    const newTimes = settings.reminderTimes.includes(time)
      ? settings.reminderTimes.filter(t => t !== time)
      : [...settings.reminderTimes, time].sort();
    
    updateReminderTimes(newTimes);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-20 bg-muted/50 rounded"></div>
          <div className="h-20 bg-muted/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Notifications</h2>
      
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
          
          {/* Study Reminders */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Study Reminders</h4>
              <p className="text-sm text-muted-foreground">Daily reminders to practice</p>
            </div>
            <button
              onClick={() => toggleStudyReminders(!settings.studyReminders)}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.studyReminders ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={settings.studyReminders}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  settings.studyReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Reminder Times */}
          {(settings.studyReminders || settings.reviewReminders) && (
            <div className="py-4 border-b border-border">
              <p className="text-sm text-muted-foreground mb-3">Reminder times:</p>
              <div className="flex flex-wrap gap-2">
                {['08:00', '12:00', '19:00', '21:00'].map(time => (
                  <button
                    key={time}
                    onClick={() => handleTimeToggle(time)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      settings.reminderTimes.includes(time)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Review Reminders - Our PWA notifications */}
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">
                Review Reminders
                {settings.reviewReminders && settings.pushEnabled && (
                  <span className="ml-2 text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                    Active
                  </span>
                )}
              </h4>
              <p className="text-sm text-muted-foreground">
                Notifications when items are due for review (uses spaced repetition)
              </p>
              {notificationsBlocked && (
                <p className="text-xs text-destructive mt-1">
                  ⚠️ Browser notifications are blocked
                </p>
              )}
            </div>
            <button
              onClick={handleToggleReviewReminders}
              disabled={isSaving || !isSupported()}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.reviewReminders ? 'bg-primary' : 'bg-muted'
              } ${!isSupported() ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.reviewReminders}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  settings.reviewReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Streak Reminders */}
          <div className="flex items-center justify-between py-4">
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Streak Reminders</h4>
              <p className="text-sm text-muted-foreground">Reminders to maintain your daily streak</p>
            </div>
            <button
              onClick={() => toggleStreakReminders(!settings.streakReminders)}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.streakReminders ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={settings.streakReminders}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  settings.streakReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Test notification button and messages */}
        {(showTestButton || testMessage || needsPermission) && (
          <div className="pt-4 border-t">
            {testMessage && (
              <p className={`text-sm mb-3 ${
                testMessage.includes('⚠️') ? 'text-red-600' : 
                testMessage.includes('enabled') ? 'text-green-600' : 
                'text-gray-600'
              }`}>
                {testMessage}
              </p>
            )}
            
            {/* Enable Notifications button for first-time users */}
            {needsPermission && !settings.reviewReminders && (
              <button
                onClick={async () => {
                  setTestMessage('Please allow notifications when prompted');
                  const success = await toggleReviewReminders(true);
                  if (success) {
                    setShowTestButton(true);
                    setTestMessage('✅ Notifications enabled! You can test them below.');
                  }
                }}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Enable Notifications
              </button>
            )}
            
            {settings.reviewReminders && settings.pushEnabled && (
              <button
                onClick={handleTestNotification}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm border border-border"
              >
                Send Test Notification
              </button>
            )}
            
            {notificationsBlocked && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  To enable notifications:
                </p>
                <ol className="text-sm text-yellow-600/90 dark:text-yellow-400/90 mt-2 space-y-1">
                  <li>1. Click the lock icon in your browser&apos;s address bar</li>
                  <li>2. Find &quot;Notifications&quot; in the permissions</li>
                  <li>3. Change from &quot;Block&quot; to &quot;Allow&quot;</li>
                  <li>4. Refresh this page</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Receive reminders to study, review your progress, and maintain your learning streak. 
          Notifications help you stay consistent with your Japanese learning journey.
        </p>
      </div>
    </div>
  );
}