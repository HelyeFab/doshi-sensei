'use client';

import { useState } from 'react';
import { useOfflineContent } from '@/hooks/useOfflineContent';
import { StorageIndicator } from '@/components/cache/StorageIndicator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Test articles with different sizes
const generateTestArticle = (index: number, sizeKb: number = 100) => {
  const content = 'x'.repeat(sizeKb * 1024); // Generate content of specific size
  return {
    id: `test-article-${index}-${Date.now()}`,
    title: `Test Article ${index} (${sizeKb}KB)`,
    content: content,
    slug: `test-article-${index}`,
    author: 'Test Author',
    publishedAt: Date.now(),
    readingTime: Math.ceil(sizeKb / 10),
    images: [],
    tags: ['test', 'eviction'],
    version: '1.0'
  };
};

export default function TestEvictionPage() {
  const { 
    cacheResource, 
    currentCount, 
    maxAllowed, 
    userType,
    storageStats,
    clearCache,
    getCachedResources,
    markResourceActive,
    markResourceInactive
  } = useOfflineContent('article');

  const [cacheResults, setCacheResults] = useState<string[]>([]);
  const [cachedArticles, setCachedArticles] = useState<any[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  const addResult = (message: string) => {
    setCacheResults(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  const handleCacheSmallArticle = async () => {
    const article = generateTestArticle(currentCount + 1, 50); // 50KB
    addResult(`Attempting to cache small article: ${article.title}`);
    
    const success = await cacheResource(article);
    if (success) {
      addResult(`✅ Successfully cached: ${article.title}`);
      await loadCachedArticles();
    } else {
      addResult(`❌ Failed to cache article (likely hit limit)`);
    }
  };

  const handleCacheLargeArticle = async () => {
    const article = generateTestArticle(currentCount + 1, 500); // 500KB
    addResult(`Attempting to cache large article: ${article.title}`);
    
    const success = await cacheResource(article);
    if (success) {
      addResult(`✅ Successfully cached: ${article.title}`);
      await loadCachedArticles();
    } else {
      addResult(`❌ Failed to cache article (likely hit limit)`);
    }
  };

  const handleCacheMultiple = async () => {
    addResult('Attempting to cache 5 articles to trigger eviction...');
    
    for (let i = 0; i < 5; i++) {
      const article = generateTestArticle(currentCount + i + 1, 100);
      const success = await cacheResource(article);
      
      if (success) {
        addResult(`✅ Cached article ${i + 1}/5: ${article.title}`);
      } else {
        addResult(`❌ Failed to cache article ${i + 1}/5`);
      }
      
      // Small delay between caches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await loadCachedArticles();
  };

  const loadCachedArticles = async () => {
    const articles = await getCachedResources();
    setCachedArticles(articles);
  };

  const handleMarkActive = (articleId: string) => {
    if (activeArticleId) {
      markResourceInactive(activeArticleId);
    }
    markResourceActive(articleId);
    setActiveArticleId(articleId);
    addResult(`🔒 Marked article as active (protected from eviction): ${articleId}`);
  };

  const handleClearCache = async () => {
    await clearCache();
    setCachedArticles([]);
    addResult('🧹 Cleared all cached articles');
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">LRU Eviction Test</h1>
      
      {/* User Info */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-2">User Information</h2>
        <div className="space-y-1 text-sm">
          <p>User Type: <span className="font-medium">{userType}</span></p>
          <p>Current Count: <span className="font-medium">{currentCount}</span></p>
          <p>Max Allowed: <span className="font-medium">{maxAllowed}</span></p>
          {storageStats && (
            <>
              <p>Storage Used: <span className="font-medium">{storageStats.size}</span></p>
              <p>Utilization: <span className="font-medium">{storageStats.utilization.toFixed(0)}%</span></p>
            </>
          )}
        </div>
      </Card>

      {/* Storage Indicator */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Storage Status</h2>
        <StorageIndicator resourceType="article" showDetails={true} />
      </Card>

      {/* Test Actions */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCacheSmallArticle} size="sm">
            Cache Small Article (50KB)
          </Button>
          <Button onClick={handleCacheLargeArticle} size="sm" variant="secondary">
            Cache Large Article (500KB)
          </Button>
          <Button onClick={handleCacheMultiple} size="sm" variant="secondary">
            Cache 5 Articles (Trigger Eviction)
          </Button>
          <Button onClick={loadCachedArticles} size="sm" variant="outline">
            Load Cached Articles
          </Button>
          <Button onClick={handleClearCache} size="sm" variant="destructive">
            Clear All Cache
          </Button>
        </div>
      </Card>

      {/* Cached Articles */}
      {cachedArticles.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Cached Articles</h2>
          <div className="space-y-2">
            {cachedArticles.map((article) => (
              <div 
                key={article.id} 
                className={`p-3 border rounded-lg ${
                  activeArticleId === article.id ? 'border-green-500 bg-green-50' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {article.id}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={activeArticleId === article.id ? "default" : "outline"}
                    onClick={() => handleMarkActive(article.id)}
                  >
                    {activeArticleId === article.id ? '🔒 Protected' : 'Mark Active'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results Log */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Test Results</h2>
        <div className="space-y-1 font-mono text-sm max-h-64 overflow-y-auto">
          {cacheResults.length === 0 ? (
            <p className="text-muted-foreground">No test results yet. Try caching some articles!</p>
          ) : (
            cacheResults.map((result, index) => (
              <div key={index} className="py-1">
                {result}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 bg-muted">
        <h2 className="text-xl font-semibold mb-2">How to Test Eviction</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Start by caching a few articles to see the storage limits</li>
          <li>Once you reach the limit (3 for free users), new articles will trigger eviction</li>
          <li>Mark an article as "active" to protect it from eviction</li>
          <li>Try caching large articles to trigger size-based eviction</li>
          <li>Watch the storage indicator to see utilization changes</li>
          <li>Check the console for detailed eviction logs</li>
        </ol>
      </Card>
    </div>
  );
}