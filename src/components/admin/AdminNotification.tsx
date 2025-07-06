'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let notificationListener: ((notification: Notification) => void) | null = null;

// Simple notification system for admin dashboard
export const adminNotification = {
  success: (message: string) => {
    if (notificationListener) {
      notificationListener({
        id: Date.now().toString(),
        message,
        type: 'success'
      });
    }
  },
  error: (message: string) => {
    if (notificationListener) {
      notificationListener({
        id: Date.now().toString(),
        message,
        type: 'error'
      });
    }
  },
  info: (message: string) => {
    if (notificationListener) {
      notificationListener({
        id: Date.now().toString(),
        message,
        type: 'info'
      });
    }
  }
};

export function AdminNotificationProvider() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    notificationListener = (notification: Notification) => {
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
    };

    return () => {
      notificationListener = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`
              px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md
              ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
              ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
              ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
            `}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {notification.type === 'success' && '✅'}
                {notification.type === 'error' && '❌'}
                {notification.type === 'info' && 'ℹ️'}
              </span>
              <p className="font-medium">{notification.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}