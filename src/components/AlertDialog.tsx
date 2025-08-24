'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'OK',
  type = 'info',
}: AlertDialogProps) {
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
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Auto-focus the OK button
      setTimeout(() => {
        const button = dialogRef.current?.querySelector('button');
        button?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!mounted || !isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  const getIconStyles = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-primary';
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
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-message"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative w-full max-w-md transform overflow-hidden rounded-lg bg-card shadow-xl transition-all duration-200 ${
          isAnimating ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Icon and Header */}
        <div className="flex items-start gap-4 border-b border-border px-6 py-4">
          <span className={`text-2xl ${getIconStyles()}`}>{getIcon()}</span>
          <div className="flex-1">
            <h2
              id="alert-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 pl-[60px]">
          <div
            id="alert-dialog-message"
            className="text-muted-foreground"
          >
            {message}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border bg-muted/50 px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
export function useAlertDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    onClose?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (options: Omit<typeof dialogState, 'isOpen'>) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  };

  const hideAlert = () => {
    dialogState.onClose?.();
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const AlertDialogComponent = () => (
    <AlertDialog
      isOpen={dialogState.isOpen}
      onClose={hideAlert}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      type={dialogState.type}
    />
  );

  return { showAlert, hideAlert, AlertDialogComponent };
}