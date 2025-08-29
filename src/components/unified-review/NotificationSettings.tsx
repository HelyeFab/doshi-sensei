'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/Switch';
import { useReviewNotifications } from '@/hooks/useReviewNotifications';
import { NotificationChannelType } from '@/lib/unified-review';

interface NotificationPreferences {
  enabled: boolean;
  channels: {
    'in-app': boolean;
    'push': boolean;
    'email': boolean;
  };
  reminderTimes: string[]; // Hours in 24-hour format: ['09:00', '18:00']
  quietHours: {
    enabled: boolean;
    start: string; // '22:00'
    end: string;   // '07:00'
  };
  reviewThreshold: number; // Minimum items due before sending notification
  advanceNotice: number; // Hours before reviews are due to send notification
}

interface NotificationSettingsProps {
  /**
   * Callback when settings are saved
   */
  onSettingsSaved?: (preferences: NotificationPreferences) => void;
  
  /**
   * Whether to show advanced settings
   */
  showAdvancedSettings?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  channels: {
    'in-app': true,
    'push': false,
    'email': false
  },
  reminderTimes: ['09:00', '18:00'],
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00'
  },
  reviewThreshold: 5,
  advanceNotice: 1
};

const CHANNEL_CONFIG = {
  'in-app': {
    label: 'In-App Notifications',
    description: 'Show notifications within the app',
    icon: '🔔',
    requiresPermission: false
  },
  'push': {
    label: 'Push Notifications',
    description: 'Browser push notifications when app is closed',
    icon: '📱',
    requiresPermission: true
  },
  'email': {
    label: 'Email Reminders',
    description: 'Send review reminders to your email',
    icon: '📧',
    requiresPermission: false
  }
};

const PRESET_TIMES = [
  { label: 'Early Morning', value: '07:00' },
  { label: 'Morning', value: '09:00' },
  { label: 'Lunch', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'Evening', value: '18:00' },
  { label: 'Night', value: '21:00' }
];

export default function NotificationSettings({
  onSettingsSaved,
  showAdvancedSettings = false,
  className = ''
}: NotificationSettingsProps) {
  const {
    preferences: savedPreferences,
    updatePreferences,
    testNotification,
    requestPermissions,
    checkPermissions,
    isLoading,
    error
  } = useReviewNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [permissionStatuses, setPermissionStatuses] = useState<Record<string, boolean>>({});
  const [testingNotification, setTestingNotification] = useState(false);

  // Load saved preferences
  useEffect(() => {
    if (savedPreferences) {
      setPreferences(savedPreferences);
    }
  }, [savedPreferences]);

  // Check permissions on mount
  useEffect(() => {
    const checkAllPermissions = async () => {
      const statuses: Record<string, boolean> = {};
      for (const channel of Object.keys(CHANNEL_CONFIG) as NotificationChannelType[]) {
        const hasPermission = await checkPermissions(channel);
        statuses[channel] = hasPermission;
      }
      setPermissionStatuses(statuses);
    };

    checkAllPermissions();
  }, []);

  // Handle preference changes
  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Handle channel toggle
  const toggleChannel = async (channel: NotificationChannelType, enabled: boolean) => {
    if (enabled && CHANNEL_CONFIG[channel].requiresPermission && !permissionStatuses[channel]) {
      // Request permission first
      const granted = await requestPermissions(channel);
      if (!granted) {
        return; // Don't enable if permission denied
      }
      setPermissionStatuses(prev => ({ ...prev, [channel]: true }));
    }

    updatePreference('channels', {
      ...preferences.channels,
      [channel]: enabled
    });
  };

  // Add reminder time
  const addReminderTime = (time: string) => {
    if (!preferences.reminderTimes.includes(time)) {
      updatePreference('reminderTimes', [...preferences.reminderTimes, time].sort());
    }
  };

  // Remove reminder time
  const removeReminderTime = (time: string) => {
    updatePreference('reminderTimes', preferences.reminderTimes.filter(t => t !== time));
  };

  // Save settings
  const handleSave = async () => {
    try {
      await updatePreferences(preferences);
      setHasUnsavedChanges(false);
      
      if (onSettingsSaved) {
        onSettingsSaved(preferences);
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  // Test notification
  const handleTestNotification = async () => {
    setTestingNotification(true);
    
    try {
      await testNotification({
        title: 'Test Notification',
        message: 'This is a test notification from Doshi Sensei!',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    } finally {
      setTestingNotification(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-3">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          🔔 Notification Settings
          {hasUnsavedChanges && (
            <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
              Unsaved changes
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Master Toggle */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">☕</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="font-medium text-foreground">Enable Notifications</div>
              <div className="text-sm text-muted-foreground mt-1">
                Turn on/off all review reminders
              </div>
            </div>
            <Switch
              checked={preferences.enabled}
              onChange={(enabled) => updatePreference('enabled', enabled)}
              size="md"
            />
          </div>
        </div>

        {preferences.enabled && (
          <>
            {/* Notification Channels */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Notification Channels</h3>
              {Object.entries(CHANNEL_CONFIG).map(([channel, config]) => {
                const channelType = channel as NotificationChannelType;
                const isEnabled = preferences.channels[channelType];
                const hasPermission = permissionStatuses[channel];
                const needsPermission = config.requiresPermission && !hasPermission;

                return (
                  <div
                    key={channel}
                    className="p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-xl">{config.icon}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <div className="font-medium text-foreground">
                          {config.label}
                          {needsPermission && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                              Permission required
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {config.description}
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onChange={(enabled) => toggleChannel(channelType, enabled)}
                        size="md"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reminder Times */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Reminder Times</h3>
              <div className="space-y-2">
                {preferences.reminderTimes.map(time => (
                  <div key={time} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-foreground">{time}</span>
                    <Button
                      onClick={() => removeReminderTime(time)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {PRESET_TIMES.map(preset => (
                  <Button
                    key={preset.value}
                    onClick={() => addReminderTime(preset.value)}
                    size="sm"
                    variant="outline"
                    disabled={preferences.reminderTimes.includes(preset.value)}
                    className="text-xs"
                  >
                    + {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvancedSettings && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-medium text-foreground">Advanced Settings</h3>
                
                {/* Quiet Hours */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <label className="text-sm font-medium text-foreground">
                        Quiet Hours
                      </label>
                    </div>
                    <Switch
                      checked={preferences.quietHours.enabled}
                      onChange={(enabled) =>
                        updatePreference('quietHours', {
                          ...preferences.quietHours,
                          enabled
                        })
                      }
                      size="md"
                    />
                  </div>
                  {preferences.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">From</label>
                        <input
                          type="time"
                          value={preferences.quietHours.start}
                          onChange={(e) =>
                            updatePreference('quietHours', {
                              ...preferences.quietHours,
                              start: e.target.value
                            })
                          }
                          className="w-full mt-1 p-2 border border-border rounded bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">To</label>
                        <input
                          type="time"
                          value={preferences.quietHours.end}
                          onChange={(e) =>
                            updatePreference('quietHours', {
                              ...preferences.quietHours,
                              end: e.target.value
                            })
                          }
                          className="w-full mt-1 p-2 border border-border rounded bg-background text-foreground"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Review Threshold */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Review Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={preferences.reviewThreshold}
                    onChange={(e) => updatePreference('reviewThreshold', parseInt(e.target.value))}
                    className="w-full p-2 border border-border rounded bg-background text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum number of items due before sending notification
                  </p>
                </div>

                {/* Advance Notice */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Advance Notice (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={preferences.advanceNotice}
                    onChange={(e) => updatePreference('advanceNotice', parseInt(e.target.value))}
                    className="w-full p-2 border border-border rounded bg-background text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many hours before reviews are due to send notification
                  </p>
                </div>
              </div>
            )}

            {/* Test Notification */}
            <div className="flex gap-2">
              <Button
                onClick={handleTestNotification}
                disabled={testingNotification}
                variant="outline"
                size="sm"
              >
                {testingNotification ? 'Sending...' : 'Test Notification'}
              </Button>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="w-full sm:w-auto"
          >
            {hasUnsavedChanges ? 'Save Changes' : 'Settings Saved'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}