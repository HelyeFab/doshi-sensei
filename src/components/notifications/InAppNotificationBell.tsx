'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';

interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  url?: string;
  read: boolean;
  createdAt: Timestamp;
}

export default function InAppNotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Subscribe to user's notifications
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: InAppNotification[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const notif = {
          id: doc.id,
          ...data
        } as InAppNotification;
        
        notifs.push(notif);
        if (!notif.read) unread++;
      });

      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const notifRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: InAppNotification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate if URL provided
    if (notification.url) {
      window.location.href = notification.url;
    }

    setShowDropdown(false);
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadNotifs = notifications.filter(n => !n.read);
    
    await Promise.all(
      unreadNotifs.map(notif => markAsRead(notif.id))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'feature': return '🎉';
      case 'campaign': return '🎯';
      case 'maintenance': return '🔧';
      case 'study_reminder': return '📚';
      case 'review_reminder': return '📝';
      case 'streak_reminder': return '🔥';
      default: return '🔔';
    }
  };

  if (!user || notifications.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium text-gray-900 ${
                            !notification.read ? 'font-semibold' : ''
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(notification.createdAt.toDate(), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    window.location.href = '/notifications';
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-gray-50 rounded transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}