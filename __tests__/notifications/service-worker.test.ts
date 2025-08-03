// Mock the service worker environment
declare const self: ServiceWorkerGlobalScope & {
  addEventListener: jest.Mock;
  registration: {
    showNotification: jest.Mock;
  };
  clients: {
    openWindow: jest.Mock;
    matchAll: jest.Mock;
  };
};

// Mock fetch globally
global.fetch = jest.fn();

describe('Service Worker Push Notifications', () => {
  let pushEventHandler: (event: any) => void;
  let notificationClickHandler: (event: any) => void;
  let notificationCloseHandler: (event: any) => void;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup service worker mocks
    (global as any).self = {
      addEventListener: jest.fn((event: string, handler: any) => {
        if (event === 'push') pushEventHandler = handler;
        if (event === 'notificationclick') notificationClickHandler = handler;
        if (event === 'notificationclose') notificationCloseHandler = handler;
      }),
      registration: {
        showNotification: jest.fn().mockResolvedValue(undefined),
      },
      clients: {
        openWindow: jest.fn().mockResolvedValue({}),
        matchAll: jest.fn().mockResolvedValue([]),
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Load the relevant parts of the service worker
    // In a real test, you'd import the actual service worker code
    // For this example, we'll define the handlers inline
    self.addEventListener('push', (event: any) => {
      pushEventHandler = async (event: any) => {
        if (!event.data) return;

        const data = event.data.json();
        const { notification, data: customData } = data;

        const options = {
          body: notification.body,
          icon: customData?.icon || '/doshi.png',
          badge: customData?.badge || '/badge-72x72.png',
          tag: customData?.tag || 'default',
          data: customData,
          requireInteraction: customData?.requireInteraction || false,
          actions: customData?.actions || [],
        };

        await self.registration.showNotification(notification.title, options);
      };
    });

    self.addEventListener('notificationclick', (event: any) => {
      notificationClickHandler = async (event: any) => {
        event.notification.close();

        const action = event.action || event.notification.data?.action || 'default';
        const url = event.notification.data?.url || '/';

        // Track click
        await fetch('/api/notifications/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: event.notification.data?.type,
            action: action,
            timestamp: new Date().toISOString(),
          }),
        });

        // Open window
        const windowClients = await self.clients.matchAll({ type: 'window' });
        const existingClient = windowClients.find(client => client.url === url);

        if (existingClient) {
          await existingClient.focus();
        } else {
          await self.clients.openWindow(url);
        }
      };
    });

    self.addEventListener('notificationclose', (event: any) => {
      notificationCloseHandler = async (event: any) => {
        await fetch('/api/notifications/track-dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: event.notification.data?.type,
            timestamp: new Date().toISOString(),
          }),
        });
      };
    });
  });

  describe('push event handling', () => {
    it('should show notification when push event received', async () => {
      const mockPushData = {
        notification: {
          title: 'Study Reminder',
          body: 'Time to practice Japanese!',
        },
        data: {
          type: 'study_reminder',
          url: '/practice',
          icon: '/custom-icon.png',
          badge: '/custom-badge.png',
        },
      };

      const pushEvent = {
        data: {
          json: () => mockPushData,
        },
        waitUntil: jest.fn(),
      };

      await pushEventHandler(pushEvent);

      expect(self.registration.showNotification).toHaveBeenCalledWith(
        'Study Reminder',
        {
          body: 'Time to practice Japanese!',
          icon: '/custom-icon.png',
          badge: '/custom-badge.png',
          tag: 'default',
          data: mockPushData.data,
          requireInteraction: false,
          actions: [],
        }
      );
    });

    it('should use default values when custom data not provided', async () => {
      const mockPushData = {
        notification: {
          title: 'Test Notification',
          body: 'Test body',
        },
        data: {},
      };

      const pushEvent = {
        data: {
          json: () => mockPushData,
        },
        waitUntil: jest.fn(),
      };

      await pushEventHandler(pushEvent);

      expect(self.registration.showNotification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          icon: '/doshi.png',
          badge: '/badge-72x72.png',
        })
      );
    });

    it('should handle push events without data', async () => {
      const pushEvent = {
        data: null,
        waitUntil: jest.fn(),
      };

      await pushEventHandler(pushEvent);

      expect(self.registration.showNotification).not.toHaveBeenCalled();
    });

    it('should include actions when provided', async () => {
      const mockPushData = {
        notification: {
          title: 'Review Reminder',
          body: '10 items ready for review',
        },
        data: {
          type: 'review_reminder',
          actions: [
            { action: 'review', title: 'Start Review' },
            { action: 'dismiss', title: 'Later' },
          ],
        },
      };

      const pushEvent = {
        data: {
          json: () => mockPushData,
        },
        waitUntil: jest.fn(),
      };

      await pushEventHandler(pushEvent);

      expect(self.registration.showNotification).toHaveBeenCalledWith(
        'Review Reminder',
        expect.objectContaining({
          actions: mockPushData.data.actions,
        })
      );
    });
  });

  describe('notification click handling', () => {
    it('should track click and open window', async () => {
      const mockNotification = {
        close: jest.fn(),
        data: {
          type: 'study_reminder',
          url: '/practice',
        },
      };

      const clickEvent = {
        notification: mockNotification,
        action: '',
        waitUntil: jest.fn(),
      };

      await notificationClickHandler(clickEvent);

      expect(mockNotification.close).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/track-click',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'study_reminder',
            action: 'default',
            timestamp: expect.any(String),
          }),
        })
      );
      expect(self.clients.openWindow).toHaveBeenCalledWith('/practice');
    });

    it('should focus existing window if available', async () => {
      const mockClient = {
        url: '/practice',
        focus: jest.fn(),
      };
      self.clients.matchAll.mockResolvedValue([mockClient]);

      const mockNotification = {
        close: jest.fn(),
        data: {
          type: 'study_reminder',
          url: '/practice',
        },
      };

      const clickEvent = {
        notification: mockNotification,
        action: '',
        waitUntil: jest.fn(),
      };

      await notificationClickHandler(clickEvent);

      expect(mockClient.focus).toHaveBeenCalled();
      expect(self.clients.openWindow).not.toHaveBeenCalled();
    });

    it('should handle action clicks', async () => {
      const mockNotification = {
        close: jest.fn(),
        data: {
          type: 'review_reminder',
          url: '/review',
        },
      };

      const clickEvent = {
        notification: mockNotification,
        action: 'start-review',
        waitUntil: jest.fn(),
      };

      await notificationClickHandler(clickEvent);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/track-click',
        expect.objectContaining({
          body: JSON.stringify({
            type: 'review_reminder',
            action: 'start-review',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should use default URL when not provided', async () => {
      const mockNotification = {
        close: jest.fn(),
        data: {
          type: 'generic',
        },
      };

      const clickEvent = {
        notification: mockNotification,
        action: '',
        waitUntil: jest.fn(),
      };

      await notificationClickHandler(clickEvent);

      expect(self.clients.openWindow).toHaveBeenCalledWith('/');
    });
  });

  describe('notification close handling', () => {
    it('should track dismiss event', async () => {
      const mockNotification = {
        data: {
          type: 'streak_reminder',
        },
      };

      const closeEvent = {
        notification: mockNotification,
        waitUntil: jest.fn(),
      };

      await notificationCloseHandler(closeEvent);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/track-dismiss',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'streak_reminder',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should handle notifications without type', async () => {
      const mockNotification = {
        data: {},
      };

      const closeEvent = {
        notification: mockNotification,
        waitUntil: jest.fn(),
      };

      await notificationCloseHandler(closeEvent);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/track-dismiss',
        expect.objectContaining({
          body: JSON.stringify({
            type: undefined,
            timestamp: expect.any(String),
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle tracking API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockNotification = {
        close: jest.fn(),
        data: {
          type: 'study_reminder',
          url: '/practice',
        },
      };

      const clickEvent = {
        notification: mockNotification,
        action: '',
        waitUntil: jest.fn(),
      };

      await notificationClickHandler(clickEvent);

      // Should still close notification and open window despite API error
      expect(mockNotification.close).toHaveBeenCalled();
      expect(self.clients.openWindow).toHaveBeenCalledWith('/practice');

      consoleSpy.mockRestore();
    });

    it('should handle showNotification errors', async () => {
      self.registration.showNotification.mockRejectedValue(new Error('Permission denied'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockPushData = {
        notification: {
          title: 'Test',
          body: 'Test',
        },
        data: {},
      };

      const pushEvent = {
        data: {
          json: () => mockPushData,
        },
        waitUntil: jest.fn(),
      };

      await expect(pushEventHandler(pushEvent)).rejects.toThrow('Permission denied');

      consoleSpy.mockRestore();
    });
  });
});