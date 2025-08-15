'use client';

import { useEffect } from 'react';

export function PersistentLogger() {
  useEffect(() => {
    // Defer non-critical setup to avoid blocking the main thread
    const timeoutId = setTimeout(() => {
      // Create a logging function that persists across page refreshes
      const persistLog = (message: string) => {
        const logs = JSON.parse(sessionStorage.getItem('navigation-debug-logs') || '[]');
        logs.push({
          timestamp: new Date().toISOString(),
          message
        });
        // Keep only last 50 logs
        if (logs.length > 50) logs.shift();
        sessionStorage.setItem('navigation-debug-logs', JSON.stringify(logs));

      };

      // Log current state
      persistLog(`[PersistentLogger] Page loaded: ${window.location.pathname}`);

      // Override console.error to catch Fast Refresh errors
      const originalError = window.console.error;
      const originalWarn = window.console.warn;
      
      window.console.error = function(...args) {
        const errorString = args.join(' ');
        persistLog(`🚨 CONSOLE.ERROR: ${errorString.substring(0, 500)}`);
        originalError.apply(window.console, args);
      };
      
      window.console.warn = function(...args) {
        const warnString = args.join(' ');
        if (warnString.includes('Fast Refresh') || 
            warnString.includes('mixed exports') ||
            warnString.includes('useNavigation')) {
          persistLog(`⚠️ CONSOLE.WARN: ${warnString.substring(0, 500)}`);
        }
        originalWarn.apply(window.console, args);
      };

      // Add navigation listener
      const handleBeforeUnload = () => {
        persistLog(`[PersistentLogger] Page unloading from: ${window.location.pathname}`);
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Log all persisted messages on mount
      const logs = JSON.parse(sessionStorage.getItem('navigation-debug-logs') || '[]');
      
      // Add global function to clear logs
      (window as any).clearNavigationLogs = () => {
        sessionStorage.removeItem('navigation-debug-logs');

      };

      // Also capture navigation attempts
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.href) {
          persistLog(`[PersistentLogger] Link clicked: ${link.href}`);
        }
      };
      document.addEventListener('click', handleClick, true);
      
      // Store cleanup functions in outer scope
      (window as any).__persistentLoggerCleanup = () => {
        window.console.error = originalError;
        window.console.warn = originalWarn;
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('click', handleClick, true);
      };
    }, 0); // Use 0ms timeout to defer to next tick
    
    return () => {
      clearTimeout(timeoutId);
      // Call cleanup if it exists
      if ((window as any).__persistentLoggerCleanup) {
        (window as any).__persistentLoggerCleanup();
        delete (window as any).__persistentLoggerCleanup;
      }
    };
  }, []);

  return null;
}