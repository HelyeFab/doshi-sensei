'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { NewsArticle } from '@/types/news';
import { getWatanocArticles, triggerArticleScraping, getArticleStats } from '@/utils/watanocArticles';
import { ArticleReader } from '@/components/reading/ArticleReader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useEntitlements } from '@/hooks/useEntitlements';

// Loading skeleton component
function ArticleCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-6 border border-border animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0"></div>
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="flex items-center gap-3 mt-4">
            <div className="h-6 bg-muted rounded-full w-12"></div>
            <div className="h-6 bg-muted rounded-full w-16"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Article card component with ruby tag support
interface ArticleCardProps {
  article: NewsArticle;
  onClick: (article: NewsArticle) => void;
}

function ArticleCard({ article, onClick }: ArticleCardProps) {
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric'
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
    return colors[difficulty as keyof typeof colors] || colors.N4;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      culture: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      business: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      technology: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      society: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      transportation: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  return (
    <article
      className="bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-lg group"
      onClick={() => onClick(article)}
    >
      <div className="flex items-start gap-4">
        {/* Article Image */}
        {article.imageUrl ? (
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-muted group-hover:scale-105 transition-transform">
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">📰</span>
          </div>
        )}

        {/* Article Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-semibold text-foreground mb-3 line-clamp-2 leading-relaxed text-lg group-hover:text-primary transition-colors">
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {article.summary}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-3">
            {/* JLPT Level */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(article.difficulty)}`}>
              {article.difficulty}
            </span>

            {/* Category */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(article.category)}`}>
              {article.category}
            </span>

            {/* Reading Time */}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              📖 {article.estimatedReadingTime}分
            </span>

            {/* Date */}
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              📅 {formatDate(article.publishDate)}
            </span>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{article.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// Filter component
interface FilterBarProps {
  onLevelChange: (level: string) => void;
  onCategoryChange: (category: string) => void;
  onRefresh: () => void;
  selectedLevel: string;
  selectedCategory: string;
  isLoading: boolean;
  stats: any;
}

function FilterBar({
  onLevelChange,
  onCategoryChange,
  onRefresh,
  selectedLevel,
  selectedCategory,
  isLoading,
  stats
}: FilterBarProps) {
  const levels = [
    { id: 'all', name: 'All Levels', count: stats?.totalArticles || 0 },
    { id: 'N5', name: 'N5 (Beginner)', count: stats?.articlesByLevel?.N5 || 0 },
    { id: 'N4', name: 'N4 (Elementary)', count: stats?.articlesByLevel?.N4 || 0 },
    { id: 'N3', name: 'N3 (Intermediate)', count: stats?.articlesByLevel?.N3 || 0 },
    { id: 'N2', name: 'N2 (Upper-Int)', count: stats?.articlesByLevel?.N2 || 0 },
    { id: 'N1', name: 'N1 (Advanced)', count: stats?.articlesByLevel?.N1 || 0 }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'culture', name: 'Culture', icon: '🎌' },
    { id: 'business', name: 'Business', icon: '💼' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'society', name: 'Society', icon: '🏛️' },
    { id: 'transportation', name: 'Transportation', icon: '🚄' },
    { id: 'general', name: 'General', icon: '📋' }
  ];

  return (
    <div className="bg-card rounded-lg p-6 border border-border mb-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* JLPT Levels */}
        <div className="flex-1">
          <label className="block text-sm font-semibold text-foreground mb-3">
            📚 JLPT Level
          </label>
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => onLevelChange(level.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedLevel === level.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {level.name}
                {level.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({level.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex-1">
          <label className="block text-sm font-semibold text-foreground mb-3">
            🏷️ Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {category.icon && <span>{category.icon}</span>}
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">🔄</span>
                Loading
              </>
            ) : (
              <>
                🔄 Refresh
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main news page component
export default function NewsPage() {
  const { user } = useAuth();
  const { showLoginPrompt, showUpgradePrompt, incrementArticleCount } = useSubscription();
  const { canReadArticle, isPremium } = useEntitlements();
  
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [articlesReadToday, setArticlesReadToday] = useState(0);
  const [articleLimit, setArticleLimit] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Load articles on mount and when page changes
  useEffect(() => {
    loadArticles(false, page);
    loadStats();
    checkArticleStatus();
  }, [page]);

  // Filter articles when filters change
  useEffect(() => {
    filterArticles();
  }, [articles, selectedLevel, selectedCategory]);
  
  const checkArticleStatus = () => {
    const articleCheck = canReadArticle();
    setArticlesReadToday(articleCheck.used || 0);
    setArticleLimit(articleCheck.limit || 0);
  };

  const loadArticles = async (forceRefresh = false, pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const fetchedArticles = await getWatanocArticles(forceRefresh, pageNum, pageSize);
      setArticles(fetchedArticles);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('Failed to load articles. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const articleStats = await getArticleStats();
      setStats(articleStats);
    } catch (error) {
      console.error('Failed to load article stats:', error);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    // Filter by JLPT level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(article => article.difficulty === selectedLevel);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    setFilteredArticles(filtered);
  };

  const handleArticleClick = async (article: NewsArticle) => {
    // Check if user can read more articles today using entitlements
    const articleCheck = canReadArticle();
    if (!articleCheck.allowed) {
      if (!user) {
        showLoginPrompt(
          `You've reached your daily article limit (${articleCheck.used}/${articleCheck.limit})! Sign up to read more articles and track your progress.`,
          'articles'
        );
      } else {
        showUpgradePrompt(
          `You've read your daily article limit (${articleCheck.used}/${articleCheck.limit})! Upgrade to Premium for unlimited articles.`,
          'articles'
        );
      }
      return;
    }
    
    setSelectedArticle(article);
    
    // Track article read after successfully opening
    try {
      await incrementArticleCount();
      checkArticleStatus(); // Update the displayed counts
    } catch (error) {
      console.error('Error tracking article read:', error);
      // Don't fail the whole article open if tracking fails
    }
  };

  const handleRefresh = async () => {
    // Try to trigger new scraping
    try {
      const scrapingResult = await triggerArticleScraping();
      if (scrapingResult.success) {
        // Wait a bit for the function to complete, then refresh
        setTimeout(() => {
          setPage(1);
          loadArticles(true, 1);
          loadStats();
        }, 2000);
      } else {
        // Just refresh current data
        setPage(1);
        loadArticles(true, 1);
      }
    } catch (error) {
      // Fallback to just refreshing current data
      setPage(1);
      loadArticles(true, 1);
    }
  };

  // If an article is selected, show the article reader
  if (selectedArticle) {
    return (
      <ArticleReader
        article={selectedArticle}
        onBack={() => setSelectedArticle(null)}
      />
    );
  }

  // Main article list view
  return (
    <>
      {/* Virtual Companion Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        <PageHeader title="Japanese News Articles" showBackButton={true} helpKey="news" />

        <div className="max-w-6xl mx-auto">
          {/* Description */}
          <div className="mb-8">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Read curated Japanese articles from <strong>Watanoc, Todaii News, and NHK Easy</strong> to improve your reading comprehension.
              Articles are organized by JLPT level and updated daily with fresh content.
            </p>
            {stats && (
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>📚 {stats.totalArticles} articles available</span>
                <span>📅 Updated: {new Date(stats.lastUpdated).toLocaleDateString()}</span>
                {!isPremium && articleLimit > 0 && (
                  <span className="text-primary">
                    📖 {articlesReadToday < articleLimit 
                      ? `${articleLimit - articlesReadToday} ${articleLimit - articlesReadToday === 1 ? 'article' : 'articles'} remaining today`
                      : 'Daily limit reached'
                    }
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <FilterBar
            onLevelChange={setSelectedLevel}
            onCategoryChange={setSelectedCategory}
            onRefresh={handleRefresh}
            selectedLevel={selectedLevel}
            selectedCategory={selectedCategory}
            isLoading={loading}
            stats={stats}
          />

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3 text-destructive">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-semibold">Error Loading Articles</h3>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-6">
              {[...Array(3)].map((_, index) => (
                <ArticleCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Articles List */}
          {!loading && !error && (
            <>
              {/* Results count */}
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                  {selectedLevel !== 'all' && ` for ${selectedLevel}`}
                  {selectedCategory !== 'all' && ` in ${selectedCategory}`}
                </p>
              </div>

              {/* Articles */}
              {filteredArticles.length > 0 ? (
                <div className="space-y-6">
                  {filteredArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onClick={handleArticleClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">📰</div>
                  <h3 className="text-2xl font-semibold text-foreground mb-4">
                    No articles found
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    No articles match your current filters. Try adjusting the JLPT level or category,
                    or refresh to get the latest articles.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    🔄 Refresh Articles
                  </button>
                </div>
              )}
            </>
          )}

          {/* Pagination Controls */}
          <div className="flex justify-center gap-4 my-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded bg-muted text-muted-foreground disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={articles.length < pageSize}
              className="px-4 py-2 rounded bg-muted text-muted-foreground disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
