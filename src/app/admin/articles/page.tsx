'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ArticleManagement } from '@/components/admin/ArticleManagement';
import { ArticleCleanup } from '@/components/admin/ArticleCleanup';
import { useStrings } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { getArticleStats, clearCache } from '@/utils/watanocArticles';
import {
  triggerWatanocScraping,
  triggerTodaiiScraping,
  triggerNHKEasyScraping,
  triggerNHKNewsScraping,
  triggerYahooNewsScraping,
  triggerMainichiShogakuseiScraping,
  triggerMainichiNewsScraping,
  triggerAllSourcesScraping,
  NEWS_SOURCES,
  formatScrapingResult
} from '@/utils/newsSources';

export const dynamic = 'force-dynamic';

export default function ArticlesManagementPage() {
  const strings = useStrings();
  const router = useRouter();
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

  const handleNHKEasyScraping = async () => {
    setLoading(true);
    setStatus('📺 Scraping NHK Easy Japanese News...');

    try {
      const result = await triggerNHKEasyScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.nhkEasy));

      if (result.success) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNHKNewsScraping = async () => {
    setLoading(true);
    setStatus('📰 Scraping NHK Regular News...');

    try {
      const result = await triggerNHKNewsScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.nhkNews));

      if (result.success) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleYahooNewsScraping = async () => {
    setLoading(true);
    setStatus('🌸 Scraping Yahoo News Japan...');

    try {
      const result = await triggerYahooNewsScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.yahooNews));

      if (result.success) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMainichiShogakuseiScraping = async () => {
    setLoading(true);
    setStatus('🎒 Scraping Mainichi Elementary News...');

    try {
      const result = await triggerMainichiShogakuseiScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.mainichiShogakusei));

      if (result.success) {
        setTimeout(loadStats, 2000);
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMainichiNewsScraping = async () => {
    setLoading(true);
    setStatus('📰 Scraping Mainichi Shimbun...');

    try {
      const result = await triggerMainichiNewsScraping();
      setStatus(formatScrapingResult(result, NEWS_SOURCES.mainichiNews));

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
        formatScrapingResult(results.nhkNews, NEWS_SOURCES.nhkNews),
        formatScrapingResult(results.yahooNews, NEWS_SOURCES.yahooNews),
        formatScrapingResult(results.mainichiShogakusei, NEWS_SOURCES.mainichiShogakusei),
        formatScrapingResult(results.mainichiNews, NEWS_SOURCES.mainichiNews),
        `\n🎉 Overall: ${overall.totalArticles} total articles from ${overall.successfulSources}/7 sources (${overall.totalTimeElapsed}s)`
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
    <AdminLayout title={strings.admin.articlesManagement}>

      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">{strings.admin.articleScraping}</h2>

          {/* Primary scraping actions */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">{strings.admin.newsSources}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                onClick={handleNHKEasyScraping}
                disabled={loading}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.nhkEasy.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.nhkEasy.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.nhkEasy.description}</div>
                </div>
              </button>

              <button
                onClick={handleNHKNewsScraping}
                disabled={loading}
                className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.nhkNews.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.nhkNews.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.nhkNews.description}</div>
                </div>
              </button>

              <button
                onClick={handleYahooNewsScraping}
                disabled={loading}
                className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.yahooNews.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.yahooNews.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.yahooNews.description}</div>
                </div>
              </button>

              <button
                onClick={handleMainichiShogakuseiScraping}
                disabled={loading}
                className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.mainichiShogakusei.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.mainichiShogakusei.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.mainichiShogakusei.description}</div>
                </div>
              </button>

              <button
                onClick={handleMainichiNewsScraping}
                disabled={loading}
                className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="text-lg">{NEWS_SOURCES.mainichiNews.emoji}</span>
                <div className="text-left">
                  <div className="font-medium">{NEWS_SOURCES.mainichiNews.name}</div>
                  <div className="text-xs opacity-90">{NEWS_SOURCES.mainichiNews.description}</div>
                </div>
              </button>

              <button
                onClick={handleAllSourcesScraping}
                disabled={loading}
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 sm:col-span-2 lg:col-span-1"
              >
                <span className="text-lg">🚀</span>
                <div className="text-left">
                  <div className="font-medium">{strings.admin.allSources}</div>
                  <div className="text-xs opacity-90">{strings.admin.allSourcesDescription}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-medium mb-3">{strings.admin.management}</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={loadStats}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
              >
                {strings.admin.refreshStats}
              </button>

              <button
                onClick={handleClearCache}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
              >
                {strings.admin.clearCache}
              </button>

              <button
                onClick={() => handleDeleteTestArticles('batch')}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {strings.admin.deleteAllTestArticles}
              </button>

              <button
                onClick={handleDiagnosticTest}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {strings.admin.runDiagnostics}
              </button>
            </div>
          </div>

          {loading && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">{strings.admin.processing}</span>
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
            <h2 className="text-xl font-semibold mb-4">{strings.admin.articleStatistics}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Articles */}
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium text-muted-foreground mb-2">{strings.admin.totalArticles}</h3>
                <p className="text-2xl font-bold">{stats.totalArticles}</p>
              </div>

              {/* By JLPT Level */}
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-medium text-muted-foreground mb-2">{strings.admin.byJlptLevel}</h3>
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
                <h3 className="font-medium text-muted-foreground mb-2">{strings.admin.byCategory}</h3>
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
                  <h3 className="font-medium text-muted-foreground mb-2">{strings.admin.bySource}</h3>
                  <div className="space-y-1">
                    {Object.entries(stats.articlesBySource).map(([source, count]) => (
                      <div key={source} className="flex justify-between">
                        <span className="capitalize">
                          {source === 'watanoc' ? '🏯 Watanoc' :
                            source === 'todaii' ? '📚 Todaii' :
                            source === 'nhk-easy' ? '📺 NHK Easy' :
                            source === 'nhk-news' ? '📰 NHK News' :
                            source === 'yahoo-news' ? '🌸 Yahoo News' :
                            source === 'mainichi-shogakusei' ? '🎒 Mainichi' :
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
              {strings.admin.lastUpdated}: {new Date(stats.lastUpdated).toLocaleString()}
            </div>
          </div>
        )}

        {/* Article Management */}
        <ArticleManagement onRefresh={loadStats} />

        {/* Article Cleanup */}
        <ArticleCleanup onRefresh={loadStats} />

        {/* Instructions */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-xl font-semibold mb-4">{strings.admin.scrapingGuide}</h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-foreground mb-2">{strings.admin.contentSources}</h3>
              <div className="space-y-2 pl-4">
                <p>
                  <strong>📚 Todaii News:</strong> {strings.admin.todaiiNewsDescription}
                </p>
                <p>
                  <strong>🏯 Watanoc Only:</strong> {strings.admin.watanocOnlyDescription}
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
