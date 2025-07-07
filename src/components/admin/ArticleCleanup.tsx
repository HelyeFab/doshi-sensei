'use client';

import React, { useState, useEffect } from 'react';
import { NewsArticle } from '@/types/news';
import { 
  findTestArticles, 
  deleteTestArticles, 
  getTestArticleStats,
  findDuplicateArticles,
  TEST_PATTERNS 
} from '@/utils/articleCleanup';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

interface ArticleCleanupProps {
  onRefresh?: () => void;
}

export function ArticleCleanup({ onRefresh }: ArticleCleanupProps) {
  const [testArticles, setTestArticles] = useState<NewsArticle[]>([]);
  const [duplicates, setDuplicates] = useState<Array<{
    title: string;
    source: string;
    articles: NewsArticle[];
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [showTestPatterns, setShowTestPatterns] = useState(false);
  
  // Modal states
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteDuplicatesModal, setShowDeleteDuplicatesModal] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<typeof duplicates[0] | null>(null);

  // Load test articles and stats
  const loadTestArticles = async () => {
    try {
      setLoading(true);
      setStatus('🔍 Searching for test articles...');
      
      const [articles, articleStats, duplicateList] = await Promise.all([
        findTestArticles(),
        getTestArticleStats(),
        findDuplicateArticles()
      ]);
      
      setTestArticles(articles);
      setStats(articleStats);
      setDuplicates(duplicateList);
      
      if (articles.length === 0) {
        setStatus('✅ No test articles found!');
      } else {
        setStatus(`Found ${articles.length} test articles and ${duplicateList.length} duplicate groups`);
      }
    } catch (error) {
      setStatus('❌ Failed to load test articles');
      console.error('Failed to load test articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestArticles();
  }, []);

  // Delete all test articles
  const handleDeleteTestArticles = async () => {
    if (testArticles.length === 0) return;

    try {
      setDeleteLoading(true);
      setStatus('🗑️ Deleting test articles...');
      
      const articleIds = testArticles.map(a => a.id);
      const result = await deleteTestArticles(articleIds);
      
      if (result.success) {
        setStatus(`✅ Successfully deleted ${result.deletedCount} test articles!`);
        setTestArticles([]);
        onRefresh?.();
        
        // Reload stats
        const newStats = await getTestArticleStats();
        setStats(newStats);
      } else {
        setStatus(`❌ Failed to delete test articles: ${result.error}`);
      }
    } catch (error) {
      setStatus('❌ Unexpected error during deletion');
      console.error('Error deleting test articles:', error);
    } finally {
      setDeleteLoading(false);
      setShowDeleteAllModal(false);
    }
  };

  // Delete specific test article
  const handleDeleteSingle = async (articleId: string) => {
    try {
      setDeleteLoading(true);
      const result = await deleteTestArticles([articleId]);
      
      if (result.success) {
        setTestArticles(prev => prev.filter(a => a.id !== articleId));
        setStatus('✅ Article deleted successfully');
        onRefresh?.();
      } else {
        setStatus(`❌ Failed to delete article: ${result.error}`);
      }
    } catch (error) {
      setStatus('❌ Unexpected error during deletion');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Delete duplicate articles (keep the newest one)
  const handleDeleteDuplicates = async () => {
    if (!selectedDuplicateGroup) return;

    try {
      setDeleteLoading(true);
      // Keep the first one (newest), delete the rest
      const toDelete = selectedDuplicateGroup.articles.slice(1).map(a => a.id);
      const result = await deleteTestArticles(toDelete);
      
      if (result.success) {
        setStatus(`✅ Deleted ${result.deletedCount} duplicate articles`);
        // Reload data
        await loadTestArticles();
        onRefresh?.();
      } else {
        setStatus(`❌ Failed to delete duplicates: ${result.error}`);
      }
    } catch (error) {
      setStatus('❌ Error deleting duplicates');
    } finally {
      setDeleteLoading(false);
      setShowDeleteDuplicatesModal(false);
      setSelectedDuplicateGroup(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Test Article Cleanup */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Test Article Cleanup</h2>
          <button
            onClick={loadTestArticles}
            disabled={loading}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90 disabled:opacity-50"
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="bg-muted rounded-lg p-4 mb-4">
            <h3 className="font-medium mb-2">Test Article Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Test Articles:</span>
                <span className="ml-2 font-medium">{stats.totalTestArticles}</span>
              </div>
              {stats.oldestDate && (
                <div>
                  <span className="text-muted-foreground">Date Range:</span>
                  <span className="ml-2 font-medium">
                    {formatDate(stats.oldestDate)} - {formatDate(stats.newestDate)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">By Category:</span>
                <span className="ml-2 font-medium">
                  {Object.entries(stats.byCategory).map(([cat, count]) => 
                    `${cat} (${count})`
                  ).join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Test Patterns Info */}
        <div className="mb-4">
          <button
            onClick={() => setShowTestPatterns(!showTestPatterns)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showTestPatterns ? '▼' : '▶'} View test patterns
          </button>
          
          {showTestPatterns && (
            <div className="mt-2 p-3 bg-muted rounded text-sm space-y-2">
              <div>
                <strong>Title patterns:</strong> {TEST_PATTERNS.titles.join(', ')}
              </div>
              <div>
                <strong>Categories:</strong> {TEST_PATTERNS.categories.join(', ')}
              </div>
              <div>
                <strong>Tags:</strong> {TEST_PATTERNS.tags.join(', ')}
              </div>
              <div>
                <strong>Content patterns:</strong> {TEST_PATTERNS.contentPatterns.join(', ')}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          {testArticles.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={deleteLoading}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50"
            >
              🗑️ Delete All Test Articles ({testArticles.length})
            </button>
          )}
        </div>

        {/* Status message */}
        {status && (
          <div className="p-3 bg-muted rounded-lg mb-4">
            <p className="text-sm">{status}</p>
          </div>
        )}

        {/* Test articles list */}
        {testArticles.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground mb-2">
              Test Articles Found:
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {testArticles.map((article) => (
                <div key={article.id} className="flex items-start justify-between p-3 bg-muted rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.source?.displayName || article.source?.name || 'Unknown'} • 
                      {article.category} • 
                      {formatDate(article.scrapedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSingle(article.id)}
                    disabled={deleteLoading}
                    className="ml-2 text-destructive hover:text-destructive/80 disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Articles */}
      {duplicates.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Duplicate Articles</h2>
          
          <div className="space-y-4">
            {duplicates.map((group, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{group.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Source: {group.source} • {group.articles.length} copies
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDuplicateGroup(group);
                      setShowDeleteDuplicatesModal(true);
                    }}
                    disabled={deleteLoading}
                    className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 disabled:opacity-50"
                  >
                    Delete Older Copies
                  </button>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  {group.articles.map((article, i) => (
                    <div key={article.id}>
                      {i === 0 ? '✓ Keep:' : '× Delete:'} {formatDate(article.scrapedAt)} - ID: {article.id}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationDialog
        isOpen={showDeleteAllModal}
        title="Delete All Test Articles"
        message={`Are you sure you want to delete ALL ${testArticles.length} test articles? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteTestArticles}
        onCancel={() => setShowDeleteAllModal(false)}
        loading={deleteLoading}
      />

      <ConfirmationDialog
        isOpen={showDeleteDuplicatesModal}
        title="Delete Duplicate Articles"
        message={
          selectedDuplicateGroup
            ? `Delete ${selectedDuplicateGroup.articles.length - 1} older duplicates of "${selectedDuplicateGroup.title}"? The newest one will be kept.`
            : ''
        }
        confirmText="Delete Duplicates"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteDuplicates}
        onCancel={() => {
          setShowDeleteDuplicatesModal(false);
          setSelectedDuplicateGroup(null);
        }}
        loading={deleteLoading}
      />
    </div>
  );
}