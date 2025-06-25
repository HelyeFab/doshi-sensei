'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ArticleManagement } from '@/components/admin/ArticleManagement';
import { triggerArticleScraping, getArticleStats, clearCache } from '@/utils/watanocArticles';

export default function ArticlesManagementPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  const handleTriggerScraping = async () => {
    setLoading(true);
    setStatus('🚀 Triggering article scraping...');
    console.log('🔍 DEBUG: Calling scrape-watanoc-real via triggerArticleScraping');
    
    try {
      const result = await triggerArticleScraping();
      console.log('📊 DEBUG: Watanoc scraping result:', result);
      
      if (result.success) {
        setStatus(`✅ Successfully scraped ${result.articlesScraped} articles`);
        console.log('✅ DEBUG: Watanoc scraping successful, articles:', result.articlesScraped);
        // Refresh stats after scraping
        setTimeout(loadStats, 2000);
      } else {
        setStatus(`❌ Scraping failed: ${result.errors[0]?.message || 'Unknown error'}`);
        console.error('❌ DEBUG: Watanoc scraping failed:', result.errors);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('💥 DEBUG: Watanoc scraping error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNHKScraping = async () => {
    setLoading(true);
    setStatus('📰 Scraping NHK Easy News...');
    console.log('🔍 DEBUG: Calling scrape-nhk-easy-news');
    
    try {
      const response = await fetch('/.netlify/functions/scrape-nhk-easy-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      console.log('📊 DEBUG: NHK Easy scraping response:', result);
      
      if (result.success) {
        setStatus(`✅ NHK Easy: Successfully scraped ${result.articlesCount} articles`);
        console.log('✅ DEBUG: NHK Easy successful, articles:', result.articlesCount);
        setTimeout(loadStats, 2000);
      } else {
        setStatus(`❌ NHK Easy failed: ${result.error || 'Unknown error'}`);
        console.error('❌ DEBUG: NHK Easy failed:', result);
      }
    } catch (error) {
      setStatus(`❌ NHK Easy error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('💥 DEBUG: NHK Easy error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiSourceScraping = async () => {
    setLoading(true);
    setStatus('🌐 Scraping from multiple sources...');
    console.log('🔍 DEBUG: Calling scrape-multi-source');
    
    try {
      const response = await fetch('/.netlify/functions/scrape-multi-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      console.log('📊 DEBUG: Multi-source scraping response:', result);
      
      if (result.success) {
        const breakdown = result.sources;
        setStatus(`✅ Multi-source: ${result.articlesCount} articles (NHK: ${breakdown.nhkEasy}, Watanoc: ${breakdown.watanoc}, Fallback: ${breakdown.fallback})`);
        console.log('✅ DEBUG: Multi-source successful, breakdown:', breakdown);
        setTimeout(loadStats, 2000);
      } else {
        setStatus(`❌ Multi-source failed: ${result.error || 'Unknown error'}`);
        console.error('❌ DEBUG: Multi-source failed:', result);
      }
    } catch (error) {
      setStatus(`❌ Multi-source error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('💥 DEBUG: Multi-source error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnosticTest = async () => {
    setLoading(true);
    setStatus('🔍 Running diagnostic tests...');
    
    try {
      const response = await fetch('/.netlify/functions/scrape-watanoc-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const passedTests = result.results.tests.filter((t: any) => t.success).length;
        const totalTests = result.results.tests.length;
        setStatus(`🔍 Diagnostic: ${passedTests}/${totalTests} tests passed`);
      } else {
        setStatus(`❌ Diagnostic failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`❌ Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const articleStats = await getArticleStats();
      setStats(articleStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleClearCache = () => {
    clearCache();
    setStatus('🗑️ Cache cleared');
  };

  // Load stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  return (
    <AdminLayout title="Articles Management">
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Article Scraping</h2>
          
          {/* Primary scraping actions */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Content Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={handleMultiSourceScraping}
                disabled={loading}
                className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">🌐</span>
                <div className="text-left">
                  <div className="font-medium">Multi-Source</div>
                  <div className="text-xs opacity-90">NHK + Watanoc + Fallback</div>
                </div>
              </button>
              
              <button
                onClick={handleNHKScraping}
                disabled={loading}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">📰</span>
                <div className="text-left">
                  <div className="font-medium">NHK Easy News</div>
                  <div className="text-xs opacity-90">Learner-friendly content</div>
                </div>
              </button>
              
              <button
                onClick={handleTriggerScraping}
                disabled={loading}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">🏯</span>
                <div className="text-left">
                  <div className="font-medium">Watanoc Only</div>
                  <div className="text-xs opacity-90">Original scraper</div>
                </div>
              </button>
            </div>
          </div>
          
          {/* Secondary actions */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-medium mb-3">Management</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={loadStats}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
              >
                📊 Refresh Stats
              </button>
              
              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
              >
                🗑️ Clear Cache
              </button>
              
              <button
                onClick={handleDiagnosticTest}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔍 Run Diagnostics
              </button>
            </div>
          </div>
          
          {loading && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">Processing...</span>
              </div>
            </div>
          )}
          
          {status && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">{status}</p>
            </div>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4">Article Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Articles */}
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium text-muted-foreground mb-2">Total Articles</h3>
                <p className="text-2xl font-bold">{stats.totalArticles}</p>
              </div>

              {/* By JLPT Level */}
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium text-muted-foreground mb-2">By JLPT Level</h3>
                <div className="space-y-1">
                  {Object.entries(stats.articlesByLevel).map(([level, count]) => (
                    <div key={level} className="flex justify-between">
                      <span>{level}:</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Category */}
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium text-muted-foreground mb-2">By Category</h3>
                <div className="space-y-1">
                  {Object.entries(stats.articlesByCategory).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="capitalize">{category}:</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Source (if available) */}
              {stats.articlesBySource && (
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-medium text-muted-foreground mb-2">By Source</h3>
                  <div className="space-y-1">
                    {Object.entries(stats.articlesBySource).map(([source, count]) => (
                      <div key={source} className="flex justify-between">
                        <span className="capitalize">
                          {source === 'nhk-easy' ? '📰 NHK Easy' : 
                           source === 'watanoc' ? '🏯 Watanoc' : 
                           source === 'fallback' ? '🔄 Fallback' : source}:
                        </span>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Last updated: {new Date(stats.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}

        {/* Article Management */}
        <ArticleManagement onRefresh={loadStats} />

        {/* Instructions */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Scraping Guide</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-foreground mb-2">Content Sources</h3>
              <div className="space-y-2 pl-4">
                <p>
                  <strong>🌐 Multi-Source (Recommended):</strong> Tries NHK Easy News first, then Watanoc, with intelligent fallbacks for maximum success rate.
                </p>
                <p>
                  <strong>📰 NHK Easy News:</strong> Scrapes learner-friendly Japanese news from NHK's educational platform. Most reliable source.
                </p>
                <p>
                  <strong>🏯 Watanoc Only:</strong> Original scraper targeting Watanoc.com specifically. May be less reliable.
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-foreground mb-2">Management Tools</h3>
              <div className="space-y-2 pl-4">
                <p>
                  <strong>📊 Refresh Stats:</strong> Reloads article statistics from Firebase.
                </p>
                <p>
                  <strong>🗑️ Clear Cache:</strong> Clears the local article cache to force fresh data on next load.
                </p>
                <p>
                  <strong>🔍 Run Diagnostics:</strong> Tests network connectivity and scraping capabilities for troubleshooting.
                </p>
                <p>
                  <strong>🗑️ Delete Articles:</strong> Remove individual articles or perform bulk deletions. Statistics are automatically updated.
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>💡 Pro Tip:</strong> Use "Multi-Source" for the best results. It combines multiple Japanese learning content sources with smart fallbacks to ensure you always get articles.
              </p>
            </div>
            
            <p className="text-muted-foreground">
              Articles are stored in Firebase Firestore and displayed on the /reading page. 
              The system automatically handles Japanese text processing, JLPT level estimation, and vocabulary extraction.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}