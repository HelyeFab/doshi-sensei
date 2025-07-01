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
    
    // If this is a webpack-related error, try to recover
    if (error.message?.includes('Cannot read properties of undefined') && 
        error.message?.includes('call')) {
      // Clear service worker cache if available
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('workbox') || name.includes('next')) {
              caches.delete(name);
            }
          });
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
            onClick={() => {
              // Clear cache and reload
              if (typeof window !== 'undefined') {
                if ('caches' in window) {
                  caches.keys().then(names => {
                    Promise.all(names.map(name => caches.delete(name))).then(() => {
                      window.location.reload();
                    });
                  });
                } else {
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
          <Link
            href="/"
            className="block w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
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