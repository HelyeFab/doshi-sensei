'use client';

import { useEffect } from 'react';

export function FastRefreshLogger() {
  useEffect(() => {
    // Log when component mounts
    console.log('[FastRefreshLogger] Component mounted at:', new Date().toISOString());
    
    // Listen for Fast Refresh errors
    if (typeof window !== 'undefined') {
      const originalError = window.console.error;
      
      window.console.error = function(...args) {
        // Check if this is a Fast Refresh error
        const errorString = args.join(' ');
        if (errorString.includes('Fast Refresh') || 
            errorString.includes('mixed exports') ||
            errorString.includes('useNavigation')) {

          console.trace('Error stack trace:');
        }
        
        // Call original error function
        originalError.apply(window.console, args);
      };
      
      // Add global error handler
      const handleError = (event: ErrorEvent) => {
        console.error('🚨 [FastRefreshLogger] Global error caught:', event.error);
        if (event.error?.message?.includes('useNavigation') || 
            event.error?.message?.includes('Fast Refresh')) {
          console.error('🚨 Navigation-related error detected globally!');
          console.trace();
        }
      };
      
      window.addEventListener('error', handleError);
      
      // Add unhandled rejection handler
      const handleRejection = (event: PromiseRejectionEvent) => {
        console.error('🚨 [FastRefreshLogger] Unhandled promise rejection:', event.reason);
      };
      
      window.addEventListener('unhandledrejection', handleRejection);
      
      // Cleanup
      return () => {
        window.console.error = originalError;
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
      };
    }
  }, []);
  
  return null;
}