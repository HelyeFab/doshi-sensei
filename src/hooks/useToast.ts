'use client';

import { useCallback } from 'react';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Simple toast implementation using browser console for now
// In production, this would integrate with the Toast component
export function useToast() {
  const showToast = useCallback((options: ToastOptions) => {
    // For now, just log to console
    // In a real implementation, this would show a toast notification
    const icon = options.type === 'success' ? '✅' : 
                 options.type === 'error' ? '❌' : 
                 options.type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} ${options.message}`);
  }, []);

  return { showToast };
}