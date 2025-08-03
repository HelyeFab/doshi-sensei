'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationServiceContext';
import { Bell, BellOff, Check, X } from 'lucide-react';

export default function NotificationPermissionCard() {
  const { user } = useAuth();
  const { permissionStatus, preferences, requestPermission, isInitialized } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handleEnableNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await requestPermission();
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show for non-authenticated users
  if (!user) {
    return null;
  }

  // Wait for initialization
  if (!isInitialized) {
    return null;
  }

  // Show different states based on notification status
  if (preferences?.enabled) {
    const hasPushNotifications = permissionStatus === 'granted' && preferences.fcmToken;
    
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-green-900">
              {hasPushNotifications ? 'Push Notifications Enabled' : 'In-App Notifications Enabled'}
            </h3>
            <p className="text-sm text-green-700">
              {hasPushNotifications 
                ? "You'll receive reminders even when the app is closed!"
                : "You'll receive reminders while using the app!"}
            </p>
            {!hasPushNotifications && (
              <button
                onClick={handleEnableNotifications}
                disabled={loading}
                className="mt-2 text-xs text-green-700 underline hover:text-green-800"
              >
                Enable push notifications
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Denied
  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <BellOff className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Notifications Blocked</h3>
            <p className="text-sm text-red-700">
              To receive study reminders, please enable notifications in your browser settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default - show prompt
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 mb-1">Enable Study Reminders</h3>
          <p className="text-sm text-blue-700 mb-3">
            Get gentle reminders to practice Japanese and maintain your learning streak. 
            We'll help you build a consistent study habit!
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEnableNotifications}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? 'Setting up...' : 'Enable Notifications'}
            </button>
            <span className="text-xs text-blue-600">
              You can customize times in settings
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}