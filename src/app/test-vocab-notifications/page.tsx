'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RecentStudyTracker } from '@/utils/recentStudyTracker';
import { NotificationService } from '@/services/notifications/NotificationService';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useNotificationPermissionDialog } from '@/components/NotificationPermissionDialog';

export default function TestVocabNotifications() {
  const { user } = useAuth();
  const { showDialog: showPermissionDialog, DialogComponent } = useNotificationPermissionDialog();
  const [status, setStatus] = useState<string>('Checking...');
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [fcmToken, setFcmToken] = useState<string>('');
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    checkEverything();
  }, [user]);

  const checkEverything = async () => {
    if (!user) {
      setStatus('Not logged in');
      return;
    }

    const results: string[] = [];
    
    try {
      // 1. Check FCM Token
      const notificationService = NotificationService.getInstance();
      await notificationService.initialize(user.uid);
      let token = notificationService.getCurrentToken();
      
      // If no token in memory, check Firestore
      if (!token) {
        const prefsDoc = await getDoc(doc(db, 'notificationPreferences', user.uid));
        const storedToken = prefsDoc.data()?.fcmToken;
        if (storedToken) {
          token = storedToken;
        }
      }
      
      setFcmToken(token || 'No token');
      results.push(`✅ FCM Token: ${token ? 'Available' : 'Missing'}`);
      
      // 2. Check notification preferences
      const prefsDoc = await getDoc(doc(db, 'notificationPreferences', user.uid));
      const prefs = prefsDoc.data();
      setNotificationPrefs(prefs);
      results.push(`✅ Notification Prefs: ${prefs?.enabled ? 'Enabled' : 'Disabled'}`);
      
      // 3. Load recent study items
      const itemsQuery = query(
        collection(db, 'users', user.uid, 'recentStudyItems'),
        orderBy('lastStudied', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(itemsQuery);
      const items = snapshot.docs
        .filter(doc => doc.id !== '_summary') // Filter out the summary document
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          lastStudied: doc.data().lastStudied?.toDate?.()?.toLocaleString() || 
                       doc.data().studiedAt?.toDate?.()?.toLocaleString() || 'Unknown'
        }));
      setRecentItems(items);
      results.push(`✅ Recent Items: ${items.length} found`);
      
      setStatus('System Ready');
      setTestResults(results);
    } catch (error) {
      console.error('Error checking system:', error);
      setStatus(`Error: ${error}`);
      results.push(`❌ Error: ${error}`);
      setTestResults(results);
    }
  };

  const trackTestVocabulary = async () => {
    setIsTracking(true);
    const testWords = [
      { content: 'わたし', meaning: 'I/me' },
      { content: '学生', meaning: 'student' },
      { content: '日本語', meaning: 'Japanese language' },
      { content: '勉強', meaning: 'study' },
      { content: '今日', meaning: 'today' }
    ];

    try {
      for (const word of testWords) {
        await RecentStudyTracker.addItem({
          type: 'word',
          content: word.content,
          contextPath: '/test-vocab-notifications'
        });
        console.log(`Tracked: ${word.content}`);
      }
      
      // Reload to show new items
      setTimeout(() => {
        checkEverything();
        setIsTracking(false);
      }, 1000);
    } catch (error) {
      console.error('Error tracking test vocabulary:', error);
      setIsTracking(false);
    }
  };

  const requestNotificationPermission = () => {
    showPermissionDialog(async () => {
      try {
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize(user?.uid || '');
        const granted = await notificationService.requestPermission();
        
        if (granted) {
          // Get the token immediately after permission
          const token = notificationService.getCurrentToken();
          console.log('FCM Token after permission:', token);
          
          if (!token) {
            console.warn('Permission granted but no FCM token - likely using in-app only mode');
            alert('Notifications enabled (in-app only mode due to configuration)');
          } else {
            console.log('FCM Token successfully obtained:', token);
            alert('Push notifications enabled successfully!');
          }
          
          // Refresh status after a short delay
          setTimeout(checkEverything, 1500);
        } else {
          alert('Notification permission was not granted');
        }
      } catch (error) {
        console.error('Error requesting permission:', error);
        alert(`Error: ${error}`);
      }
    });
  };

  const clearAllItems = async () => {
    try {
      await RecentStudyTracker.clearAll();
      // Refresh after clearing
      setTimeout(checkEverything, 500);
    } catch (error) {
      console.error('Error clearing items:', error);
    }
  };

  const sendTestNotification = async () => {
    try {
      // Get the current user's ID token
      const idToken = await user?.getIdToken();
      
      if (!idToken) {
        alert('Please sign in first');
        return;
      }
      
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: 'Vocabulary Review Time! 📚',
          body: 'You studied わたし, 学生, and 3 more words. Time to review them!',
          data: { 
            type: 'vocabulary_review',
            path: '/tools/textbook-vocabulary'
          }
        })
      });
      
      if (response.ok) {
        alert('Test notification sent! Check your device.');
      } else {
        alert('Failed to send notification. Check console.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Error sending notification');
    }
  };

  const triggerScheduledCheck = async () => {
    try {
      // Call the Firebase function directly (in production this runs on schedule)
      const response = await fetch('/api/notifications/trigger-scheduled', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });
      
      const result = await response.json();
      alert(`Scheduled check triggered: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('Error triggering scheduled check:', error);
      alert('Error triggering scheduled check');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <DialogComponent />
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🔔 Vocabulary Notification Test</h1>
        
        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">System Status: {status}</h2>
          <div className="space-y-2 text-sm">
            {testResults.map((result, i) => (
              <div key={i}>{result}</div>
            ))}
          </div>
        </div>

        {/* Recent Study Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Study Items</h2>
          {recentItems.length === 0 ? (
            <p className="text-gray-500">No items tracked yet. Study some vocabulary first!</p>
          ) : (
            <div className="space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{item.content}</span>
                    <span className="text-sm text-gray-500 ml-2">({item.type})</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.lastStudied}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Actions</h2>
          <div className="space-y-3">
            {/* Show permission button if no FCM token */}
            {!fcmToken || fcmToken === 'No token' ? (
              <button
                onClick={requestNotificationPermission}
                className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                ⚠️ Enable Notifications First
              </button>
            ) : null}
            
            <button
              onClick={trackTestVocabulary}
              disabled={isTracking}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isTracking ? 'Tracking...' : '1. Track Test Vocabulary (5 words)'}
            </button>
            
            <button
              onClick={sendTestNotification}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              2. Send Test Notification
            </button>
            
            <button
              onClick={triggerScheduledCheck}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              3. Trigger Scheduled Check (Force)
            </button>
            
            <button
              onClick={checkEverything}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Refresh Status
            </button>
            
            <button
              onClick={clearAllItems}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All Items
            </button>
            
            <button
              onClick={() => {
                // Test in-app notification
                const event = new CustomEvent('app-notification', {
                  detail: {
                    title: '🎉 Test In-App Notification',
                    body: 'This is a test of the in-app notification system with Red Panda!',
                    type: 'success',
                    action: '/tools/textbook-vocabulary'
                  }
                });
                window.dispatchEvent(event);
              }}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test In-App Toast 🐼
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📋 Testing Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Track Test Vocabulary" to add 5 Japanese words</li>
            <li>Check that they appear in "Recent Study Items"</li>
            <li>Click "Send Test Notification" to test immediate delivery</li>
            <li>Go to Textbook Vocabulary and study some real words</li>
            <li>Come back here and click "Refresh Status" to see them</li>
            <li>Click "Trigger Scheduled Check" to simulate the daily notification job</li>
          </ol>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono">
          <div>User: {user?.uid || 'Not logged in'}</div>
          <div>FCM Token: {fcmToken.substring(0, 20)}...</div>
          <div>Notifications: {notificationPrefs?.enabled ? 'Enabled' : 'Disabled'}</div>
          <div>Review Time: {notificationPrefs?.reviewTime || 'Not set'}</div>
        </div>
      </div>
    </div>
  );
}