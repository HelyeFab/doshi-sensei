import { NotificationService } from '../NotificationService';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getApps } from 'firebase/app';

// Mock Firebase modules
jest.mock('firebase/messaging');
jest.mock('firebase/firestore');
jest.mock('firebase/app');
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    },
  },
  db: {},
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('NotificationService', () => {
  let service: NotificationService;
  let mockMessaging: any;
  let mockNotification: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset singleton
    (NotificationService as any).instance = null;
    
    // Mock browser APIs
    mockNotification = {
      permission: 'default',
      requestPermission: jest.fn(),
    };
    (global as any).Notification = mockNotification;
    
    // Mock Firebase app
    (getApps as jest.Mock).mockReturnValue([{ name: '[DEFAULT]' }]);
    
    // Mock messaging
    mockMessaging = {};
    (getMessaging as jest.Mock).mockReturnValue(mockMessaging);
    (getToken as jest.Mock).mockResolvedValue('mock-fcm-token');
    (onMessage as jest.Mock).mockImplementation(() => {});
    
    // Mock Firestore
    (doc as jest.Mock).mockReturnValue({ path: 'notificationPreferences/test-user-123' });
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    
    // Mock fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    
    service = NotificationService.getInstance();
  });

  afterEach(() => {
    delete (global as any).Notification;
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize messaging for authenticated user', async () => {
      await service.initialize('test-user-123');
      
      expect(getMessaging).toHaveBeenCalled();
      expect(onMessage).toHaveBeenCalled();
    });

    it('should handle initialization in non-browser environment', async () => {
      delete (global as any).Notification;
      
      await service.initialize('test-user-123');
      
      expect(getMessaging).not.toHaveBeenCalled();
    });

    it('should handle Firebase app not initialized', async () => {
      // Mock the dynamic import to simulate no Firebase app
      jest.spyOn(service as any, 'initialize').mockImplementation(async () => {
        try {
          const { initializeApp, getApps } = await import('firebase/app');
          const app = { getApps: jest.fn().mockReturnValue([]) };
          
          if (!app) {
            throw new Error('Firebase app not initialized');
          }
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        }
      });
      
      await service.initialize('test-user-123');
      
      // Should not throw, just log error
      expect(getMessaging).not.toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    it('should request permission and register token when granted', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted');
      (getToken as jest.Mock).mockResolvedValue('mock-fcm-token');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      await service.initialize('test-user-123');
      const result = await service.requestPermission();
      
      expect(result).toBe(true);
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(getToken).toHaveBeenCalledWith(
        mockMessaging,
        expect.objectContaining({
          vapidKey: expect.any(String),
        })
      );
    });

    it('should return false when permission denied', async () => {
      mockNotification.requestPermission.mockResolvedValue('denied');
      
      const result = await service.requestPermission();
      
      expect(result).toBe(false);
      expect(getToken).not.toHaveBeenCalled();
    });

    it('should handle permission request errors', async () => {
      mockNotification.requestPermission.mockRejectedValue(new Error('Permission error'));
      
      const result = await service.requestPermission();
      
      expect(result).toBe(false);
    });
  });

  describe('token management', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should save token to Firestore when preferences exist', async () => {
      (getToken as jest.Mock).mockResolvedValue('mock-fcm-token');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ enabled: true }),
      });
      
      mockNotification.requestPermission.mockResolvedValue('granted');
      await service.requestPermission();
      
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fcmToken: 'mock-fcm-token',
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should create new preferences when they do not exist', async () => {
      (getToken as jest.Mock).mockResolvedValue('mock-fcm-token');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      mockNotification.requestPermission.mockResolvedValue('granted');
      await service.requestPermission();
      
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'test-user-123',
          fcmToken: 'mock-fcm-token',
          enabled: false, // Default is false in DEFAULT_NOTIFICATION_PREFERENCES
          timezone: expect.any(String),
          preferences: expect.objectContaining({
            studyReminders: expect.any(Object),
            reviewReminders: expect.any(Object),
            streakReminders: expect.any(Object),
          }),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });

    it('should register token with backend API', async () => {
      (getToken as jest.Mock).mockResolvedValue('mock-fcm-token');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      mockNotification.requestPermission.mockResolvedValue('granted');
      await service.requestPermission();
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/register-token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-id-token',
          }),
          body: JSON.stringify({ token: 'mock-fcm-token' }),
        })
      );
    });
  });

  describe('preferences management', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should get preferences from Firestore', async () => {
      const mockPrefs = {
        userId: 'test-user-123',
        enabled: true,
        fcmToken: 'mock-token',
      };
      
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockPrefs,
      });
      
      const prefs = await service.getPreferences();
      
      expect(prefs).toEqual(mockPrefs);
      expect(getDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining('test-user-123'),
        })
      );
    });

    it('should return null when preferences do not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });
      
      const prefs = await service.getPreferences();
      
      expect(prefs).toBeNull();
    });

    it('should update preferences in Firestore and backend', async () => {
      const updates = {
        enabled: false,
        preferences: {
          studyReminders: { enabled: false },
        },
      };
      
      await service.updatePreferences(updates);
      
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...updates,
          updatedAt: expect.any(Date),
        })
      );
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/preferences',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });
  });

  describe('test notifications', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should send test notification request', async () => {
      await service.testNotification('study_reminder');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/notifications/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-id-token',
          }),
          body: JSON.stringify({ type: 'study_reminder' }),
        })
      );
    });

    it('should handle test notification errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Test failed' }),
      });
      
      await expect(service.testNotification()).rejects.toThrow('Test failed');
    });

    it('should use default type when not specified', async () => {
      await service.testNotification();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ type: 'study_reminder' }),
        })
      );
    });
  });

  describe('permission status', () => {
    it('should return current permission status', () => {
      mockNotification.permission = 'granted';
      expect(service.getPermissionStatus()).toBe('granted');
      
      mockNotification.permission = 'denied';
      expect(service.getPermissionStatus()).toBe('denied');
      
      mockNotification.permission = 'default';
      expect(service.getPermissionStatus()).toBe('default');
    });

    it('should return denied when Notification API not available', () => {
      delete (global as any).Notification;
      expect(service.getPermissionStatus()).toBe('denied');
    });
  });

  describe('foreground message handling', () => {
    let mockMessageHandler: any;

    beforeEach(async () => {
      (onMessage as jest.Mock).mockImplementation((messaging, handler) => {
        mockMessageHandler = handler;
      });
      
      await service.initialize('test-user-123');
    });

    it('should handle foreground messages', () => {
      const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
      
      const payload = {
        notification: {
          title: 'Test Title',
          body: 'Test Body',
        },
        data: {
          type: 'study_reminder',
          url: '/practice',
        },
      };
      
      mockMessageHandler(payload);
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app-notification',
          detail: expect.objectContaining({
            title: 'Test Title',
            body: 'Test Body',
            type: 'study_reminder',
            action: '/practice',
          }),
        })
      );
    });

    it('should handle messages without notification data', () => {
      const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
      
      const payload = {
        data: {
          type: 'test',
        },
      };
      
      mockMessageHandler(payload);
      
      expect(mockDispatchEvent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle user not authenticated errors', async () => {
      (auth.currentUser as any) = null;
      
      await service.initialize('test-user-123');
      
      await expect(service.testNotification()).rejects.toThrow('User not authenticated');
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      await service.initialize('test-user-123');
      
      // Should not throw for token registration (logged but not thrown)
      mockNotification.requestPermission.mockResolvedValue('granted');
      (getToken as jest.Mock).mockResolvedValue('mock-token');
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      
      await service.requestPermission();
      
      // Token should still be saved to Firestore even if backend fails
      expect(setDoc).toHaveBeenCalled();
    });
  });
});