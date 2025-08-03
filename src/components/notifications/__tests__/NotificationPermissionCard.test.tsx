import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPermissionCard } from '../NotificationPermissionCard';
import { useNotifications } from '@/contexts/NotificationServiceContext';
import { useStrings } from '@/contexts/LanguageContext';

// Mock dependencies
jest.mock('@/contexts/NotificationServiceContext');
jest.mock('@/contexts/LanguageContext');

describe('NotificationPermissionCard', () => {
  const mockStrings = {
    notifications: {
      enableTitle: 'Enable Study Reminders',
      enableDescription: 'Get personalized reminders to maintain your learning streak',
      enableButton: 'Enable Notifications',
      requestingPermission: 'Requesting permission...',
      features: {
        studyReminders: {
          title: 'Daily Study Reminders',
          description: 'Never forget to practice',
        },
        reviewNotifications: {
          title: 'Review Notifications',
          description: 'Know when items are due',
        },
        streakReminders: {
          title: 'Streak Reminders',
          description: 'Keep your streak alive',
        },
      },
    },
  };

  const mockRequestPermission = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useStrings as jest.Mock).mockReturnValue(mockStrings);
    (useNotifications as jest.Mock).mockReturnValue({
      requestPermission: mockRequestPermission,
      permissionStatus: 'default',
    });
  });

  it('should render permission card with all elements', () => {
    render(<NotificationPermissionCard />);

    expect(screen.getByText(mockStrings.notifications.enableTitle)).toBeInTheDocument();
    expect(screen.getByText(mockStrings.notifications.enableDescription)).toBeInTheDocument();
    expect(screen.getByText(mockStrings.notifications.enableButton)).toBeInTheDocument();

    // Check feature list
    expect(screen.getByText(mockStrings.notifications.features.studyReminders.title)).toBeInTheDocument();
    expect(screen.getByText(mockStrings.notifications.features.reviewNotifications.title)).toBeInTheDocument();
    expect(screen.getByText(mockStrings.notifications.features.streakReminders.title)).toBeInTheDocument();
  });

  it('should handle permission request on button click', async () => {
    mockRequestPermission.mockResolvedValue(true);
    const user = userEvent.setup();

    render(<NotificationPermissionCard />);

    const button = screen.getByText(mockStrings.notifications.enableButton);
    await user.click(button);

    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('should show loading state while requesting permission', async () => {
    mockRequestPermission.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();

    render(<NotificationPermissionCard />);

    const button = screen.getByText(mockStrings.notifications.enableButton);
    await user.click(button);

    expect(screen.getByText(mockStrings.notifications.requestingPermission)).toBeInTheDocument();
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(mockStrings.notifications.enableButton)).toBeInTheDocument();
    });
  });

  it('should not show card when permission is already granted', () => {
    (useNotifications as jest.Mock).mockReturnValue({
      requestPermission: mockRequestPermission,
      permissionStatus: 'granted',
    });

    const { container } = render(<NotificationPermissionCard />);
    expect(container.firstChild).toBeNull();
  });

  it('should not show card when permission is denied', () => {
    (useNotifications as jest.Mock).mockReturnValue({
      requestPermission: mockRequestPermission,
      permissionStatus: 'denied',
    });

    const { container } = render(<NotificationPermissionCard />);
    expect(container.firstChild).toBeNull();
  });

  it('should render correct icons for features', () => {
    render(<NotificationPermissionCard />);

    // Bell icon
    expect(screen.getByRole('img', { hidden: true }).closest('svg')).toHaveAttribute('viewBox', '0 0 24 24');
    
    // Check for all feature icons
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons).toHaveLength(4); // 1 main bell + 3 feature icons
  });

  it('should have correct styling classes', () => {
    render(<NotificationPermissionCard />);

    const card = screen.getByText(mockStrings.notifications.enableTitle).closest('div');
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'border-gray-100');

    const button = screen.getByText(mockStrings.notifications.enableButton);
    expect(button).toHaveClass('bg-primary', 'text-white', 'rounded-lg');
  });

  it('should handle permission request errors gracefully', async () => {
    mockRequestPermission.mockRejectedValue(new Error('Permission error'));
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<NotificationPermissionCard />);

    const button = screen.getByText(mockStrings.notifications.enableButton);
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(mockStrings.notifications.enableButton)).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    consoleSpy.mockRestore();
  });

  it('should maintain loading state during async operation', async () => {
    let resolvePermission: (value: boolean) => void;
    mockRequestPermission.mockImplementation(() => new Promise(resolve => {
      resolvePermission = resolve;
    }));

    const user = userEvent.setup();
    render(<NotificationPermissionCard />);

    const button = screen.getByText(mockStrings.notifications.enableButton);
    await user.click(button);

    // Should be in loading state
    expect(screen.getByText(mockStrings.notifications.requestingPermission)).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Resolve the promise
    await act(async () => {
      resolvePermission!(true);
    });

    // Should return to normal state
    await waitFor(() => {
      expect(screen.queryByText(mockStrings.notifications.requestingPermission)).not.toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  it('should be accessible', () => {
    render(<NotificationPermissionCard />);

    const button = screen.getByText(mockStrings.notifications.enableButton);
    expect(button).toHaveAttribute('type', 'button');
    
    // Check for proper heading hierarchy
    const heading = screen.getByText(mockStrings.notifications.enableTitle);
    expect(heading.tagName).toBe('H3');
  });
});