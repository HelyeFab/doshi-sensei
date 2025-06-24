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
    
    try {
      const result = await triggerArticleScraping();
      
      if (result.success) {
        setStatus(`✅ Successfully scraped ${result.articlesScraped} articles`);
        // Refresh stats after scraping
        setTimeout(loadStats, 2000);
      } else {
        setStatus(`❌ Scraping failed: ${result.errors[0]?.message || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <h2 className="text-xl font-semibold mb-4">Article Management</h2>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleTriggerScraping}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Scraping...' : '🔄 Trigger Scraping'}
            </button>
            
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
          </div>
          
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
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          
          <div className="space-y-3 text-sm">
            <p>
              <strong>🔄 Trigger Scraping:</strong> Manually runs the Netlify function to scrape new articles from Watanoc.
            </p>
            <p>
              <strong>📊 Refresh Stats:</strong> Reloads article statistics from Firebase.
            </p>
            <p>
              <strong>🗑️ Clear Cache:</strong> Clears the local article cache to force fresh data on next load.
            </p>
            <p>
              <strong>🗑️ Delete Articles:</strong> Remove individual articles or perform bulk deletions. Statistics are automatically updated.
            </p>
            <p className="text-muted-foreground">
              The scraping function runs automatically daily at 6 AM UTC (3 PM JST). 
              Articles are stored in Firebase Firestore and displayed on the /news page.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}