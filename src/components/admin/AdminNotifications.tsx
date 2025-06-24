'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        showNotification,
        removeNotification,
        clearAll,
      }}
    >
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`relative rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out animate-in slide-in-from-right ${getColors()}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="mt-1 text-sm text-muted-foreground">
              {notification.message}
            </p>
          )}
          
          {notification.action && (
            <div className="mt-2">
              <button
                onClick={notification.action.onClick}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {notification.action.label}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Utility functions for common notification types
export function useAdminNotifications() {
  const { showNotification } = useNotifications();

  return {
    success: (title: string, message?: string) => {
      showNotification({ type: 'success', title, message });
    },
    error: (title: string, message?: string) => {
      showNotification({ type: 'error', title, message, duration: 7000 });
    },
    warning: (title: string, message?: string) => {
      showNotification({ type: 'warning', title, message });
    },
    info: (title: string, message?: string) => {
      showNotification({ type: 'info', title, message });
    },
    moodBoardCreated: (title: string) => {
      showNotification({
        type: 'success',
        title: 'Mood Board Created',
        message: `"${title}" has been created successfully`,
        action: {
          label: 'View Mood Boards',
          onClick: () => window.location.href = '/admin/mood-boards'
        }
      });
    },
    moodBoardUpdated: (title: string) => {
      showNotification({
        type: 'success',
        title: 'Mood Board Updated',
        message: `"${title}" has been updated successfully`
      });
    },
    userUpgraded: (email: string) => {
      showNotification({
        type: 'success',
        title: 'User Upgraded',
        message: `${email} has been upgraded to premium`
      });
    }
  };
}