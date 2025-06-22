'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { NewsArticle, NewsAPIResponse } from '@/types/news';
import { JapaneseNewsScraper } from '@/utils/newsScraper';
import { ArticleReader } from '@/components/reading/ArticleReader';
import CompanionTrigger from '@/components/CompanionTrigger';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

// Loading skeleton component
function ArticleCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 border border-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-3 bg-muted rounded w-12"></div>
            <div className="h-3 bg-muted rounded w-16"></div>
            <div className="h-3 bg-muted rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Article card component
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

  const getCategoryColor = (category: string) => {
    const colors = {
      weather: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      politics: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      economics: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      society: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      technology: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      sports: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[category as keyof typeof colors] || colors.general;
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

  return (
    <div
      className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer hover:shadow-md"
      onClick={() => onClick(article)}
    >
      <div className="flex items-start gap-3">
        {/* Article Image */}
        {article.imageUrl ? (
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
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
          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">📰</span>
          </div>
        )}

        {/* Article Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-medium text-foreground mb-2 line-clamp-2 leading-tight">
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {article.summary}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category */}
            <span className={`px-2 py-1 rounded-full ${getCategoryColor(article.category)}`}>
              {article.category}
            </span>

            {/* Difficulty */}
            <span className={`px-2 py-1 rounded-full ${getDifficultyColor(article.difficulty)}`}>
              {article.difficulty}
            </span>

            {/* Reading Time */}
            <span className="text-muted-foreground">
              📖 {article.estimatedReadingTime}分
            </span>

            {/* Date */}
            <span className="text-muted-foreground">
              📅 {formatDate(article.publishDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter bar component
interface FilterBarProps {
  onCategoryChange: (category: string) => void;
  onDifficultyChange: (difficulty: string) => void;
  onRefresh: () => void;
  selectedCategory: string;
  selectedDifficulty: string;
  isLoading: boolean;
}

function FilterBar({
  onCategoryChange,
  onDifficultyChange,
  onRefresh,
  selectedCategory,
  selectedDifficulty,
  isLoading
}: FilterBarProps) {
  const categories = [
    { id: 'all', name: 'All', icon: '📰' },
    { id: 'weather', name: 'Weather', icon: '🌤️' },
    { id: 'society', name: 'Society', icon: '🏛️' },
    { id: 'technology', name: 'Technology', icon: '💻' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'general', name: 'General', icon: '📋' }
  ];

  const difficulties = [
    { id: 'all', name: 'All' },
    { id: 'N5', name: 'N5' },
    { id: 'N4', name: 'N4' },
    { id: 'N3', name: 'N3' }
  ];

  return (
    <div className="bg-card rounded-lg p-4 border border-border mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Categories */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-2">
            Level
          </label>
          <div className="flex flex-wrap gap-2">
            {difficulties.map((difficulty) => (
              <button
                key={difficulty.id}
                onClick={() => onDifficultyChange(difficulty.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  selectedDifficulty === difficulty.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {difficulty.name}
              </button>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex items-end">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span>
                Loading
              </span>
            ) : (
              <span className="flex items-center gap-2">
                🔄 Refresh
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main reading page component
export default function ReadingPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Load articles on mount
  useEffect(() => {
    loadArticles();
  }, []);

  // Filter articles when filters change
  useEffect(() => {
    filterArticles();
  }, [articles, selectedCategory, selectedDifficulty]);

  const loadArticles = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get articles from the scraper
      const fetchedArticles = await JapaneseNewsScraper.getArticles('nhk-easy', 10, forceRefresh);
      setArticles(fetchedArticles);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('Failed to load articles. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(article => article.difficulty === selectedDifficulty);
    }

    setFilteredArticles(filtered);
  };

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
  };

  const handleRefresh = () => {
    loadArticles(true);
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
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
        <PageHeader title="Read Japanese News" showBackButton={true} />

        <div className="max-w-4xl mx-auto">
          {/* Description */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              Read the latest news articles from NHK NEWS WEB EASY to improve your Japanese reading comprehension.
            </p>
          </div>

          {/* Filter Bar */}
          <FilterBar
            onCategoryChange={setSelectedCategory}
            onDifficultyChange={setSelectedDifficulty}
            onRefresh={handleRefresh}
            selectedCategory={selectedCategory}
            selectedDifficulty={selectedDifficulty}
            isLoading={loading}
          />

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-destructive">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <ArticleCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Articles List */}
          {!loading && !error && (
            <>
              {/* Results count */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {filteredArticles.length} articles found
                </p>
              </div>

              {/* Articles */}
              {filteredArticles.length > 0 ? (
                <div className="space-y-4">
                  {filteredArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onClick={handleArticleClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📰</div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No articles found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try changing the filters or refreshing the articles.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Refresh Articles
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
