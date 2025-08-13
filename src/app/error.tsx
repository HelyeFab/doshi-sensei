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

  const handleClearAndReload = async () => {
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating kanji characters for "error" theme */}
        <div className="absolute top-10 left-10 text-4xl text-destructive/10 animate-pulse">間</div>
        <div className="absolute top-20 right-20 text-3xl text-destructive/10 animate-pulse" style={{ animationDelay: '0.5s' }}>違</div>
        <div className="absolute bottom-20 left-20 text-5xl text-destructive/10 animate-pulse" style={{ animationDelay: '1s' }}>問</div>
        <div className="absolute bottom-10 right-10 text-4xl text-destructive/10 animate-pulse" style={{ animationDelay: '1.5s' }}>題</div>
        <div className="absolute top-1/3 left-1/4 text-3xl text-muted-foreground/10 animate-pulse" style={{ animationDelay: '2s' }}>Error</div>
        <div className="absolute top-1/2 right-1/3 text-4xl text-destructive/10 animate-pulse" style={{ animationDelay: '2.5s' }}>500</div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Dōshi mascot looking worried */}
        <div className="mb-8 relative">
          <div className="animate-pulse">
            <img
              src="/doshi.png"
              alt="Dōshi Sensei looking worried"
              width={200}
              height={200}
              className="mx-auto filter drop-shadow-xl grayscale-[50%]"
            />
          </div>
          {/* Sweat drops around Dōshi */}
          <div className="absolute top-4 -left-4 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>💧</div>
          <div className="absolute top-4 -right-4 text-2xl animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>💧</div>
          <div className="absolute top-1/3 -left-8 text-xl animate-bounce" style={{ animationDuration: '2s', animationDelay: '1s' }}>💧</div>
        </div>

        {/* Error text with gradient */}
        <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-destructive via-amber-500 to-destructive bg-clip-text text-transparent">
          ERROR
        </h1>

        {/* Japanese title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            大変！問題が発生しました！
          </h2>
          <p className="text-xl text-muted-foreground">
            (Taihen! Mondai ga hassei shimashita!)
          </p>
        </div>

        {/* Dōshi Sensei message */}
        <div className="mb-8">
          <p className="text-lg text-foreground/80">
            <span className="font-bold text-primary">Dōshi Sensei</span> encountered an unexpected problem...
          </p>
        </div>

        {/* Error message card */}
        <div className="bg-card border border-destructive/20 rounded-lg p-6 mb-8 shadow-lg">
          <h3 className="text-xl font-semibold text-card-foreground mb-2">
            Something went wrong!
          </h3>
          <p className="text-muted-foreground mb-4">
            {error.message?.includes('PWA') || error.message?.includes('serviceWorker') || error.message?.includes('beforeInstallPrompt') ?
              'This might be a caching issue. Try clearing the cache and reloading.' :
              'An error occurred while processing your request. Don\'t worry, we\'re working on it!'
            }
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                Technical details
              </summary>
              <pre className="mt-2 p-3 bg-muted/30 rounded text-xs overflow-auto max-h-32 text-muted-foreground">
                {error.message}
                {error.digest && `\nError ID: ${error.digest}`}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {(error.message?.includes('PWA') || error.message?.includes('serviceWorker') || error.message?.includes('beforeInstallPrompt')) && (
            <button
              onClick={handleClearAndReload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-all transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Cache & Reload
            </button>
          )}
          
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-all transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
        </div>

        {/* Encouraging message */}
        <div className="mt-12 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Don\'t give up!</span> In Japanese, mistakes are called &quot;間違い&quot; (machigai), 
            and they\'re an essential part of learning. Even Dōshi Sensei makes mistakes sometimes! 🌸
          </p>
        </div>
      </div>
    </div>
  );
}