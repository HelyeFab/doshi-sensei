'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
    
    // If this is a webpack-related error or PWA-related error, try to recover
    if ((error.message?.includes('Cannot read properties of undefined') && 
        error.message?.includes('call')) || 
        error.message?.includes('beforeInstallPromptEvent')) {
      // Clear service worker cache if available
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        }).catch(err => {
          console.error('Error clearing caches:', err);
        });
      }
      
      // Unregister service workers
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        }).catch(err => {
          console.error('Error unregistering service workers:', err);
        });
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Something went wrong!
        </h1>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. This might be due to a caching issue.
        </p>
        <div className="space-y-4">
          <button
            onClick={async () => {
              // Clear cache and reload
              if (typeof window !== 'undefined') {
                try {
                  // Clear all caches
                  if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                  }
                  
                  // Unregister all service workers
                  if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map(reg => reg.unregister()));
                  }
                  
                  // Clear local storage PWA data
                  localStorage.removeItem('doshi_pwa_metrics');
                  localStorage.removeItem('doshi_pwa_events');
                  
                  // Force reload
                  window.location.reload();
                } catch (err) {
                  console.error('Error clearing data:', err);
                  // Try to reload anyway
                  window.location.reload();
                }
              }
            }}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Clear Cache and Reload
          </button>
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Try Again
          </button>
          <Link href="/"
            className="block w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            Return Home
          </Link>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Error Details
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}