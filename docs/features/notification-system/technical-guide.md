# Technical Implementation Guide

## Service Worker Setup

### 1. Update Service Worker for Push Notifications

```javascript
// public/sw.js - Add to existing service worker

// Handle push events
self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/doshi.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'doshi-notification',
    requireInteraction: data.requireInteraction || false,
    renotify: data.renotify || false,
    silent: data.silent || false,
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      type: data.type,
      ...data.customData
    },
    actions: data.actions || []
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data;

  notification.close();

  // Handle action buttons
  if (action === 'start-practice') {
    event.waitUntil(
      clients.openWindow('/practice?from=notification')
    );
  } else if (action === 'review-now') {
    event.waitUntil(
      clients.openWindow('/review?from=notification')
    );
  } else {
    // Default click - open the URL specified in data
    event.waitUntil(
      clients.openWindow(data.url || '/')
    );
  }

  // Track the click
  event.waitUntil(
    fetch('/api/notifications/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        action: action || 'default',
        timestamp: Date.now()
      })
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  // Track dismissal for analytics
  const data = event.notification.data;
  
  event.waitUntil(
    fetch('/api/notifications/track-dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        timestamp: Date.now()
      })
    })
  );
});
```

## Frontend Implementation

### 2. Notification Permission Component

```typescript
// src/components/notifications/NotificationPermission.tsx
'use client';

import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  // Your config
};

export default function NotificationPermission() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // Get FCM token
        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY
        });

        if (fcmToken) {
          // Save token to backend
          await fetch('/api/notifications/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: fcmToken })
          });

          setToken(fcmToken);

          // Listen for foreground messages
          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            // Show in-app notification
          });
        }
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setLoading(false);
    }
  };

  if (permission === 'granted' && token) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">
          ✅ Notifications enabled! You'll receive study reminders.
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-2">
        Enable Study Reminders
      </h3>
      <p className="text-blue-700 mb-4">
        Get gentle reminders to practice Japanese and maintain your streak!
      </p>
      <button
        onClick={requestPermission}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Setting up...' : 'Enable Notifications'}
      </button>
    </div>
  );
}
```

### 3. Notification Preferences UI

```typescript
// src/components/notifications/NotificationPreferences.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/Switch';
import { TimePicker } from '@/components/ui/TimePicker';

interface NotificationPreferences {
  enabled: boolean;
  studyReminders: {
    enabled: boolean;
    times: string[];
    smartScheduling: boolean;
  };
  reviewReminders: {
    enabled: boolean;
    advanceNotice: number;
  };
  streakReminders: {
    enabled: boolean;
    time: string;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications/preferences');
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return;

    setSaving(true);
    try {
      const newPrefs = { ...preferences, ...updates };
      
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      });

      if (response.ok) {
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!preferences) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>

        {/* Master Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-medium">Enable Notifications</h3>
            <p className="text-sm text-gray-500">
              Receive study reminders and updates
            </p>
          </div>
          <Switch
            checked={preferences.enabled}
            onChange={(enabled) => savePreferences({ enabled })}
            disabled={saving}
          />
        </div>

        {preferences.enabled && (
          <>
            {/* Study Reminders */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Study Reminders</h3>
                  <p className="text-sm text-gray-500">
                    Daily reminders to practice
                  </p>
                </div>
                <Switch
                  checked={preferences.studyReminders.enabled}
                  onChange={(enabled) => 
                    savePreferences({
                      studyReminders: { ...preferences.studyReminders, enabled }
                    })
                  }
                  disabled={saving}
                />
              </div>

              {preferences.studyReminders.enabled && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Reminder Times</label>
                    <div className="mt-2 space-y-2">
                      {preferences.studyReminders.times.map((time, index) => (
                        <TimePicker
                          key={index}
                          value={time}
                          onChange={(newTime) => {
                            const times = [...preferences.studyReminders.times];
                            times[index] = newTime;
                            savePreferences({
                              studyReminders: { ...preferences.studyReminders, times }
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={preferences.studyReminders.smartScheduling}
                      onChange={(smartScheduling) =>
                        savePreferences({
                          studyReminders: { ...preferences.studyReminders, smartScheduling }
                        })
                      }
                      disabled={saving}
                    />
                    <label className="text-sm">
                      Smart scheduling (adapt to my study patterns)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Review Reminders */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Review Reminders</h3>
                  <p className="text-sm text-gray-500">
                    Notify when items are due for review
                  </p>
                </div>
                <Switch
                  checked={preferences.reviewReminders.enabled}
                  onChange={(enabled) =>
                    savePreferences({
                      reviewReminders: { ...preferences.reviewReminders, enabled }
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            {/* Streak Reminders */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Streak Reminders</h3>
                  <p className="text-sm text-gray-500">
                    Remind me to maintain my streak
                  </p>
                </div>
                <Switch
                  checked={preferences.streakReminders.enabled}
                  onChange={(enabled) =>
                    savePreferences({
                      streakReminders: { ...preferences.streakReminders, enabled }
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium">Quiet Hours</h3>
                  <p className="text-sm text-gray-500">
                    Don't send notifications during these hours
                  </p>
                </div>
                <Switch
                  checked={preferences.quietHours.enabled}
                  onChange={(enabled) =>
                    savePreferences({
                      quietHours: { ...preferences.quietHours, enabled }
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

## Backend Implementation

### 4. Cloud Functions

```typescript
// functions/src/notifications/studyReminder.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';

export const scheduledStudyReminder = functions
  .runWith({ memory: '512MB', timeoutSeconds: 540 })
  .pubsub.schedule('0 * * * *') // Every hour
  .onRun(async (context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = new Date();

    // Get all users with study reminders enabled
    const usersSnapshot = await db
      .collection('notificationPreferences')
      .where('enabled', '==', true)
      .where('studyReminders.enabled', '==', true)
      .get();

    const notifications: Promise<any>[] = [];

    for (const doc of usersSnapshot.docs) {
      const prefs = doc.data();
      const userId = doc.id;

      // Check if it's time to send for this user's timezone
      const userTime = utcToZonedTime(now, prefs.timezone);
      const currentHour = format(userTime, 'HH:00');

      if (prefs.studyReminders.times.includes(currentHour)) {
        // Check if user has already studied today
        const today = format(userTime, 'yyyy-MM-dd');
        const statsDoc = await db
          .collection('userStats')
          .doc(userId)
          .get();

        const stats = statsDoc.data();
        if (stats?.lastStudyDate === today) {
          continue; // Already studied today
        }

        // Check quiet hours
        if (prefs.quietHours.enabled) {
          const hour = parseInt(format(userTime, 'HH'));
          const quietStart = parseInt(prefs.quietHours.start.split(':')[0]);
          const quietEnd = parseInt(prefs.quietHours.end.split(':')[0]);
          
          if (quietStart <= quietEnd) {
            if (hour >= quietStart && hour < quietEnd) continue;
          } else {
            if (hour >= quietStart || hour < quietEnd) continue;
          }
        }

        // Get user data for personalization
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();

        // Prepare notification
        const message = {
          token: prefs.fcmToken,
          notification: {
            title: `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${userData?.displayName || 'Learner'}-san! 🌸`,
            body: stats?.currentStreak > 0 
              ? `Keep your ${stats.currentStreak}-day streak alive with a quick practice!`
              : 'Ready for your Japanese practice? Start with just 5 minutes!',
          },
          data: {
            type: 'study_reminder',
            url: '/practice',
            userId: userId,
          },
          webpush: {
            notification: {
              icon: '/doshi.png',
              badge: '/badge-72x72.png',
              actions: [
                {
                  action: 'start-practice',
                  title: 'Start Practice',
                },
                {
                  action: 'snooze',
                  title: 'Snooze 1hr',
                }
              ]
            }
          }
        };

        notifications.push(
          messaging.send(message)
            .then(() => logNotification(userId, 'study_reminder', true))
            .catch((error) => {
              console.error(`Failed to send to ${userId}:`, error);
              logNotification(userId, 'study_reminder', false, error.message);
            })
        );
      }
    }

    await Promise.all(notifications);
    console.log(`Sent ${notifications.length} study reminders`);
  });

async function logNotification(
  userId: string, 
  type: string, 
  delivered: boolean, 
  error?: string
) {
  await admin.firestore().collection('notificationLogs').add({
    userId,
    notificationType: type,
    sentAt: admin.firestore.Timestamp.now(),
    delivered,
    clicked: false,
    error,
  });
}
```

### 5. API Routes

```typescript
// src/app/api/notifications/register-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { token } = await request.json();

    // Validate token format
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Store token
    await db.collection('notificationTokens').doc(token).set({
      token,
      userId: session.user.id,
      platform: 'web',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    });

    // Update user preferences with token
    await db.collection('notificationPreferences').doc(session.user.id).set({
      fcmToken: token,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token registration failed:', error);
    return NextResponse.json(
      { error: 'Failed to register token' }, 
      { status: 500 }
    );
  }
}
```

## Testing

### 6. Test Notification Endpoint

```typescript
// src/app/api/notifications/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type = 'study_reminder' } = await request.json();

    // Get user's FCM token
    const prefsDoc = await admin.firestore()
      .collection('notificationPreferences')
      .doc(session.user.id)
      .get();

    const prefs = prefsDoc.data();
    if (!prefs?.fcmToken) {
      return NextResponse.json(
        { error: 'No FCM token found' }, 
        { status: 400 }
      );
    }

    // Send test notification
    const message = {
      token: prefs.fcmToken,
      notification: {
        title: 'Test Notification',
        body: `This is a test ${type} notification`,
      },
      data: {
        type: 'test',
        originalType: type,
        userId: session.user.id,
      },
    };

    const response = await admin.messaging().send(message);

    return NextResponse.json({ 
      success: true, 
      messageId: response 
    });
  } catch (error) {
    console.error('Test notification failed:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' }, 
      { status: 500 }
    );
  }
}
```

## Monitoring

### 7. Analytics Dashboard Component

```typescript
// src/components/admin/NotificationAnalytics.tsx
'use client';

import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';

interface NotificationStats {
  sent: number;
  delivered: number;
  clicked: number;
  dismissed: number;
  failed: number;
  byType: {
    study: { sent: number; clicked: number };
    review: { sent: number; clicked: number };
    streak: { sent: number; clicked: number };
  };
  byHour: { hour: number; sent: number; clicked: number }[];
}

export default function NotificationAnalytics() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    const response = await fetch(
      `/api/admin/notifications/stats?range=${dateRange}`
    );
    const data = await response.json();
    setStats(data);
  };

  if (!stats) return <div>Loading...</div>;

  const deliveryRate = ((stats.delivered / stats.sent) * 100).toFixed(1);
  const clickRate = ((stats.clicked / stats.delivered) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Sent</h3>
          <p className="text-2xl font-bold">{stats.sent}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Delivery Rate</h3>
          <p className="text-2xl font-bold">{deliveryRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Click Rate</h3>
          <p className="text-2xl font-bold">{clickRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Failed</h3>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Performance by Type</h3>
          <Bar
            data={{
              labels: ['Study', 'Review', 'Streak'],
              datasets: [
                {
                  label: 'Sent',
                  data: [
                    stats.byType.study.sent,
                    stats.byType.review.sent,
                    stats.byType.streak.sent,
                  ],
                  backgroundColor: 'rgba(59, 130, 246, 0.5)',
                },
                {
                  label: 'Clicked',
                  data: [
                    stats.byType.study.clicked,
                    stats.byType.review.clicked,
                    stats.byType.streak.clicked,
                  ],
                  backgroundColor: 'rgba(16, 185, 129, 0.5)',
                },
              ],
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Engagement by Hour</h3>
          <Line
            data={{
              labels: stats.byHour.map(h => `${h.hour}:00`),
              datasets: [
                {
                  label: 'Click Rate %',
                  data: stats.byHour.map(h => 
                    h.sent > 0 ? (h.clicked / h.sent) * 100 : 0
                  ),
                  borderColor: 'rgb(59, 130, 246)',
                  tension: 0.1,
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}
```