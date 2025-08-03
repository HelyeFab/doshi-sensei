'use client';

import React from 'react';
import { useNotifications } from '@/contexts/NotificationServiceContext';
import NotificationPermissionCard from '@/components/notifications/NotificationPermissionCard';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function TestNotificationsPage() {
  const { isInitialized, permissionStatus, testNotification } = useNotifications();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification System Test</h1>
        
        {/* Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Service Initialized:</span>
              <span className={`text-sm font-medium ${isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                {isInitialized ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Permission Status:</span>
              <span className={`text-sm font-medium ${
                permissionStatus === 'granted' ? 'text-green-600' : 
                permissionStatus === 'denied' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {permissionStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Permission Card */}
        {permissionStatus !== 'granted' && (
          <NotificationPermissionCard />
        )}

        {/* Preferences */}
        {permissionStatus === 'granted' && (
          <NotificationPreferences />
        )}

        {/* Test Buttons */}
        {permissionStatus === 'granted' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Test Notifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => testNotification('study_reminder')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Study Reminder
              </button>
              <button
                onClick={() => testNotification('review_reminder')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Review Reminder
              </button>
              <button
                onClick={() => testNotification('streak_reminder')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Streak Reminder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}