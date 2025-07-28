'use client';

import { useState, useEffect } from 'react';
import { useOfflineContent } from '@/hooks/useOfflineContent';
import { CacheInitializer } from '@/lib/cache/cacheInitializer';
import { ArticleCache } from '@/lib/cache/articleCache';

// Test article data
const testArticle = {
  id: 'test-article-1',
  title: 'Test Article for Cache System',
  content: 'This is a test article to verify the caching system works correctly.',
  slug: 'test-article-cache',
  author: 'Test Author',
  publishedAt: Date.now(),
  readingTime: 5,
  images: ['https://via.placeholder.com/300x200'],
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  tags: ['test', 'cache'],
  version: '1.0'
};

export default function TestCacheClient() {
  const { 
    cacheResource, 
    getCachedCount, 
    getCachedResources,
    clearCache,
    canCache, 
    maxAllowed, 
    currentCount, 
    userType,
    isLoading,
    error 
  } = useOfflineContent('article');

  const [initialized, setInitialized] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    // Initialize cache system
    CacheInitializer.initialize().then(() => {
      setInitialized(true);
      setOfflineReady(CacheInitializer.isOfflineReady());
      addTestResult('✅ Cache system initialized');
    }).catch(err => {
      addTestResult('❌ Failed to initialize cache system: ' + err.message);
    });
  }, []);

  useEffect(() => {
    // Load cache stats
    if (initialized) {
      loadCacheStats();
    }
  }, [initialized, currentCount]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const loadCacheStats = async () => {
    try {
      const stats = await ArticleCache.getCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    }
  };

  const handleCacheArticle = async () => {
    addTestResult('🔄 Attempting to cache article...');
    try {
      const success = await cacheResource(testArticle);
      if (success) {
        addTestResult('✅ Article cached successfully');
        loadCacheStats();
      } else {
        addTestResult('❌ Failed to cache article (limit reached or access denied)');
      }
    } catch (err) {
      addTestResult('❌ Error caching article: ' + (err as Error).message);
    }
  };

  const handleGetCachedArticle = async () => {
    addTestResult('🔄 Retrieving cached article...');
    try {
      const article = await ArticleCache.getArticle(testArticle.id);
      if (article) {
        addTestResult('✅ Retrieved cached article: ' + article.title);
      } else {
        addTestResult('❌ Article not found in cache');
      }
    } catch (err) {
      addTestResult('❌ Error retrieving article: ' + (err as Error).message);
    }
  };

  const handleClearCache = async () => {
    addTestResult('🔄 Clearing cache...');
    try {
      await clearCache();
      addTestResult('✅ Cache cleared');
      loadCacheStats();
    } catch (err) {
      addTestResult('❌ Error clearing cache: ' + (err as Error).message);
    }
  };

  const handleTestOffline = () => {
    if ('serviceWorker' in navigator) {
      addTestResult('✅ Service Worker supported');
      addTestResult(`📊 Service Worker status: ${navigator.serviceWorker.controller ? 'Active' : 'Not active'}`);
    } else {
      addTestResult('❌ Service Worker not supported');
    }
  };

  const handleTestStorageEstimate = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(2);
      addTestResult(`📊 Storage: ${usedMB} MB used of ${quotaMB} MB quota`);
    } else {
      addTestResult('❌ Storage estimate not supported');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Cache System Test Page</h1>
      
      {/* System Status */}
      <div className="bg-card p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">System Status</h2>
        <div className="space-y-2">
          <p>Cache Initialized: {initialized ? '✅ Yes' : '❌ No'}</p>
          <p>Offline Ready: {offlineReady ? '✅ Yes' : '❌ No'}</p>
          <p>User Type: <span className="font-semibold">{userType}</span></p>
          <p>Current Cached Articles: <span className="font-semibold">{currentCount} / {maxAllowed}</span></p>
          <p>Can Cache More: {canCache ? '✅ Yes' : '❌ No'}</p>
          {error && <p className="text-red-500">Error: {error}</p>}
        </div>
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="bg-card p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-3">Cache Statistics</h2>
          <div className="space-y-2">
            <p>Total Articles: {cacheStats.count}</p>
            <p>Total Size: {(cacheStats.totalSize / 1024).toFixed(2)} KB</p>
            <p>Oldest: {cacheStats.oldestArticle ? new Date(cacheStats.oldestArticle).toLocaleString() : 'N/A'}</p>
            <p>Newest: {cacheStats.newestArticle ? new Date(cacheStats.newestArticle).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="bg-card p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Test Controls</h2>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleCacheArticle}
            disabled={!initialized || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            Cache Test Article
          </button>
          
          <button 
            onClick={handleGetCachedArticle}
            disabled={!initialized || isLoading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50"
          >
            Get Cached Article
          </button>
          
          <button 
            onClick={handleClearCache}
            disabled={!initialized || isLoading}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50"
          >
            Clear Cache
          </button>
          
          <button 
            onClick={handleTestOffline}
            className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/90"
          >
            Test Service Worker
          </button>
          
          <button 
            onClick={handleTestStorageEstimate}
            className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/90"
          >
            Check Storage
          </button>
        </div>
      </div>

      {/* Test Results Log */}
      <div className="bg-card p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Test Results</h2>
        <div className="bg-background p-3 rounded max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-muted-foreground">No test results yet. Click the buttons above to start testing.</p>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-sm text-muted-foreground">
        <h3 className="font-semibold mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Cache Test Article" to cache an article</li>
          <li>Try caching multiple articles to test the limit enforcement</li>
          <li>Click "Get Cached Article" to verify retrieval works</li>
          <li>Open DevTools → Application → Service Workers to verify SW is active</li>
          <li>Go offline (DevTools → Network → Offline) and test cached content</li>
          <li>Test as different user types to verify limits work correctly</li>
        </ol>
      </div>
    </div>
  );
}