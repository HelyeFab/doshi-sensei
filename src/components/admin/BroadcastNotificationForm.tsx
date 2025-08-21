'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

type NotificationType = 'announcement' | 'feature' | 'campaign' | 'maintenance';
type TargetAudience = 'all' | 'active' | 'inactive' | 'premium' | 'free';

export default function BroadcastNotificationForm() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'announcement' as NotificationType,
    url: '',
    targetAudience: 'all' as TargetAudience,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.body) {
      showNotification({
        title: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications/admin-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user!.getIdToken()}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send broadcast');
      }

      showNotification({
        title: 'Broadcast sent successfully!',
        message: `Sent to ${data.stats.totalTargetUsers} users (${data.stats.pushNotificationsSent} push, ${data.stats.inAppNotificationsCreated} in-app)`,
        type: 'success',
      });

      // Reset form
      setFormData({
        title: '',
        body: '',
        type: 'announcement',
        url: '',
        targetAudience: 'all',
      });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      showNotification({
        title: 'Failed to send broadcast',
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notification Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="announcement">📢 Announcement</option>
            <option value="feature">🎉 New Feature</option>
            <option value="campaign">🎯 Campaign</option>
            <option value="maintenance">🔧 Maintenance</option>
          </select>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Audience
          </label>
          <select
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value as TargetAudience })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            <option value="active">Active Users (last 7 days)</option>
            <option value="inactive">Inactive Users</option>
            <option value="premium">Premium Users Only</option>
            <option value="free">Free Users Only</option>
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., New Feature: AI-Powered Story Generation!"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100</p>
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          placeholder="e.g., Create personalized Japanese stories with our new AI feature. Try it now!"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          maxLength={300}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.body.length}/300</p>
      </div>

      {/* URL (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Link URL (Optional)
        </label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="e.g., https://doshisensei.com/stories/generate"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Users will be directed to this URL when they click the notification
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">
                {formData.type === 'announcement' ? '📢' : 
                 formData.type === 'feature' ? '🎉' :
                 formData.type === 'campaign' ? '🎯' : '🔧'}
              </span>
            </div>
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">
                {formData.title || 'Notification Title'}
              </h5>
              <p className="text-sm text-gray-600 mt-1">
                {formData.body || 'Notification message will appear here...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => setFormData({
            title: '',
            body: '',
            type: 'announcement',
            url: '',
            targetAudience: 'all',
          })}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={loading || !formData.title || !formData.body}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Broadcast'}
        </button>
      </div>
    </form>
  );
}