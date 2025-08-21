'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { NewsArticle } from '@/types/news';
import { getWatanocArticles, triggerArticleScraping, getArticleStats } from '@/utils/watanocArticles';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModal';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { DesktopContainer } from '@/components/layout/DesktopContainer';

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
    // Use theme-aware colors that adapt to the current color scheme
    const colors = {
      N5: 'bg-primary/10 text-primary border border-primary/20',
      N4: 'bg-secondary/50 text-secondary-foreground border border-secondary',
      N3: 'bg-accent/20 text-accent-foreground border border-accent/30',
      N2: 'bg-muted text-muted-foreground border border-border',
      N1: 'bg-destructive/10 text-destructive border border-destructive/20'
    };
    return colors[difficulty as keyof typeof colors] || colors.N4;
  };

  const getCategoryColor = (category: string) => {
    // All categories use consistent theme-aware styling
    return 'bg-muted text-muted-foreground border border-border';
  };

  // Generate a consistent random gradient based on article ID
  const getRandomGradient = (id: string) => {
    // Use article ID to generate consistent colors
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const gradients = [
      'from-purple-400 via-pink-500 to-red-500',
      'from-green-400 via-blue-500 to-purple-500',
      'from-yellow-400 via-red-500 to-pink-500',
      'from-blue-400 via-purple-500 to-pink-500',
      'from-indigo-400 via-purple-500 to-pink-500',
      'from-green-400 via-teal-500 to-blue-500',
      'from-orange-400 via-red-500 to-pink-500',
      'from-cyan-400 via-blue-500 to-purple-500',
      'from-rose-400 via-pink-500 to-purple-500',
      'from-amber-400 via-orange-500 to-red-500'
    ];
    
    return gradients[hash % gradients.length];
  };

  return (
    <article
      className="bg-card rounded-lg p-6 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-lg group"
      onClick={() => onClick(article)}
    >
      <div className="flex items-start gap-4">
        {/* Article Thumbnail with Gradient */}
        <div className={`w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br ${getRandomGradient(article.id)} group-hover:scale-105 transition-transform relative flex items-center justify-center`}>
          <span className="text-4xl drop-shadow-lg">📰</span>
        </div>

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
  const [showFilters, setShowFilters] = useState(false);
  
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

  const selectedLevelName = levels.find(l => l.id === selectedLevel)?.name || 'All Levels';
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name || 'All Categories';

  return (
    <div className="bg-card rounded-lg p-4 border border-border mb-8">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-all text-sm font-medium"
        >
          <span>🔽</span>
          <span>Filters</span>
          {(selectedLevel !== 'all' || selectedCategory !== 'all') && (
            <span className="ml-1 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
              Active
            </span>
          )}
        </button>

        {/* Active Filters Display */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <span className="text-sm text-muted-foreground">Showing:</span>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            {selectedLevelName}
          </span>
          {selectedCategory !== 'all' && (
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {selectedCategoryName}
            </span>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm"
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

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-in slide-in-from-top duration-200">
          {/* JLPT Levels */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              📚 JLPT Level
            </label>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => {
                    onLevelChange(level.id);
                    setShowFilters(false);
                  }}
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
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              🏷️ Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id);
                    setShowFilters(false);
                  }}
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

          {/* Clear Filters */}
          {(selectedLevel !== 'all' || selectedCategory !== 'all') && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onLevelChange('all');
                  onCategoryChange('all');
                  setShowFilters(false);
                }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main news page component
export default function NewsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { checkAndTrack } = useFeature('article_reading', {
    showModal: true,
    showToast: true,
    trackUsage: true
  });
  const { access, remaining, isLoading: featureLoading } = useFeature('article_reading');
  const { isPremium, userType } = useSubscription2();

  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Load articles on mount and when page changes
  useEffect(() => {
    loadArticles(false, page);
    loadStats();
  }, [page]);

  // Filter articles when filters change
  useEffect(() => {
    filterArticles();
  }, [articles, selectedLevel, selectedCategory]);

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
    // Check if user can access articles using the new unified system
    if (await checkAndTrack()) {
      // Navigate to individual article page using Next.js router
      router.push(`/news/${article.id}`);
    }
    // The access system will automatically show the appropriate modal
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

  // Calculate articles read today and limit
  const articlesReadToday = access ? (access.usage || 0) : 0;
  const articleLimit = access ? (access.limit || 0) : 0;
  const articlesRemaining = remaining || 0;

  // Main article list view
  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="News" backHref="/" />
      
      {/* Main Content */}
      <DesktopContainer>
        <MobileAwareContainer className="container mx-auto px-4 py-8">

        <div className="max-w-6xl mx-auto">
          {/* Description */}
          <div className="mb-8">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Read curated Japanese articles from <strong>Watanoc</strong> 🌐 and <strong>Todaii</strong> 📚 to improve your reading comprehension.
              Articles are organized by JLPT level and updated daily with fresh content from multiple sources.
            </p>
            {stats && (
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>📚 {stats.totalArticles} articles available</span>
                <span>📅 Updated: {new Date(stats.lastUpdated).toLocaleDateString()}</span>
                {userType !== 'guest' && !featureLoading && (
                  <span className="text-primary">
                    📖 {isPremium ? (
                      <span className="text-primary font-medium">Unlimited articles</span>
                    ) : articlesRemaining !== undefined && articlesRemaining !== null ? (
                      articlesRemaining > 0
                        ? `${articlesRemaining} ${articlesRemaining === 1 ? 'article' : 'articles'} remaining today`
                        : 'Daily limit reached'
                    ) : (
                      'Loading...'
                    )}
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
      </MobileAwareContainer>
      </DesktopContainer>

      {/* Modals */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={modalMessage}
        feature="articles"
      />

      <UpgradeSlideUpModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={modalMessage}
        feature="articles"
      />
    </div>
  );
}