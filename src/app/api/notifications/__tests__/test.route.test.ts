import { NextRequest } from 'next/server';
import { POST } from '../test/route';
import { getFirebaseAdmin } from '@/lib/firebase-admin-safe';

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin-safe');

describe('/api/notifications/test', () => {
  const mockAdmin = {
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          add: jest.fn(),
        })),
      })),
    })),
    messaging: jest.fn(() => ({
      send: jest.fn(),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirebaseAdmin as jest.Mock).mockResolvedValue(mockAdmin);
  });

  describe('authentication', () => {
    it('should return 401 when no auth header provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {},
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth header is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'InvalidToken',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should verify token with Firebase auth', async () => {
      const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'test-user-123' });
      mockAdmin.auth.mockReturnValue({ verifyIdToken: mockVerifyIdToken });

      const request = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ type: 'study_reminder' }),
      });

      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'mock-fcm-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockPrefsDoc)
        .mockResolvedValueOnce(mockUserDoc);

      mockAdmin.firestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: mockGet,
          })),
          add: jest.fn(),
        })),
      });

      mockAdmin.messaging.mockReturnValue({
        send: jest.fn().mockResolvedValue('mock-message-id'),
      });

      await POST(request);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('notification sending', () => {
    let mockRequest: NextRequest;
    let mockFirestore: any;
    let mockMessaging: any;

    beforeEach(() => {
      mockRequest = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ type: 'study_reminder' }),
      });

      mockAdmin.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user-123' }),
      });

      mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(),
          })),
          add: jest.fn(),
        })),
      };
      mockAdmin.firestore.mockReturnValue(mockFirestore);

      mockMessaging = {
        send: jest.fn().mockResolvedValue('mock-message-id'),
      };
      mockAdmin.messaging.mockReturnValue(mockMessaging);
    });

    it('should return 400 when no FCM token found', async () => {
      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: null }),
      };

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockPrefsDoc),
        })),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No FCM token found. Please enable notifications first.');
    });

    it('should send study reminder notification', async () => {
      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'mock-fcm-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockPrefsDoc)
        .mockResolvedValueOnce(mockUserDoc);

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: mockGet,
        })),
        add: jest.fn(),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('mock-message-id');

      expect(mockMessaging.send).toHaveBeenCalledWith({
        token: 'mock-fcm-token',
        notification: {
          title: 'Test: Good morning, Test User-san! 🌅',
          body: 'This is a test study reminder notification',
        },
        data: {
          type: 'test_study_reminder',
          url: '/practice',
          userId: 'test-user-123',
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
                action: 'dismiss',
                title: 'Dismiss',
              },
            ],
          },
        },
      });
    });

    it('should send review reminder notification', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ type: 'review_reminder' }),
      });

      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'mock-fcm-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockPrefsDoc)
        .mockResolvedValueOnce(mockUserDoc);

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: mockGet,
        })),
        add: jest.fn(),
      });

      await POST(mockRequest);

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Test: 15 items ready for review 📚',
            body: 'This is a test review reminder notification',
          }),
          data: expect.objectContaining({
            type: 'test_review_reminder',
            url: '/review',
          }),
        })
      );
    });

    it('should send streak reminder notification', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ type: 'streak_reminder' }),
      });

      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'mock-fcm-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockPrefsDoc)
        .mockResolvedValueOnce(mockUserDoc);

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: mockGet,
        })),
        add: jest.fn(),
      });

      await POST(mockRequest);

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Test: Keep your streak alive! 🔥',
            body: 'This is a test streak reminder notification',
          }),
          data: expect.objectContaining({
            type: 'test_streak_reminder',
          }),
        })
      );
    });

    it('should use default type when not specified', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({}),
      });

      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'mock-fcm-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockPrefsDoc)
        .mockResolvedValueOnce(mockUserDoc);

      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: mockGet,
        })),
        add: jest.fn(),
      });

      await POST(mockRequest);

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'test_study_reminder',
          }),
        })
      );
    });

    it('should log test notification', async () => {
      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'mock-fcm-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce(mockPrefsDoc)
        .mockResolvedValueOnce(mockUserDoc);

      const mockAdd = jest.fn();
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: mockGet,
        })),
        add: mockAdd,
      });

      await POST(mockRequest);

      expect(mockAdd).toHaveBeenCalledWith({
        userId: 'test-user-123',
        notificationType: 'test_study_reminder',
        sentAt: expect.any(Date),
        delivered: true,
        clicked: false,
        messageId: 'mock-message-id',
        test: true,
      });
    });
  });

  describe('error handling', () => {
    it('should handle invalid registration token error', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ type: 'study_reminder' }),
      });

      mockAdmin.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user-123' }),
      });

      const mockPrefsDoc = {
        exists: () => true,
        data: () => ({ fcmToken: 'invalid-token' }),
      };
      const mockUserDoc = {
        exists: () => true,
        data: () => ({ displayName: 'Test User' }),
      };

      mockAdmin.firestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn()
              .mockResolvedValueOnce(mockPrefsDoc)
              .mockResolvedValueOnce(mockUserDoc),
          })),
        })),
      });

      const error = new Error('Invalid token');
      (error as any).code = 'messaging/registration-token-not-registered';
      mockAdmin.messaging.mockReturnValue({
        send: jest.fn().mockRejectedValue(error),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Your notification token is invalid. Please refresh the page and enable notifications again.');
    });

    it('should handle generic errors', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/notifications/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ type: 'study_reminder' }),
      });

      mockAdmin.auth.mockReturnValue({
        verifyIdToken: jest.fn().mockRejectedValue(new Error('Auth error')),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Auth error');
    });
  });
});