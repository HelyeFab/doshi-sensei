'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, ToastMessage } from './Toast';

interface ToastContextType {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  // Return a working stub if context is not available
  if (!context) {
    return {
      toast: {
        success: (title: string, message?: string) => {
          console.log('Toast success:', title, message);
        },
        error: (title: string, message?: string) => {
          console.error('Toast error:', title, message);
        },
        info: (title: string, message?: string) => {
          console.info('Toast info:', title, message);
        },
        warning: (title: string, message?: string) => {
          console.warn('Toast warning:', title, message);
        }
      }
    };
  }
  
  return context;
}