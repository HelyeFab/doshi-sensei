'use client';

import { useState, useEffect } from 'react';
import { SavedKanji, Kanji, JLPTLevel } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import KanjiManager from '@/utils/kanjiManager';
import KanjiModal from '@/components/kanji/KanjiModal';
import { BookmarkManager, BookmarkedArticle } from '@/utils/bookmarkManager';
import Link from 'next/link';

// Structured Data for Favourites
const favouritesStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "My Favourite Japanese Kanji Collection",
  "description": "Personal collection of saved Japanese kanji characters for study and practice. Organize your learning with favorited kanji from JLPT levels.",
  "url": "https://doshisensei.com/favourites",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Collection",
  "about": {
    "@type": "Thing",
    "name": "Japanese Kanji Study Collection",
    "description": "Personalized kanji learning collection with meanings and readings"
  },
  "teaches": [
    "Japanese kanji recognition",
    "Personal study organization",
    "Kanji review and practice",
    "Learning progress tracking"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "favorite kanji",
    "saved kanji",
    "kanji collection",
    "Japanese study",
    "kanji favorites",
    "personal kanji list"
  ]
};

type TabType = 'kanji' | 'articles';

export default function FavouritesPage() {
  const { user } = useAuth();
  const { userSubscription, isPremium } = useSubscription();

  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('kanji');

  // Kanji state
  const [savedKanji, setSavedKanji] = useState<SavedKanji[]>([]);
  const [selectedKanji, setSelectedKanji] = useState<Kanji | null>(null);
  const [filterLevel, setFilterLevel] = useState<JLPTLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'level' | 'character'>('recent');

  // Articles state
  const [bookmarkedArticles, setBookmarkedArticles] = useState<BookmarkedArticle[]>([]);
  const [articleSortBy, setArticleSortBy] = useState<'recent' | 'title' | 'category'>('recent');
  const [articleFilterCategory, setArticleFilterCategory] = useState<string>('all');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);

  // Load saved kanji and articles on component mount
  useEffect(() => {
    loadSavedKanji();
    if (user) {
      loadBookmarkedArticles();
    }
  }, [user]);

  // Load articles when tab changes
  useEffect(() => {
    if (activeTab === 'articles' && user && bookmarkedArticles.length === 0) {
      loadBookmarkedArticles();
    }
  }, [activeTab, user]);

  const loadSavedKanji = async () => {
    try {
      setLoading(true);
      const kanji = await KanjiManager.getSavedKanji();
      setSavedKanji(kanji);
    } catch (error) {
      console.error('Error loading saved kanji:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarkedArticles = async () => {
    if (!user) return;
    
    try {
      setArticlesLoading(true);
      const articles = await BookmarkManager.getUserBookmarks(user.uid);
      setBookmarkedArticles(articles);
    } catch (error) {
      console.error('Error loading bookmarked articles:', error);
    } finally {
      setArticlesLoading(false);
    }
  };

  const handleKanjiClick = (kanji: Kanji) => {
    setSelectedKanji(kanji);
  };

  const handleKanjiRemove = async (kanjiCharacter: string) => {
    try {
      await KanjiManager.removeSavedKanji(kanjiCharacter, user, userSubscription?.subscription.plan);
      setSavedKanji(prev => prev.filter(saved => saved.kanji.kanji !== kanjiCharacter));
    } catch (error) {
      console.error('Error removing kanji:', error);
    }
  };

  const handleArticleRemove = async (articleId: string) => {
    if (!user) return;
    
    try {
      await BookmarkManager.removeBookmark(user.uid, articleId);
      setBookmarkedArticles(prev => prev.filter(article => article.articleId !== articleId));
    } catch (error) {
      console.error('Error removing bookmarked article:', error);
    }
  };

  const clearAllSaved = async () => {
    if (activeTab === 'kanji') {
      if (confirm('Are you sure you want to remove all saved kanji? This action cannot be undone.')) {
        try {
          await KanjiManager.clearAllSavedKanji();
          setSavedKanji([]);
        } catch (error) {
          console.error('Error clearing saved kanji:', error);
        }
      }
    } else {
      if (confirm('Are you sure you want to remove all bookmarked articles? This action cannot be undone.')) {
        try {
          if (user) {
            await BookmarkManager.clearAllBookmarks(user.uid);
            setBookmarkedArticles([]);
          }
        } catch (error) {
          console.error('Error clearing bookmarked articles:', error);
        }
      }
    }
  };

  // Filter and sort kanji
  const filteredAndSortedKanji = savedKanji
    .filter(saved => filterLevel === 'all' || saved.kanji.jlpt === filterLevel)
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.savedAt.getTime() - a.savedAt.getTime();
        case 'level':
          const levelOrder = { 'N5': 0, 'N4': 1, 'N3': 2, 'N2': 3, 'N1': 4 };
          return levelOrder[a.kanji.jlpt] - levelOrder[b.kanji.jlpt];
        case 'character':
          return a.kanji.kanji.localeCompare(b.kanji.kanji);
        default:
          return 0;
      }
    });

  // Filter and sort articles
  const categories = [...new Set(bookmarkedArticles.map(article => article.articleCategory))];
  const filteredAndSortedArticles = bookmarkedArticles
    .filter(article => articleFilterCategory === 'all' || article.articleCategory === articleFilterCategory)
    .sort((a, b) => {
      switch (articleSortBy) {
        case 'recent':
          return b.bookmarkedAt.toMillis() - a.bookmarkedAt.toMillis();
        case 'title':
          return a.articleTitle.localeCompare(b.articleTitle);
        case 'category':
          return a.articleCategory.localeCompare(b.articleCategory);
        default:
          return 0;
      }
    });

  // Get statistics
  const stats = savedKanji.reduce((acc, saved) => {
    acc.total++;
    acc.byLevel[saved.kanji.jlpt]++;
    return acc;
  }, {
    total: 0,
    byLevel: {
      'N5': 0,
      'N4': 0,
      'N3': 0,
      'N2': 0,
      'N1': 0
    } as Record<JLPTLevel, number>
  });

  const levelColors = {
    'N5': 'bg-green-500',
    'N4': 'bg-blue-500',
    'N3': 'bg-yellow-500',
    'N2': 'bg-orange-500',
    'N1': 'bg-red-500'
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your favorite kanji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(favouritesStructuredData),
        }}
      />

      {/* Header */}
      <div className="mb-8">
        <PageHeader title="⭐ My Favourites" />
        <p className="text-muted-foreground text-center mt-2">
          Your personal collection of saved kanji and bookmarked articles.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('kanji')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'kanji'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📖 Kanji ({savedKanji.length})
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === 'articles'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📰 Articles ({bookmarkedArticles.length})
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'kanji' ? (
        savedKanji.length === 0 ? (
          // Empty State for Kanji
          <div className="text-center max-w-md mx-auto py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              No Favourite Kanji Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start building your collection by browsing kanji and saving the ones you want to study.
            </p>
            <a
              href="/kanji-browser"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Kanji
            </a>
          </div>
        ) : (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Saved</div>
            </div>
            {Object.entries(stats.byLevel).map(([level, count]) => (
              <div key={level} className="bg-card border border-border rounded-lg p-4 text-center">
                <div className={`w-6 h-6 ${levelColors[level as JLPTLevel]} rounded-full mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold`}>
                  {level.replace('N', '')}
                </div>
                <div className="text-lg font-semibold text-card-foreground">{count}</div>
                <div className="text-xs text-muted-foreground">{level}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {/* Filter by Level */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Filter by JLPT Level
              </label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value as JLPTLevel | 'all')}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Levels ({stats.total})</option>
                <option value="N5">N5 ({stats.byLevel.N5})</option>
                <option value="N4">N4 ({stats.byLevel.N4})</option>
                <option value="N3">N3 ({stats.byLevel.N3})</option>
                <option value="N2">N2 ({stats.byLevel.N2})</option>
                <option value="N1">N1 ({stats.byLevel.N1})</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'level' | 'character')}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="recent">Recently Added</option>
                <option value="level">JLPT Level</option>
                <option value="character">Character (A-Z)</option>
              </select>
            </div>

            {/* Clear All Button */}
            <div className="flex items-end">
              <button
                onClick={clearAllSaved}
                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors font-medium"
              >
                Clear All Kanji
              </button>
            </div>
          </div>

          {/* Kanji Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 mb-32 md:mb-8 pb-safe">
            {filteredAndSortedKanji.map((savedKanjiItem) => (
              <button
                key={savedKanjiItem.id}
                onClick={() => handleKanjiClick(savedKanjiItem.kanji)}
                className="relative group aspect-square flex flex-col items-center justify-center bg-card border-2 border-primary/20 text-card-foreground rounded-lg transition-all hover:scale-105 hover:border-primary hover:bg-primary/5"
              >
                <div className="text-2xl font-medium mb-1">
                  {savedKanjiItem.kanji.kanji}
                </div>
                <div className={`absolute top-1 right-1 w-4 h-4 ${levelColors[savedKanjiItem.kanji.jlpt]} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                  {savedKanjiItem.kanji.jlpt.replace('N', '')}
                </div>

                {/* Hover overlay with meaning */}
                <div className="absolute inset-0 bg-black/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <div className="text-white text-xs text-center">
                    {savedKanjiItem.kanji.meaning}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* No results after filtering */}
          {filteredAndSortedKanji.length === 0 && savedKanji.length > 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No kanji found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your filter settings to see more results.
              </p>
            </div>
          )}
        </>
        )
      ) : (
        // Articles Tab
        articlesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your bookmarked articles...</p>
          </div>
        ) : bookmarkedArticles.length === 0 ? (
          // Empty State for Articles
          <div className="text-center max-w-md mx-auto py-12">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              No Bookmarked Articles Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start reading Japanese news articles and bookmark the ones you want to revisit later.
              {!isPremium && ` Free users can bookmark up to 3 articles.`}
            </p>
            <a
              href="/news"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              📖 Browse Articles
            </a>
          </div>
        ) : (
          <>
            {/* Article Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">{bookmarkedArticles.length}</div>
                <div className="text-xs text-muted-foreground">Total Bookmarked</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500 mb-1">{categories.length}</div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500 mb-1">
                  {isPremium ? '∞' : Math.max(0, 3 - bookmarkedArticles.length)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isPremium ? 'Unlimited' : 'Remaining'}
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-500 mb-1">
                  {Math.round(bookmarkedArticles.reduce((sum, article) => sum + (article.metadata?.estimatedReadingTime || 5), 0))}
                </div>
                <div className="text-xs text-muted-foreground">Minutes to Read</div>
              </div>
            </div>

            {/* Article Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {/* Filter by Category */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Filter by Category
                </label>
                <select
                  value={articleFilterCategory}
                  onChange={(e) => setArticleFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Categories ({bookmarkedArticles.length})</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category} ({bookmarkedArticles.filter(a => a.articleCategory === category).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sort By
                </label>
                <select
                  value={articleSortBy}
                  onChange={(e) => setArticleSortBy(e.target.value as 'recent' | 'title' | 'category')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="recent">Recently Bookmarked</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="category">Category</option>
                </select>
              </div>

              {/* Clear All Button */}
              <div className="flex items-end">
                <button
                  onClick={clearAllSaved}
                  className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors font-medium"
                >
                  Clear All Articles
                </button>
              </div>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32 md:mb-8 pb-safe">
              {filteredAndSortedArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  {/* Article Image */}
                  {article.articleImageUrl && (
                    <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
                      <img
                        src={article.articleImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Article Content */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-foreground line-clamp-2 flex-1">
                        {article.articleTitle}
                      </h3>
                      <button
                        onClick={() => handleArticleRemove(article.articleId)}
                        className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                        title="Remove bookmark"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Article Metadata */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                        {article.articleCategory}
                      </span>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                        {article.articleDifficulty}
                      </span>
                      {article.metadata?.estimatedReadingTime && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                          {article.metadata.estimatedReadingTime}min
                        </span>
                      )}
                    </div>

                    {/* Bookmark Date */}
                    <div className="text-xs text-muted-foreground">
                      Bookmarked {article.bookmarkedAt.toDate().toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <a
                        href={`/reading?id=${article.articleId}&source=${article.articleSource}`}
                        className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded text-sm text-center hover:bg-primary/90 transition-colors"
                      >
                        📖 Read Article
                      </a>
                      <a
                        href={article.articleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 transition-colors"
                        title="View original"
                      >
                        🔗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No results after filtering */}
            {filteredAndSortedArticles.length === 0 && bookmarkedArticles.length > 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No articles found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your filter settings to see more results.
                </p>
              </div>
            )}
          </>
        )
      )}

      {/* Kanji Detail Modal */}
      {selectedKanji && (
        <KanjiModal
          kanji={selectedKanji}
          isOpen={!!selectedKanji}
          onClose={() => setSelectedKanji(null)}
          isSaved={true} // Always true since this is the favourites page
          onSave={() => {}} // Not needed since already saved
          onRemove={() => handleKanjiRemove(selectedKanji.kanji)}
        />
      )}
    </div>
  );
}
