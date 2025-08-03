import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPreferences } from '../NotificationPreferences';
import { useNotifications } from '@/contexts/NotificationServiceContext';
import { useStrings } from '@/contexts/LanguageContext';
import { NotificationPreferences as NotificationPrefsType } from '@/types/notifications';

// Mock dependencies
jest.mock('@/contexts/NotificationServiceContext');
jest.mock('@/contexts/LanguageContext');

describe('NotificationPreferences', () => {
  const mockPreferences: NotificationPrefsType = {
    userId: 'test-user-123',
    enabled: true,
    fcmToken: 'mock-token',
    timezone: 'America/New_York',
    preferences: {
      studyReminders: {
        enabled: true,
        times: ['08:00', '19:00'],
        smartScheduling: false,
      },
      reviewReminders: {
        enabled: true,
        advanceNotice: 30,
      },
      streakReminders: {
        enabled: true,
        time: '20:00',
      },
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };

  const mockUpdatePreferences = jest.fn();
  const mockRequestPermission = jest.fn();
  const mockTestNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useStrings as jest.Mock).mockReturnValue({});
    (useNotifications as jest.Mock).mockReturnValue({
      preferences: mockPreferences,
      updatePreferences: mockUpdatePreferences,
      permissionStatus: 'granted',
      requestPermission: mockRequestPermission,
      testNotification: mockTestNotification,
    });
  });

  describe('permission states', () => {
    it('should show blocked message when permission is denied', () => {
      (useNotifications as jest.Mock).mockReturnValue({
        permissionStatus: 'denied',
        preferences: null,
        updatePreferences: mockUpdatePreferences,
        requestPermission: mockRequestPermission,
      });

      render(<NotificationPreferences />);

      expect(screen.getByText('Notifications Blocked')).toBeInTheDocument();
      expect(screen.getByText(/blocked notifications/)).toBeInTheDocument();
    });

    it('should show enable button when permission is default', () => {
      (useNotifications as jest.Mock).mockReturnValue({
        permissionStatus: 'default',
        preferences: null,
        updatePreferences: mockUpdatePreferences,
        requestPermission: mockRequestPermission,
      });

      render(<NotificationPreferences />);

      expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enable Notifications' })).toBeInTheDocument();
    });

    it('should handle enable notifications click', async () => {
      (useNotifications as jest.Mock).mockReturnValue({
        permissionStatus: 'default',
        preferences: null,
        updatePreferences: mockUpdatePreferences,
        requestPermission: mockRequestPermission,
      });

      const user = userEvent.setup();
      render(<NotificationPreferences />);

      await user.click(screen.getByRole('button', { name: 'Enable Notifications' }));
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('preferences UI', () => {
    it('should render all preference toggles', () => {
      render(<NotificationPreferences />);

      expect(screen.getByText('Study Reminders')).toBeInTheDocument();
      expect(screen.getByText('Review Reminders')).toBeInTheDocument();
      expect(screen.getByText('Streak Reminders')).toBeInTheDocument();
    });

    it('should show reminder times when study reminders are enabled', () => {
      render(<NotificationPreferences />);

      expect(screen.getByText('Reminder times:')).toBeInTheDocument();
      expect(screen.getByLabelText('08:00')).toBeChecked();
      expect(screen.getByLabelText('12:00')).not.toBeChecked();
      expect(screen.getByLabelText('19:00')).toBeChecked();
    });

    it('should toggle study reminders', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const toggle = screen.getByRole('checkbox', { name: '' });
      await user.click(toggle);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          preferences: expect.objectContaining({
            studyReminders: expect.objectContaining({
              enabled: false,
            }),
          }),
        });
      });
    });

    it('should handle time selection changes', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const time12 = screen.getByLabelText('12:00');
      await user.click(time12);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          preferences: expect.objectContaining({
            studyReminders: expect.objectContaining({
              times: ['08:00', '19:00', '12:00'],
            }),
          }),
        });
      });
    });

    it('should handle time deselection', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const time08 = screen.getByLabelText('08:00');
      await user.click(time08);

      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith({
          preferences: expect.objectContaining({
            studyReminders: expect.objectContaining({
              times: ['19:00'],
            }),
          }),
        });
      });
    });
  });

  describe('test notification', () => {
    it('should show test notification button', () => {
      render(<NotificationPreferences />);
      expect(screen.getByRole('button', { name: 'Send Test Notification' })).toBeInTheDocument();
    });

    it('should call test notification on click', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      await user.click(screen.getByRole('button', { name: 'Send Test Notification' }));
      expect(mockTestNotification).toHaveBeenCalledWith('study_reminder');
    });

    it('should disable button during loading', async () => {
      mockUpdatePreferences.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const toggle = screen.getAllByRole('checkbox')[0];
      await user.click(toggle);

      const testButton = screen.getByRole('button', { name: 'Send Test Notification' });
      expect(testButton).toBeDisabled();

      await waitFor(() => {
        expect(testButton).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle update errors gracefully', async () => {
      mockUpdatePreferences.mockRejectedValue(new Error('Update failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const toggle = screen.getAllByRole('checkbox')[0];
      await user.click(toggle);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update preferences:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should recover from errors and allow retry', async () => {
      mockUpdatePreferences
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const toggle = screen.getAllByRole('checkbox')[0];
      
      // First attempt fails
      await user.click(toggle);
      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledTimes(1);
      });

      // Second attempt succeeds
      await user.click(toggle);
      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('loading states', () => {
    it('should disable all controls during update', async () => {
      mockUpdatePreferences.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const toggles = screen.getAllByRole('checkbox');
      await user.click(toggles[0]);

      // All toggles should be disabled
      toggles.forEach(toggle => {
        expect(toggle).toBeDisabled();
      });

      // Test button should be disabled
      expect(screen.getByRole('button', { name: 'Send Test Notification' })).toBeDisabled();

      await waitFor(() => {
        toggles.forEach(toggle => {
          expect(toggle).not.toBeDisabled();
        });
      });
    });
  });

  describe('preferences synchronization', () => {
    it('should update local state when preferences prop changes', () => {
      const { rerender } = render(<NotificationPreferences />);

      const updatedPreferences = {
        ...mockPreferences,
        preferences: {
          ...mockPreferences.preferences,
          studyReminders: {
            ...mockPreferences.preferences.studyReminders,
            enabled: false,
          },
        },
      };

      (useNotifications as jest.Mock).mockReturnValue({
        preferences: updatedPreferences,
        updatePreferences: mockUpdatePreferences,
        permissionStatus: 'granted',
        requestPermission: mockRequestPermission,
        testNotification: mockTestNotification,
      });

      rerender(<NotificationPreferences />);

      const studyToggle = screen.getAllByRole('checkbox')[0];
      expect(studyToggle).not.toBeChecked();
    });

    it('should not show time options when study reminders disabled', () => {
      const disabledPreferences = {
        ...mockPreferences,
        preferences: {
          ...mockPreferences.preferences,
          studyReminders: {
            ...mockPreferences.preferences.studyReminders,
            enabled: false,
          },
        },
      };

      (useNotifications as jest.Mock).mockReturnValue({
        preferences: disabledPreferences,
        updatePreferences: mockUpdatePreferences,
        permissionStatus: 'granted',
        requestPermission: mockRequestPermission,
        testNotification: mockTestNotification,
      });

      render(<NotificationPreferences />);

      expect(screen.queryByText('Reminder times:')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      render(<NotificationPreferences />);

      // Check for proper heading
      expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();

      // Check toggles have accessible labels
      const toggles = screen.getAllByRole('checkbox');
      expect(toggles).toHaveLength(6); // 3 main toggles + 3 time checkboxes

      // Check button is properly labeled
      expect(screen.getByRole('button', { name: 'Send Test Notification' })).toBeInTheDocument();
    });

    it('should maintain focus after toggle interaction', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences />);

      const toggle = screen.getAllByRole('checkbox')[0];
      toggle.focus();
      expect(toggle).toHaveFocus();

      await user.click(toggle);
      
      // Focus should remain on the toggle
      await waitFor(() => {
        expect(toggle).toHaveFocus();
      });
    });
  });
});