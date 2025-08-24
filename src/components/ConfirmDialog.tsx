'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  confirmButtonClassName?: string;
  cancelButtonClassName?: string;
  showCancel?: boolean;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  confirmButtonClassName,
  cancelButtonClassName,
  showCancel = true,
  confirmDisabled = false,
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
    if (confirmDisabled) return;
    setIsAnimating(false);
    setTimeout(() => {
      onConfirm();
      onClose();
    }, 200);
  };

  const handleCancel = () => {
    setIsAnimating(false);
    setTimeout(() => {
      if (onCancel) onCancel();
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
        return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground';
      case 'warning':
        return 'bg-warning hover:bg-warning/90 text-warning-foreground';
      default:
        return 'bg-primary hover:bg-primary/90 text-primary-foreground';
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
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative w-full max-w-md transform overflow-hidden rounded-lg bg-card shadow-xl transition-all duration-200 ${
          isAnimating ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-foreground"
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div
            id="dialog-message"
            className="text-muted-foreground"
          >
            {message}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          {showCancel && (
            <button
              onClick={handleCancel || handleClose}
              className={
                cancelButtonClassName ||
                `rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`
              }
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={
              confirmButtonClassName ||
              `rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${getTypeStyles()}`
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
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    confirmDisabled?: boolean;
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
      onCancel={dialogState.onCancel}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      type={dialogState.type}
      showCancel={dialogState.showCancel}
      confirmDisabled={dialogState.confirmDisabled}
    />
  );

  return { showDialog, hideDialog, DialogComponent };
}