import React from 'react';
import ReactDOM from 'react-dom/client';
import { PasswordDialog } from '@/components/PasswordDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AlertDialog } from '@/components/AlertDialog';

// Promise-based password dialog
export function showPasswordPrompt(
  title: string,
  message: string | React.ReactNode,
  placeholder?: string,
  type?: 'danger' | 'warning' | 'info'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    const cleanup = () => {
      root.unmount();
      document.body.removeChild(container);
    };

    const handleConfirm = (password: string) => {
      cleanup();
      resolve(password);
    };

    const handleClose = () => {
      cleanup();
      reject(new Error('Password prompt cancelled'));
    };

    root.render(
      <PasswordDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={title}
        message={message}
        placeholder={placeholder}
        type={type}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    );
  });
}

// Promise-based confirm dialog
export function showConfirmDialog(
  title: string,
  message: string | React.ReactNode,
  type?: 'danger' | 'warning' | 'info',
  confirmText?: string,
  cancelText?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    const cleanup = () => {
      root.unmount();
      document.body.removeChild(container);
    };

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleClose = () => {
      cleanup();
      resolve(false);
    };

    root.render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={title}
        message={message}
        type={type}
        confirmText={confirmText}
        cancelText={cancelText}
      />
    );
  });
}

// Promise-based alert dialog
export function showAlert(
  title: string,
  message: string | React.ReactNode,
  type?: 'info' | 'warning' | 'error' | 'success',
  confirmText?: string
): Promise<void> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    const cleanup = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve();
    };

    root.render(
      <AlertDialog
        isOpen={true}
        onClose={cleanup}
        title={title}
        message={message}
        type={type}
        confirmText={confirmText}
      />
    );
  });
}