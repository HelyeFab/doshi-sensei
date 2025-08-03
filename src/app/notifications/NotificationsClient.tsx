'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { format } from 'date-fns';
import { Bell, Check, ChevronLeft, Loader2, Trash2, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useStrings } from '@/contexts/LanguageContext';
import { useNotification } from '@/contexts/NotificationContext';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  url?: string;
  read: boolean;
  createdAt: Timestamp;
  broadcastId?: string;
}

export default function NotificationsClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const strings = useStrings();
  const { showNotification } = useNotification();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // If no user after auth loads, redirect
    if (!user) {
      router.push('/login');
      return;
    }

    loadNotifications();
  }, [user, authLoading, filter, router]);

  const loadNotifications = async (isLoadMore = false) => {
    if (!user) return;

    try {
      if (!isLoadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      let q = query(
        notificationsRef,
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      // Add filter
      if (filter === 'unread') {
        q = query(
          notificationsRef,
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      // Add pagination
      if (isLoadMore && lastDoc) {
        q = query(
          notificationsRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snapshot = await getDocs(q);
      const newNotifications: Notification[] = [];

      snapshot.forEach((doc) => {
        newNotifications.push({
          id: doc.id,
          ...doc.data()
        } as Notification);
      });

      if (isLoadMore) {
        setNotifications(prev => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }

      // Update pagination
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      setLastDoc(lastVisible);
      setHasMore(snapshot.docs.length === 20);

    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const notifRef = doc(db, 'users', user.uid, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(n => 
          updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true })
        )
      );

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', notificationId));
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      showNotification({
        title: 'Notification deleted',
        type: 'success',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      showNotification({
        title: 'Failed to delete notification',
        type: 'error',
      });
    }
  };

  const deleteSelected = async () => {
    if (!user || selectedIds.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => 
          deleteDoc(doc(db, 'users', user.uid, 'notifications', id))
        )
      );

      // Update local state
      setNotifications(prev => 
        prev.filter(n => !selectedIds.has(n.id))
      );

      showNotification({
        title: `${selectedIds.size} notifications deleted`,
        type: 'success',
      });

      // Reset selection
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      showNotification({
        title: 'Failed to delete notifications',
        type: 'error',
      });
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(notifications.map(n => n.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.url) {
      router.push(notification.url);
    }
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
      case 'achievement': return '🏆';
      default: return '🔔';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Show loading while auth is loading or notifications are loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Don't render if no user (should redirect, but just in case)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmartPageHeader title="Notifications" />
      
      <div className="max-w-3xl mx-auto px-4 pb-8">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <button
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <span className="text-sm text-gray-600">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={selectedIds.size === notifications.length ? deselectAll : selectAll}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
                >
                  {selectedIds.size === notifications.length ? 'Deselect all' : 'Select all'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setSelectionMode(true)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1"
                disabled={notifications.length === 0}
              >
                <CheckSquare className="w-4 h-4" />
                Select
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {selectionMode && selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </button>
            )}
            {!selectionMode && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? 'All your notifications have been read!'
                : 'When you receive notifications, they\'ll appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm p-4 transition-all hover:shadow-md ${
                  !notification.read ? 'border-l-4 border-blue-600' : ''
                } ${selectedIds.has(notification.id) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(notification.id);
                      }}
                      className="mt-1 flex-shrink-0"
                    >
                      {selectedIds.has(notification.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  )}
                  
                  <span className="text-2xl flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </span>
                  
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => !selectionMode && handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-base font-medium text-gray-900 ${
                        !notification.read ? 'font-semibold' : ''
                      }`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                        {!selectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 mt-1">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(notification.createdAt.toDate(), 'MMM d, yyyy at h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-6">
                <button
                  onClick={() => loadNotifications(true)}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}