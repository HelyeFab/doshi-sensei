'use client';

import { useState, useCallback } from 'react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

interface ErrorNotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  onClose?: () => void;
}

export function useErrorNotification() {
  const [errorState, setErrorState] = useState<ErrorNotificationState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showError = useCallback((title: string, message: string, onClose?: () => void) => {
    setErrorState({
      isOpen: true,
      title,
      message,
      onClose,
    });
  }, []);

  const hideError = useCallback(() => {
    errorState.onClose?.();
    setErrorState({
      isOpen: false,
      title: '',
      message: '',
    });
  }, [errorState.onClose]);

  const ErrorNotificationDialog = useCallback(() => (
    <ConfirmationDialog
      isOpen={errorState.isOpen}
      title={errorState.title}
      message={errorState.message}
      confirmText="OK"
      cancelText=""
      isDestructive={false}
      onConfirm={hideError}
      onCancel={hideError}
      loading={false}
    />
  ), [errorState, hideError]);

  return {
    showError,
    hideError,
    ErrorNotificationDialog,
  };
}

// Common error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
  SAVE_FAILED: {
    title: 'Save Failed',
    message: 'Your progress could not be saved. Please try again.',
  },
  LOAD_FAILED: {
    title: 'Loading Error',
    message: 'Failed to load the data. Please refresh the page and try again.',
  },
  AUDIO_FAILED: {
    title: 'Audio Error',
    message: 'Failed to play audio. Please check your device settings.',
  },
  SESSION_START_FAILED: {
    title: 'Session Error',
    message: 'Failed to start study session. Please try again.',
  },
  PERMISSION_DENIED: {
    title: 'Access Denied',
    message: 'You do not have permission to access this content.',
  },
};