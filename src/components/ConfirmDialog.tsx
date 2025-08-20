'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  confirmButtonClassName?: string;
  cancelButtonClassName?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  confirmButtonClassName,
  cancelButtonClassName,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleConfirm = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onConfirm();
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!mounted || !isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  const dialogContent = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all duration-200 ${
          isAnimating ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p
            id="dialog-message"
            className="text-gray-600 dark:text-gray-300"
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={handleClose}
            className={
              cancelButtonClassName ||
              `rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
            }
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={
              confirmButtonClassName ||
              `rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${getTypeStyles()}`
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

// Hook for easier usage
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showDialog = (options: Omit<typeof dialogState, 'isOpen'>) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  };

  const hideDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const DialogComponent = () => (
    <ConfirmDialog
      isOpen={dialogState.isOpen}
      onClose={hideDialog}
      onConfirm={() => {
        dialogState.onConfirm();
        hideDialog();
      }}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      type={dialogState.type}
    />
  );

  return { showDialog, hideDialog, DialogComponent };
}