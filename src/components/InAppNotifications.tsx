'use client';

import { NotificationToast, useNotificationToast } from './NotificationToast';

export function InAppNotifications() {
  const { notification, clearNotification } = useNotificationToast();

  return (
    <NotificationToast 
      message={notification} 
      onClose={clearNotification} 
    />
  );
}