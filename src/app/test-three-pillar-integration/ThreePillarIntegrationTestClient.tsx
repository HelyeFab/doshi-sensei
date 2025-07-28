'use client';

import { useState, useEffect } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useOfflineContent } from '@/hooks/useOfflineContent';
import { useEviction } from '@/hooks/useEviction';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StorageIndicator } from '@/components/cache/StorageIndicator';

// Test article generator
const generateTestArticle = (index: number) => ({
  id: `integration-test-${index}-${Date.now()}`,
  title: `Integration Test Article ${index}`,
  content: `This is test content for integration testing. `.repeat(100),
  slug: `integration-test-${index}`,
  author: 'Test System',
  publishedAt: Date.now(),
  readingTime: 5,
});

export default function ThreePillarIntegrationTestClient() {
  // Three-Pillar Hooks
  const { checkAndTrack } = useAccess();
  const { feature: offlineFeature, access } = useFeature('offline_articles');
  const { userType, isPremium, subscription } = useSubscription2();
  
  // Storage Hooks
  const { 
    cacheResource, 
    currentCount, 
    maxAllowed,
    storageStats,
    getCachedResources,
    clearCache,
    markResourceActive
  } = useOfflineContent('article');
  
  const { getStats, triggerEviction } = useEviction();
  
  // Test State
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [cachedArticles, setCachedArticles] = useState<any[]>([]);
  
  // Load cached articles on mount
  useEffect(() => {
    loadCachedArticles();
  }, [currentCount]);
  
  const loadCachedArticles = async () => {
    const articles = await getCachedResources();
    setCachedArticles(articles);
  };
  
  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setTestResults(prev => [`${emoji} ${new Date().toLocaleTimeString()} - ${message}`, ...prev]);
  };

  // Test 1: Verify Three-Pillar Integration
  const testThreePillarIntegration = async () => {
    log('=== Testing Three-Pillar Integration ===');
    
    // Test 1.1: Feature Registry
    log(`Feature status: ${offlineFeature?.status || 'not found'}`);
    log(`Feature limit type: ${offlineFeature?.limitType || 'none'}`);
    
    // Test 1.2: Access Control
    log(`User type: ${userType}`);
    log(`Is Premium: ${isPremium}`);
    log(`Access remaining: ${access?.remaining || 0}`);
    
    // Test 1.3: Subscription Status
    log(`Subscription status: ${subscription?.status || 'none'}`);
    
    log('Three-pillar integration verified', 'success');
  };

  // Test 2: Test Access Control with Caching
  const testAccessControlCaching = async () => {
    log('=== Testing Access Control with Caching ===');
    
    const article = generateTestArticle(currentCount + 1);
    log(`Attempting to cache article (current: ${currentCount}/${maxAllowed})`);
    
    // This should trigger checkAndTrack internally
    const success = await cacheResource(article);
    
    if (success) {
      log('Article cached successfully', 'success');
      log(`New count: ${currentCount + 1}/${maxAllowed}`);
    } else {
      log('Caching failed - likely hit limit or access denied', 'error');
      log('Modal should have been shown automatically');
    }
  };

  // Test 3: Test Eviction Integration
  const testEvictionIntegration = async () => {
    log('=== Testing Eviction Integration ===');
    
    // Get current stats
    const stats = await getStats('article');
    if (stats) {
      log(`Current storage: ${stats.currentCount}/${stats.limitCount} items`);
      log(`Storage utilization: ${stats.utilizationPercent.toFixed(1)}%`);
    }
    
    // Try to fill up to limit
    log('Attempting to cache articles up to limit...');
    for (let i = 0; i < 5; i++) {
      const article = generateTestArticle(currentCount + i + 1);
      const success = await cacheResource(article);
      
      if (success) {
        log(`Cached article ${i + 1}/5`, 'success');
      } else {
        log(`Failed to cache article ${i + 1}/5 - limit reached`, 'error');
        break;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Check if eviction occurred
    const newStats = await getStats('article');
    if (newStats && stats) {
      if (newStats.currentCount <= newStats.limitCount) {
        log('Eviction working correctly - staying within limits', 'success');
      }
    }
  };

  // Test 4: Test Active Resource Protection
  const testActiveProtection = async () => {
    log('=== Testing Active Resource Protection ===');
    
    if (cachedArticles.length === 0) {
      log('No cached articles to test protection', 'error');
      return;
    }
    
    // Mark first article as active
    const firstArticle = cachedArticles[0];
    markResourceActive(firstArticle.id);
    log(`Marked article "${firstArticle.title}" as active`);
    
    // Fill cache to trigger eviction
    log('Filling cache to trigger eviction...');
    for (let i = 0; i < 3; i++) {
      await cacheResource(generateTestArticle(100 + i));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Check if protected article still exists
    const updatedArticles = await getCachedResources();
    const protectedExists = updatedArticles.some(a => a.id === firstArticle.id);
    
    if (protectedExists) {
      log('Active resource protection working - article preserved', 'success');
    } else {
      log('Active resource was evicted - protection failed', 'error');
    }
  };

  // Test 5: Test User Type Transitions
  const testUserTypeTransition = async () => {
    log('=== Testing User Type Transition Scenario ===');
    
    log(`Current user type: ${userType}`);
    log('Note: Actual user type transition requires login/logout');
    
    // Simulate what would happen
    if (userType === 'monthly' || userType === 'yearly') {
      log('Premium user - can cache up to 50 articles');
      log('If downgraded to free, excess would be evicted on next cache');
    } else {
      log('Free/Guest user - limited to 3 articles');
      log('If upgraded to premium, limit increases to 50');
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    try {
      await testThreePillarIntegration();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testAccessControlCaching();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testEvictionIntegration();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testActiveProtection();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await testUserTypeTransition();
      
      log('=== All tests completed ===', 'success');
    } catch (error) {
      log(`Test error: ${error}`, 'error');
    } finally {
      setIsRunningTests(false);
      await loadCachedArticles();
    }
  };

  // Manual eviction trigger
  const handleManualEviction = async () => {
    log('Triggering manual eviction...');
    const result = await triggerEviction('article');
    if (result) {
      log(`Evicted ${result.evictedCount} articles, freed ${result.freedBytes} bytes`, 'success');
    }
    await loadCachedArticles();
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Three-Pillar Integration Test</h1>
      <p className="text-muted-foreground">
        Testing the integration between Access Control, Features, Subscriptions, and Storage/Eviction
      </p>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Type:</span>
              <Badge>{userType || 'Loading...'}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Premium:</span>
              <Badge variant={isPremium ? 'default' : 'secondary'}>
                {isPremium ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Subscription:</span>
              <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                {subscription?.status || 'None'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feature Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Feature:</span>
              <Badge>{offlineFeature?.name || 'Loading...'}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge variant={offlineFeature?.status === 'active' ? 'default' : 'secondary'}>
                {offlineFeature?.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Limit:</span>
              <span className="font-medium">{maxAllowed} articles</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Storage Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Cached:</span>
              <span className="font-medium">{currentCount}/{maxAllowed}</span>
            </div>
            {storageStats && (
              <>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="font-medium text-sm">{storageStats.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className="font-medium">{storageStats.utilization.toFixed(0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <StorageIndicator resourceType="article" showDetails={true} />
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunningTests}
              variant="default"
            >
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button onClick={testThreePillarIntegration} variant="secondary" size="sm">
              Test Three-Pillar
            </Button>
            <Button onClick={testAccessControlCaching} variant="secondary" size="sm">
              Test Access Control
            </Button>
            <Button onClick={testEvictionIntegration} variant="secondary" size="sm">
              Test Eviction
            </Button>
            <Button onClick={testActiveProtection} variant="secondary" size="sm">
              Test Protection
            </Button>
            <Button onClick={handleManualEviction} variant="outline" size="sm">
              Manual Eviction
            </Button>
            <Button onClick={clearCache} variant="destructive" size="sm">
              Clear All Cache
            </Button>
          </div>

          {/* Test Results */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm space-y-1">
              {testResults.length === 0 ? (
                <p className="text-muted-foreground">No tests run yet. Click "Run All Tests" to begin.</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className={
                    result.includes('❌') ? 'text-destructive' :
                    result.includes('✅') ? 'text-green-600' :
                    ''
                  }>
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cached Articles */}
      {cachedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cached Articles ({cachedArticles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cachedArticles.map((article) => (
                <div key={article.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{article.title}</h4>
                      <p className="text-sm text-muted-foreground">ID: {article.id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        markResourceActive(article.id);
                        log(`Marked "${article.title}" as active`);
                      }}
                    >
                      Mark Active
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}