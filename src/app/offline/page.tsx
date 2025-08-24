'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home, BookOpen, Gamepad2, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface CachedPage {
  url: string;
  title: string;
  timestamp: number;
  category: string;
}

export default function OfflinePage() {
  const [cachedPages, setCachedPages] = useState<CachedPage[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    // Load cached pages
    loadCachedContent();

    // Check offline queue size (if IndexedDB is available)
    checkQueueSize();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkQueueSize = async () => {
    try {
      if ('indexedDB' in window) {
        const db = await openDB();
        const transaction = db.transaction(['request-queue'], 'readonly');
        const store = transaction.objectStore('request-queue');
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          setQueueSize(countRequest.result);
        };
      }
    } catch (error) {
      console.error('Failed to check queue size:', error);
    }
  };

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('doshi-sensei-offline', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('request-queue')) {
          db.createObjectStore('request-queue', { keyPath: 'id' });
        }
      };
    });
  };

  const loadCachedContent = async () => {
    try {
      // Get all cache names
      const cacheNames = await caches.keys();
      const pages: CachedPage[] = [];

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          const url = new URL(request.url);
          
          // Filter out non-page resources
          if (
            url.pathname.startsWith('/api/') ||
            url.pathname.startsWith('/_next/') ||
            url.pathname.includes('.') ||
            url.pathname === '/offline'
          ) {
            continue;
          }

          // Categorize the page
          let category = 'Other';
          let title = url.pathname.replace(/\//g, ' > ').trim() || 'Home';

          if (url.pathname === '/') {
            category = 'Main';
            title = 'Home';
          } else if (url.pathname.includes('drill') || url.pathname.includes('practice')) {
            category = 'Practice';
            title = url.pathname.includes('drill') ? 'Drill Practice' : 'Practice Mode';
          } else if (url.pathname.includes('vocabulary')) {
            category = 'Study';
            title = 'Vocabulary';
          } else if (url.pathname.includes('games')) {
            category = 'Games';
            title = 'Learning Games';
          } else if (url.pathname.includes('stories')) {
            category = 'Reading';
            title = 'Stories';
          } else if (url.pathname.includes('news')) {
            category = 'Reading';
            title = 'News';
          } else if (url.pathname.includes('hiragana')) {
            category = 'Study';
            title = 'Hiragana';
          } else if (url.pathname.includes('katakana')) {
            category = 'Study';
            title = 'Katakana';
          }

          pages.push({
            url: url.pathname,
            title,
            timestamp: Date.now(),
            category
          });
        }
      }

      // Remove duplicates and sort by category
      const uniquePages = Array.from(
        new Map(pages.map(page => [page.url, page])).values()
      ).sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.title.localeCompare(b.title);
      });

      setCachedPages(uniquePages);
    } catch (error) {
      console.error('Failed to load cached content:', error);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const categoryIcons: Record<string, JSX.Element> = {
    Main: <Home className="w-5 h-5" />,
    Practice: <BookOpen className="w-5 h-5" />,
    Study: <GraduationCap className="w-5 h-5" />,
    Games: <Gamepad2 className="w-5 h-5" />,
    Reading: <BookOpen className="w-5 h-5" />,
    Other: <Home className="w-5 h-5" />
  };

  // Online restoration screen
  if (isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500/10 to-green-600/10 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <RefreshCw className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Connection Restored!</h1>
          <p className="text-muted-foreground">Redirecting you back to the app...</p>
        </div>
      </div>
    );
  }

  // Offline page
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <WifiOff className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">You're Offline</h1>
                <p className="text-sm text-muted-foreground">But you can still access cached content</p>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </header>

      {/* Queue Status */}
      {queueSize > 0 && (
        <div className="bg-warning/10 border-b border-warning/20">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                <p className="text-sm text-warning-foreground">
                  {queueSize} action{queueSize !== 1 ? 's' : ''} pending sync
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Fallback Card (when no cached pages) */}
        {cachedPages.length === 0 && (
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 max-w-md mx-auto text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">You're Offline</h2>
            <p className="text-muted-foreground mb-4">
              It looks like you've lost your internet connection. Some features
              may not be available.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Don't worry! Many features of Doshi Sensei work offline, including
              your saved vocabulary and practice drills.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Cached Pages */}
        {cachedPages.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Available offline content</h2>
            <div className="space-y-6">
              {Object.entries(
                cachedPages.reduce((acc, page) => {
                  if (!acc[page.category]) {
                    acc[page.category] = [];
                  }
                  acc[page.category].push(page);
                  return acc;
                }, {} as Record<string, CachedPage[]>)
              ).map(([category, pages]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    {categoryIcons[category]}
                    {category}
                  </h3>
                  <div className="bg-card rounded-lg border border-border divide-y divide-border">
                    {pages.map((page) => (
                      <Link
                        key={page.url}
                        href={page.url}
                        className="block px-4 py-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground">{page.title}</span>
                          <svg
                            className="w-4 h-4 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tips Section */}
        <section className="mt-8 bg-primary/5 rounded-lg p-6 border border-primary/10">
          <h3 className="font-medium text-foreground mb-2">💡 Offline Tips</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Your progress is saved locally and will sync when you're back online</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Visit pages while online to make them available offline</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>The app will automatically update when connection is restored</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}