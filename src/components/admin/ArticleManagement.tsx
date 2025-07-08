'use client';

import React, { useState, useEffect } from 'react';
import { NewsArticle } from '@/types/news';
import { getWatanocArticles, deleteArticle, deleteArticles, deleteAllArticles } from '@/utils/watanocArticles';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ArticleManagementProps {
  onRefresh?: () => void;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive,
  onConfirm,
  onCancel,
  loading
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {loading ? '⏳ Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ArticleEditModalProps {
  isOpen: boolean;
  article: NewsArticle | null;
  onClose: () => void;
  onSave: (updatedArticle: NewsArticle) => void;
  loading: boolean;
}

function ArticleEditModal({ isOpen, article, onClose, onSave, loading }: ArticleEditModalProps) {
  const [editedArticle, setEditedArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    if (article) {
      setEditedArticle({ ...article });
    }
  }, [article]);

  if (!isOpen || !editedArticle) return null;

  const handleSave = () => {
    onSave(editedArticle);
  };

  const handleFieldChange = (field: keyof NewsArticle, value: any) => {
    setEditedArticle(prev => prev ? { ...prev, [field]: value } : null);
  };

  const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const categories = ['general', 'politics', 'economics', 'society', 'international', 'sports', 'culture', 'technology', 'weather', 'disaster'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-foreground">Edit Article</h3>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
              <input
                type="text"
                value={editedArticle.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                disabled={loading}
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Summary</label>
              <textarea
                value={editedArticle.summary || ''}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                disabled={loading}
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Content</label>
              <textarea
                value={editedArticle.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground font-mono text-sm"
                disabled={loading}
              />
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* JLPT Level */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">JLPT Level</label>
                <select
                  value={editedArticle.difficulty}
                  onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  disabled={loading}
                >
                  {jlptLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={editedArticle.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  disabled={loading}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reading Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Reading Time (min)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={editedArticle.estimatedReadingTime}
                  onChange={(e) => handleFieldChange('estimatedReadingTime', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                  disabled={loading}
                />
              </div>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Source URL</label>
              <input
                type="url"
                value={editedArticle.url}
                onChange={(e) => handleFieldChange('url', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                disabled={loading}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={editedArticle.tags?.join(', ') || ''}
                onChange={(e) => handleFieldChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                disabled={loading}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-border">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ 
  article, 
  isSelected, 
  onSelect, 
  onDelete,
  onEdit
}: { 
  article: NewsArticle; 
  isSelected: boolean; 
  onSelect: (checked: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      N5: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      N4: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      N3: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      N2: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      N1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[difficulty as keyof typeof colors] || colors.N3;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1 w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
        />

        {/* Article content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
              {article.title}
            </h3>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={onEdit}
                className="text-primary hover:text-primary/80 p-1 rounded hover:bg-primary/10 transition-colors"
                title="Edit article"
              >
                ✏️
              </button>
              <button
                onClick={onDelete}
                className="text-destructive hover:text-destructive/80 p-1 rounded hover:bg-destructive/10 transition-colors"
                title="Delete article"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Article metadata */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(article.difficulty)}`}>
              {article.difficulty}
            </span>
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
              {article.category}
            </span>
            <span className="text-xs text-muted-foreground">
              📖 {article.estimatedReadingTime}min
            </span>
            <span className="text-xs text-muted-foreground">
              📅 {formatDate(article.publishDate)}
            </span>
          </div>

          {/* Article summary */}
          {article.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {article.summary}
            </p>
          )}

          {/* Article stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>🔤 {article.vocabulary?.length || 0} vocab</span>
            <span>漢 {article.kanji?.length || 0} kanji</span>
            <span>🏷️ {article.tags?.length || 0} tags</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArticleManagement({ onRefresh }: ArticleManagementProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    article: NewsArticle | null;
  }>({
    isOpen: false,
    article: null
  });
  const [editLoading, setEditLoading] = useState(false);

  // Load articles
  const loadArticles = async () => {
    try {
      setLoading(true);
      const fetchedArticles = await getWatanocArticles(true);
      setArticles(fetchedArticles);
    } catch (error) {
      setStatus('❌ Failed to load articles');
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  // Filter articles
  const filteredArticles = articles.filter(article => {
    if (filterLevel !== 'all' && article.difficulty !== filterLevel) return false;
    if (filterCategory !== 'all' && article.category !== filterCategory) return false;
    return true;
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedArticles(new Set(filteredArticles.map(a => a.id)));
    } else {
      setSelectedArticles(new Set());
    }
  };

  const handleSelectArticle = (articleId: string, checked: boolean) => {
    const newSelected = new Set(selectedArticles);
    if (checked) {
      newSelected.add(articleId);
    } else {
      newSelected.delete(articleId);
    }
    setSelectedArticles(newSelected);
  };

  // Delete handlers
  const handleDeleteSingle = async (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Article',
      message: `Are you sure you want to delete "${article.title}"? This action cannot be undone.`,
      action: async () => {
        try {
          setDeleteLoading(true);
          const result = await deleteArticle(articleId);
          
          if (result.success) {
            setStatus('✅ Article deleted successfully');
            await loadArticles();
            onRefresh?.();
          } else {
            setStatus(`❌ Failed to delete article: ${result.error}`);
          }
        } catch (error) {
          setStatus('❌ Unexpected error during deletion');
        } finally {
          setDeleteLoading(false);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    const selectedIds = Array.from(selectedArticles);
    if (selectedIds.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Selected Articles',
      message: `Are you sure you want to delete ${selectedIds.length} selected articles? This action cannot be undone.`,
      action: async () => {
        try {
          setDeleteLoading(true);
          const result = await deleteArticles(selectedIds);
          
          if (result.success) {
            setStatus(`✅ Successfully deleted ${result.deletedCount} articles`);
            setSelectedArticles(new Set());
            await loadArticles();
            onRefresh?.();
          } else {
            setStatus(`⚠️ Deleted ${result.deletedCount} articles, ${result.failedCount} failed`);
          }
        } catch (error) {
          setStatus('❌ Unexpected error during bulk deletion');
        } finally {
          setDeleteLoading(false);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  const handleDeleteAll = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete All Articles',
      message: `Are you sure you want to delete ALL ${articles.length} articles? This action cannot be undone and will remove all scraped content.`,
      action: async () => {
        try {
          setDeleteLoading(true);
          const result = await deleteAllArticles();
          
          if (result.success) {
            setStatus(`✅ Successfully deleted all ${result.deletedCount} articles`);
            setSelectedArticles(new Set());
            await loadArticles();
            onRefresh?.();
          } else {
            setStatus(`❌ Failed to delete all articles: ${result.error}`);
          }
        } catch (error) {
          setStatus('❌ Unexpected error during mass deletion');
        } finally {
          setDeleteLoading(false);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      }
    });
  };

  // Edit handlers
  const handleEditArticle = (article: NewsArticle) => {
    setEditModal({
      isOpen: true,
      article
    });
  };

  const handleSaveEdit = async (updatedArticle: NewsArticle) => {
    try {
      setEditLoading(true);
      
      // Update in Firebase
      const articleRef = doc(db, 'articles', updatedArticle.id);
      await updateDoc(articleRef, {
        title: updatedArticle.title,
        summary: updatedArticle.summary,
        content: updatedArticle.content,
        difficulty: updatedArticle.difficulty,
        category: updatedArticle.category,
        estimatedReadingTime: updatedArticle.estimatedReadingTime,
        url: updatedArticle.url,
        tags: updatedArticle.tags,
        // Update the modified timestamp
        scrapedAt: new Date()
      });

      setStatus('✅ Article updated successfully');
      setEditModal({ isOpen: false, article: null });
      await loadArticles();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update article:', error);
      setStatus('❌ Failed to update article');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEdit = () => {
    if (!editLoading) {
      setEditModal({ isOpen: false, article: null });
    }
  };

  // Get unique categories and levels
  const categories = ['all', ...new Set(articles.map(a => a.category))];
  const levels = ['all', 'N5', 'N4', 'N3', 'N2', 'N1'];

  const allSelected = filteredArticles.length > 0 && filteredArticles.every(a => selectedArticles.has(a.id));
  const someSelected = filteredArticles.some(a => selectedArticles.has(a.id));

  return (
    <div className="space-y-6">
      {/* Filters and controls */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Level</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-3 py-1 border border-border rounded bg-background text-foreground text-sm"
              >
                {levels.map(level => (
                  <option key={level} value={level}>
                    {level === 'all' ? 'All Levels' : level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1 border border-border rounded bg-background text-foreground text-sm"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadArticles}
              disabled={loading}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/90 disabled:opacity-50"
            >
              {loading ? '⏳' : '🔄'} Refresh
            </button>

            {selectedArticles.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 disabled:opacity-50"
              >
                🗑️ Delete Selected ({selectedArticles.size})
              </button>
            )}

            {articles.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deleteLoading}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 disabled:opacity-50"
              >
                🗑️ Delete All
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm">{status}</p>
          </div>
        )}
      </div>

      {/* Articles header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Articles ({filteredArticles.length})
        </h3>

        {filteredArticles.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label className="text-sm text-muted-foreground">
              Select All
            </label>
          </div>
        )}
      </div>

      {/* Articles list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading articles...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📰</div>
          <p className="text-muted-foreground">No articles found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isSelected={selectedArticles.has(article.id)}
              onSelect={(checked) => handleSelectArticle(article.id, checked)}
              onDelete={() => handleDeleteSingle(article.id)}
              onEdit={() => handleEditArticle(article)}
            />
          ))}
        </div>
      )}

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        loading={deleteLoading}
      />

      {/* Edit modal */}
      <ArticleEditModal
        isOpen={editModal.isOpen}
        article={editModal.article}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        loading={editLoading}
      />
    </div>
  );
}