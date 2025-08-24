'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function PasswordDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  placeholder = 'Enter password',
  type = 'danger',
}: PasswordDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setPassword('');
      setShowPassword(false);
      document.body.style.overflow = 'hidden';
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setPassword('');
      setShowPassword(false);
    }, 200);
  };

  const handleConfirm = () => {
    if (!password.trim()) {
      inputRef.current?.focus();
      return;
    }
    setIsAnimating(false);
    setTimeout(() => {
      onConfirm(password);
      onClose();
      setPassword('');
      setShowPassword(false);
    }, 200);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfirm();
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
      aria-labelledby="password-dialog-title"
      aria-describedby="password-dialog-message"
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
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="border-b border-border px-6 py-4">
            <h2
              id="password-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <div
              id="password-dialog-message"
              className="mb-4 text-muted-foreground"
            >
              {message}
            </div>
            
            {/* Password Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={!password.trim()}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${getTypeStyles()}`}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

// Hook for easier usage
export function usePasswordDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    placeholder?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: (password: string) => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showPasswordDialog = (options: Omit<typeof dialogState, 'isOpen'>) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  };

  const hidePasswordDialog = () => {
    dialogState.onCancel?.();
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const PasswordDialogComponent = () => (
    <PasswordDialog
      isOpen={dialogState.isOpen}
      onClose={hidePasswordDialog}
      onConfirm={(password) => {
        dialogState.onConfirm(password);
        hidePasswordDialog();
      }}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      placeholder={dialogState.placeholder}
      type={dialogState.type}
    />
  );

  return { showPasswordDialog, hidePasswordDialog, PasswordDialogComponent };
}