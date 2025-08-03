'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationServiceContext';
import { NotificationPreferences as NotificationPrefsType } from '@/types/notifications';
import { useStrings } from '@/contexts/LanguageContext';

export function NotificationPreferences() {
  const { preferences, updatePreferences, permissionStatus, requestPermission } = useNotifications();
  const strings = useStrings();
  const [loading, setLoading] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPrefsType>>({});

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const handleToggle = async (key: string, value: boolean) => {
    setLoading(true);
    try {
      const updates = {
        preferences: {
          ...localPrefs.preferences,
          [key]: { ...localPrefs.preferences?.[key as keyof typeof localPrefs.preferences], enabled: value }
        }
      };
      await updatePreferences(updates);
      setLocalPrefs(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = async (type: string, times: string[]) => {
    setLoading(true);
    try {
      const updates = {
        preferences: {
          ...localPrefs.preferences,
          studyReminders: {
            ...localPrefs.preferences?.studyReminders,
            times
          }
        }
      };
      await updatePreferences(updates);
      setLocalPrefs(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update times:', error);
    } finally {
      setLoading(false);
    }
  };

  if (permissionStatus === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-medium text-red-900 mb-2">Notifications Blocked</h3>
        <p className="text-sm text-red-700">
          You have blocked notifications. Please enable them in your browser settings to receive study reminders.
        </p>
      </div>
    );
  }

  if (permissionStatus === 'default') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Enable Notifications</h3>
        <p className="text-sm text-gray-600 mb-4">
          Get reminders to study, review your vocabulary, and maintain your learning streak.
        </p>
        <button
          onClick={requestPermission}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Enable Notifications
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
      
      <div className="space-y-6">
        {/* Study Reminders */}
        <div className="border-b border-gray-100 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Study Reminders</h4>
              <p className="text-sm text-gray-500">Daily reminders to practice</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPrefs.preferences?.studyReminders?.enabled ?? true}
                onChange={(e) => handleToggle('studyReminders', e.target.checked)}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          {localPrefs.preferences?.studyReminders?.enabled && (
            <div className="ml-4 space-y-2">
              <p className="text-sm text-gray-600">Reminder times:</p>
              <div className="flex gap-2">
                {['08:00', '12:00', '19:00'].map(time => (
                  <label key={time} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={localPrefs.preferences?.studyReminders?.times?.includes(time) ?? false}
                      onChange={(e) => {
                        const times = localPrefs.preferences?.studyReminders?.times || [];
                        const newTimes = e.target.checked 
                          ? [...times, time]
                          : times.filter(t => t !== time);
                        handleTimeChange('studyReminders', newTimes);
                      }}
                      disabled={loading}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{time}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review Reminders */}
        <div className="border-b border-gray-100 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Review Reminders</h4>
              <p className="text-sm text-gray-500">Notifications when items are due for review</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPrefs.preferences?.reviewReminders?.enabled ?? true}
                onChange={(e) => handleToggle('reviewReminders', e.target.checked)}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Streak Reminders */}
        <div className="pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Streak Reminders</h4>
              <p className="text-sm text-gray-500">Reminders to maintain your daily streak</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPrefs.preferences?.streakReminders?.enabled ?? true}
                onChange={(e) => handleToggle('streakReminders', e.target.checked)}
                className="sr-only peer"
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}