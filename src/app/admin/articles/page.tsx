'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ArticleManagement } from '@/components/admin/ArticleManagement';
import { ArticleCleanup } from '@/components/admin/ArticleCleanup';
import { getArticleStats, clearCache } from '@/utils/watanocArticles';
import { 
  triggerWatanocScraping, 
  triggerTodaiiScraping, 
  triggerAllSourcesScraping,
  NEWS_SOURCES,
  formatScrapingResult
} from '@/utils/newsSources';

export const dynamic = 'force-dynamic';

export default function ArticlesManagementPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  const handleWatanocScraping = async () => {
    setLoading(true);
    setStatus('🚀 Triggering Watanoc scraping...');
    
    try {
      const result = await triggerWatanocScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.watanoc));
      
      if (result.success) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTodaiiScraping = async () => {
    setLoading(true);
    setStatus('📚 Scraping Todaii Japanese News...');
    
    try {
      const result = await triggerTodaiiScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.todaii));
      
      if (result.success) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };


  const handleAllSourcesScraping = async () => {
    setLoading(true);
    setStatus('🚀 Starting all sources scraping...');
    
    try {
      const results = await triggerAllSourcesScraping();
      const { overall } = results;
      
      // Build detailed status message
      const statusMessages = [
        formatScrapingResult(results.watanoc, NEWS_SOURCES.watanoc),
        formatScrapingResult(results.todaii, NEWS_SOURCES.todaii),
        formatScrapingResult(results.nhkEasy, NEWS_SOURCES.nhkEasy),
        `\n🎉 Overall: ${overall.totalArticles} total articles from ${overall.successfulSources}/3 sources (${overall.totalTimeElapsed}s)`
      ];
      
      setStatus(statusMessages.join('\n'));
      
      if (overall.successfulSources > 0) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const handleDeleteTestArticles = async (mode: 'batch' | 'individual' = 'batch', articleIds?: string[]) => {
    setLoading(true);
    setStatus(`🗑️ Deleting test articles (${mode} mode)...`);
    
    try {
      const response = await fetch('/.netlify/functions/delete-test-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, articleIds })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus(`✅ ${result.message}`);
        setTimeout(loadStats, 1000);
      } else {
        setStatus(`❌ Error: ${result.error || 'Failed to delete test articles'}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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
            <h3 className="text-lg font-medium mb-3">News Sources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleWatanocScraping}
                disabled={loading}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.watanoc.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.watanoc.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.watanoc.description}</div>
                </div>
              </button>
              
              <button
                onClick={handleTodaiiScraping}
                disabled={loading}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.todaii.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.todaii.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.todaii.description}</div>
                </div>
              </button>
              
              <button
                onClick={handleAllSourcesScraping}
                disabled={loading}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">🚀</span>
                <div className="text-left">
                  <div className="font-medium">All Sources</div>
                  <div className="text-xs opacity-90">Scrape all sources</div>
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
                onClick={() => handleDeleteTestArticles('batch')}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🗑️ Delete All Test Articles
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
                          {source === 'watanoc' ? '🏯 Watanoc' : 
                           source === 'todaii' ? '📚 Todaii' :
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

        {/* Article Cleanup */}
        <ArticleCleanup onRefresh={loadStats} />

        {/* Instructions */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">Scraping Guide</h2>
          
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-foreground mb-2">Content Sources</h3>
              <div className="space-y-2 pl-4">
                <p>
                  <strong>📚 Todaii News:</strong> Scrapes JLPT-level categorized news from Todaii Japanese News platform. Designed specifically for Japanese learners with proper difficulty levels.
                </p>
                <p>
                  <strong>🏯 Watanoc Only:</strong> Creates realistic Japanese learning articles with educational content. Currently the most reliable content source.
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
                <strong>💡 Pro Tip:</strong> Use "Todaii News" for JLPT-categorized content or "Watanoc Only" for reliable educational articles. Both sources provide quality Japanese learning content.
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