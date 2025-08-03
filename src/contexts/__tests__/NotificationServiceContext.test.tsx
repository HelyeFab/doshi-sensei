import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationServiceProvider, useNotifications } from '../NotificationServiceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { notificationService } from '@/services/notifications/NotificationService';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/NotificationContext');
jest.mock('@/services/notifications/NotificationService');

// Test component that uses the hook
function TestComponent() {
  const {
    isInitialized,
    permissionStatus,
    preferences,
    requestPermission,
    updatePreferences,
    testNotification,
  } = useNotifications();

  return (
    <div>
      <div data-testid="initialized">{isInitialized ? 'true' : 'false'}</div>
      <div data-testid="permission">{permissionStatus}</div>
      <div data-testid="preferences">{JSON.stringify(preferences)}</div>
      <button onClick={requestPermission}>Request Permission</button>
      <button onClick={() => updatePreferences({ enabled: false })}>Update Preferences</button>
      <button onClick={() => testNotification('study_reminder')}>Test Notification</button>
    </div>
  );
}

describe('NotificationServiceContext', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockShowNotification = jest.fn();
  const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (useNotification as jest.Mock).mockReturnValue({ showNotification: mockShowNotification });
    
    // Mock notification service methods
    mockNotificationService.initialize = jest.fn().mockResolvedValue(undefined);
    mockNotificationService.getPermissionStatus = jest.fn().mockReturnValue('default');
    mockNotificationService.getPreferences = jest.fn().mockResolvedValue(null);
    mockNotificationService.requestPermission = jest.fn().mockResolvedValue(true);
    mockNotificationService.updatePreferences = jest.fn().mockResolvedValue(undefined);
    mockNotificationService.testNotification = jest.fn().mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize service when user is authenticated', async () => {
      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      expect(mockNotificationService.initialize).toHaveBeenCalledWith('test-user-123');
      expect(mockNotificationService.getPermissionStatus).toHaveBeenCalled();
      expect(mockNotificationService.getPreferences).toHaveBeenCalled();
    });

    it('should not initialize when user is not authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('false');
      });

      expect(mockNotificationService.initialize).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockNotificationService.initialize.mockRejectedValue(new Error('Init failed'));

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      // Should not throw, just log error
      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('false');
      });
    });
  });

  describe('permission management', () => {
    it('should request permission and show success notification', async () => {
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Request Permission'));

      await waitFor(() => {
        expect(mockNotificationService.requestPermission).toHaveBeenCalled();
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'Notifications enabled successfully! 🔔',
          type: 'success',
        });
      });
    });

    it('should show error notification when permission denied', async () => {
      mockNotificationService.requestPermission.mockResolvedValue(false);
      mockNotificationService.getPermissionStatus.mockReturnValue('denied');
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Request Permission'));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'Notification permission denied',
          type: 'error',
        });
      });
    });

    it('should not request permission when not initialized', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await user.click(screen.getByText('Request Permission'));

      expect(mockNotificationService.requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('preferences management', () => {
    const mockPreferences = {
      userId: 'test-user-123',
      enabled: true,
      fcmToken: 'mock-token',
      timezone: 'America/New_York',
      preferences: {
        studyReminders: { enabled: true, times: ['08:00'], smartScheduling: false },
        reviewReminders: { enabled: true, advanceNotice: 30 },
        streakReminders: { enabled: true, time: '20:00' },
      },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    };

    beforeEach(async () => {
      mockNotificationService.getPreferences.mockResolvedValue(mockPreferences);
    });

    it('should load and display preferences', async () => {
      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('preferences')).toHaveTextContent(JSON.stringify(mockPreferences));
      });
    });

    it('should update preferences and show success notification', async () => {
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Update Preferences'));

      await waitFor(() => {
        expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith({ enabled: false });
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'Notification preferences updated',
          type: 'success',
        });
      });
    });

    it('should handle preference update errors', async () => {
      mockNotificationService.updatePreferences.mockRejectedValue(new Error('Update failed'));
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Update Preferences'));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'Failed to update preferences',
          type: 'error',
        });
      });
    });
  });

  describe('test notifications', () => {
    beforeEach(() => {
      mockNotificationService.getPermissionStatus.mockReturnValue('granted');
    });

    it('should send test notification successfully', async () => {
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Test Notification'));

      await waitFor(() => {
        expect(mockNotificationService.testNotification).toHaveBeenCalledWith('study_reminder');
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'Test notification sent!',
          message: 'Check your notifications.',
          type: 'success',
        });
      });
    });

    it('should show error when permission not granted', async () => {
      mockNotificationService.getPermissionStatus.mockReturnValue('default');
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Test Notification'));

      await waitFor(() => {
        expect(mockNotificationService.testNotification).not.toHaveBeenCalled();
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'Please enable notifications first',
          type: 'error',
        });
      });
    });

    it('should handle test notification errors', async () => {
      mockNotificationService.testNotification.mockRejectedValue(new Error('API error'));
      const user = userEvent.setup();

      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Test Notification'));

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith({
          title: 'API error',
          type: 'error',
        });
      });
    });
  });

  describe('in-app notification handling', () => {
    it('should handle app-notification events', async () => {
      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      // Dispatch custom event
      act(() => {
        const event = new CustomEvent('app-notification', {
          detail: {
            title: 'Test Title',
            body: 'Test Body',
            type: 'success',
            action: '/practice',
          },
        });
        window.dispatchEvent(event);
      });

      expect(mockShowNotification).toHaveBeenCalledWith({
        title: 'Test Title',
        message: 'Test Body',
        type: 'success',
        duration: 5000,
      });
    });

    it('should handle different notification types', async () => {
      render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      const testCases = [
        { type: 'error', expected: 'error' },
        { type: 'warning', expected: 'warning' },
        { type: 'info', expected: 'success' },
        { type: 'custom', expected: 'success' },
      ];

      for (const { type, expected } of testCases) {
        act(() => {
          const event = new CustomEvent('app-notification', {
            detail: { title: 'Test', body: 'Test', type },
          });
          window.dispatchEvent(event);
        });

        expect(mockShowNotification).toHaveBeenLastCalledWith(
          expect.objectContaining({ type: expected })
        );
      }
    });
  });

  describe('context error handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNotifications must be used within NotificationServiceProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should clean up event listeners on unmount', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <NotificationServiceProvider>
          <TestComponent />
        </NotificationServiceProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('initialized')).toHaveTextContent('true');
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'app-notification',
        expect.any(Function)
      );
    });
  });
});