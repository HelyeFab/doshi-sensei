'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, WordList, StudyList, StudyListType, Kanji } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import ArticleManager from '@/utils/articleManager';
import StudyListManager from '@/utils/studyListManager';
import WordListManager from '@/utils/wordLists';
import { StoryBookmarkManager } from '@/utils/storyBookmarkManager';
import Link from 'next/link';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

// Structured Data for Favourites
const favouritesStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "My Japanese Study Collections",
  "description": "Personal collection of vocabulary lists and bookmarked articles for Japanese language study. Organize your learning with custom word lists and saved reading materials.",
  "url": "https://doshisensei.com/favourites",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Collection",
  "about": {
    "@type": "Thing",
    "name": "Japanese Study Collections",
    "description": "Personalized vocabulary lists and article bookmarks"
  },
  "teaches": [
    "Japanese vocabulary organization",
    "Personal study list management",
    "Reading practice materials",
    "Learning progress tracking"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "vocabulary lists",
    "word lists",
    "study collections",
    "Japanese study",
    "bookmarked articles",
    "personal study lists"
  ]
};

type TabType = 'lists' | 'articles' | 'stories';

export default function FavouritesPage() {
  const { user } = useAuth();
  const { userSubscription, isPremium } = useSubscription();

  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('lists');

  // Lists state
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedList, setSelectedList] = useState<WordList | null>(null);
  const [listWords, setListWords] = useState<JapaneseWord[]>([]);
  const [listKanji, setListKanji] = useState<Kanji[]>([]);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);

  // Articles state
  const [bookmarkedArticles, setBookmarkedArticles] = useState<any[]>([]);
  const [articleSortBy, setArticleSortBy] = useState<'recent' | 'title' | 'category'>('recent');
  const [articleFilterCategory, setArticleFilterCategory] = useState<string>('all');

  // Stories state
  const [bookmarkedStories, setBookmarkedStories] = useState<any[]>([]);
  const [storySortBy, setStorySortBy] = useState<'recent' | 'title' | 'theme'>('recent');
  const [storyFilterTheme, setStoryFilterTheme] = useState<string>('all');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [storiesLoading, setStoriesLoading] = useState(false);

  // Add state for the confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    loading: false,
    onConfirm: () => { },
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDestructive: false,
  });

  // Add state for single article delete confirmation
  const [pendingDeleteArticleId, setPendingDeleteArticleId] = useState<string | null>(null);

  // Add state for error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add state for single story delete confirmation
  const [pendingDeleteStoryId, setPendingDeleteStoryId] = useState<string | null>(null);
  const [singleStoryDeleteLoading, setSingleStoryDeleteLoading] = useState(false);
  const [singleStoryDeleteError, setSingleStoryDeleteError] = useState<string | null>(null);

  // Load word lists and articles on component mount
  useEffect(() => {
    loadWordLists();
    if (user) {
      loadBookmarkedArticles();
      loadBookmarkedStories();
    }
  }, [user]);

  // Load content when tab changes
  useEffect(() => {
    if (activeTab === 'articles' && user && bookmarkedArticles.length === 0) {
      loadBookmarkedArticles();
    }
    if (activeTab === 'stories' && user && bookmarkedStories.length === 0) {
      loadBookmarkedStories();
    }
  }, [activeTab, user]);

  const loadWordLists = async () => {
    try {
      setLoading(true);
      // Load unified study lists and convert them to legacy format for compatibility
      const studyLists = await StudyListManager.getAllStudyLists();
      const legacyWordLists: WordList[] = studyLists.map(studyList => ({
        id: studyList.id,
        name: studyList.name,
        description: studyList.description,
        wordIds: studyList.itemIds,
        createdAt: studyList.createdAt,
        updatedAt: studyList.updatedAt,
        color: studyList.color,
        isConjugable: studyList.type === 'drillable'
      }));
      setWordLists(legacyWordLists);
    } catch (error) {
      console.error('Error loading word lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarkedArticles = async () => {
    if (!user) return;
    try {
      setArticlesLoading(true);
      const articles = await ArticleManager.getUserBookmarks(user.uid);
      setBookmarkedArticles(articles.filter(b => b.contentType === 'article'));
    } catch (error) {
      console.error('Error loading bookmarked articles:', error);
    } finally {
      setArticlesLoading(false);
    }
  };

  const loadBookmarkedStories = async () => {
    if (!user) return;
    try {
      setStoriesLoading(true);
      const stories = await StoryBookmarkManager.getUserStoryBookmarks(user.uid);
      setBookmarkedStories(stories);
    } catch (error) {
      console.error('Error loading bookmarked stories:', error);
    } finally {
      setStoriesLoading(false);
    }
  };

  const handleListClick = async (list: WordList) => {
    try {
      setSelectedList(list);
      // Use the unified system to get both words and kanji from the list
      const { words, kanji } = await StudyListManager.getItemsInList(list.id);
      setListWords(words);
      setListKanji(kanji);
    } catch (error) {
      console.error('Error loading list items:', error);
    }
  };

  const handleListDelete = async (listId: string) => {
    if (confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      try {
        await StudyListManager.deleteStudyList(listId, user, userSubscription?.subscription?.status);
        setWordLists(prev => prev.filter(list => list.id !== listId));
        if (selectedList?.id === listId) {
          setSelectedList(null);
          setListWords([]);
          setListKanji([]);
        }
      } catch (error) {
        console.error('Error deleting list:', error);
      }
    }
  };

  const handleWordRemoveFromList = async (wordId: string) => {
    if (!selectedList) return;

    try {
      await StudyListManager.removeItemFromList(wordId, selectedList.id, user);
      setListWords(prev => prev.filter(word => word.id !== wordId));
      // Update the word count in the list
      setWordLists(prev => prev.map(list =>
        list.id === selectedList.id
          ? { ...list, wordIds: list.wordIds.filter(id => id !== wordId) }
          : list
      ));
    } catch (error) {
      console.error('Error removing word from list:', error);
    }
  };

  const handleKanjiRemoveFromList = async (kanjiChar: string) => {
    if (!selectedList) return;

    try {
      await StudyListManager.removeItemFromList(`kanji_${kanjiChar}`, selectedList.id, user);
      setListKanji(prev => prev.filter(kanji => kanji.kanji !== kanjiChar));
    } catch (error) {
      console.error('Error removing kanji from list:', error);
    }
  };

  const handleArticleRemove = async (articleId: string | undefined) => {
    if (!user || !articleId) return;
    try {
      await ArticleManager.removeBookmark(user.uid, articleId);
      await loadBookmarkedArticles();
    } catch (error) {
      setErrorMessage('Failed to remove the article bookmark. Please try again.');
      console.error('Error removing bookmarked article:', error);
    }
  };

  const handleStoryRemove = async (storyId: string) => {
    if (!user) return;
    try {
      await StoryBookmarkManager.removeBookmark(user.uid, storyId);
      await loadBookmarkedStories();
    } catch (error) {
      setErrorMessage('Failed to remove the story bookmark. Please try again.');
      console.error('Error removing bookmarked story:', error);
    }
  };

  const clearAllSaved = async () => {
    if (activeTab === 'lists') {
      setConfirmDialog({
        isOpen: true,
        loading: false,
        title: 'Delete All Word Lists',
        message: 'Are you sure you want to delete all word lists? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          try {
            for (const list of wordLists) {
              await StudyListManager.deleteStudyList(list.id, user, userSubscription?.subscription?.status);
            }
            setWordLists([]);
            setSelectedList(null);
            setListWords([]);
            setListKanji([]);
          } catch (error) {
            setErrorMessage('Failed to delete all word lists. Please try again.');
            console.error('Error clearing word lists:', error);
          } finally {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    } else if (activeTab === 'articles') {
      setConfirmDialog({
        isOpen: true,
        loading: false,
        title: 'Remove All Bookmarked Articles',
        message: 'Are you sure you want to remove all bookmarked articles? This action cannot be undone.',
        confirmText: 'Remove',
        cancelText: 'Cancel',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          let hadError = false;
          try {
            if (user) {
              const bookmarks = await ArticleManager.getUserBookmarks(user.uid);
              const articleBookmarks = bookmarks.filter(b => b.contentType === 'article');
              for (const b of articleBookmarks) {
                try {
                  await ArticleManager.removeBookmark(user.uid, b.contentId);
                } catch (err) {
                  hadError = true;
                  console.error('Error removing article bookmark:', err);
                }
              }
              // Always reload from Firestore after deletion
              await loadBookmarkedArticles();
              if (hadError) setErrorMessage('Some articles could not be removed. Please try again.');
            }
          } catch (error) {
            setErrorMessage('Failed to remove all bookmarked articles. Please try again.');
            console.error('Error clearing bookmarked articles:', error);
          } finally {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    } else if (activeTab === 'stories') {
      setConfirmDialog({
        isOpen: true,
        loading: false,
        title: 'Remove All Bookmarked Stories',
        message: 'Are you sure you want to remove all bookmarked stories? This action cannot be undone.',
        confirmText: 'Remove',
        cancelText: 'Cancel',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          let hadError = false;
          try {
            if (user) {
              for (const story of bookmarkedStories) {
                try {
                  await StoryBookmarkManager.removeBookmark(user.uid, story.contentId);
                } catch (err) {
                  hadError = true;
                  console.error('Error removing story bookmark:', err);
                }
              }
              // Always reload from Firestore after deletion
              await loadBookmarkedStories();
              if (hadError) setErrorMessage('Some stories could not be removed. Please try again.');
            }
          } catch (error) {
            setErrorMessage('Failed to remove all bookmarked stories. Please try again.');
            console.error('Error clearing bookmarked stories:', error);
          } finally {
            setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
          }
        },
      });
    }
  };

  // Filter and sort articles
  const categories = [...new Set(bookmarkedArticles.map(article => article.articleCategory))];
  const filteredAndSortedArticles = bookmarkedArticles
    .filter(article => articleFilterCategory === 'all' || article.articleCategory === articleFilterCategory)
    .sort((a, b) => {
      switch (articleSortBy) {
        case 'recent':
          return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
        case 'title':
          return a.articleTitle.localeCompare(b.articleTitle);
        case 'category':
          return a.articleCategory.localeCompare(b.articleCategory);
        default:
          return 0;
      }
    });

  // Filter and sort stories
  const themes = [...new Set(bookmarkedStories.map(story => story.originalContent?.theme || 'Unknown'))];
  const filteredAndSortedStories = bookmarkedStories
    .filter(story => storyFilterTheme === 'all' || (story.originalContent?.theme || 'Unknown') === storyFilterTheme)
    .sort((a, b) => {
      switch (storySortBy) {
        case 'recent':
          return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime();
        case 'title':
          return a.contentTitle.localeCompare(b.contentTitle);
        case 'theme':
          return (a.originalContent?.theme || '').localeCompare(b.originalContent?.theme || '');
        default:
          return 0;
      }
    });


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(favouritesStructuredData),
        }}
      />

      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      <div className="container mx-auto px-4 pb-20">
        {/* Header */}
        <div className="mb-8">
          <PageHeader title="⭐ My Favourites" helpKey="favourites" />
          <p className="text-muted-foreground text-center mt-2">
            Your personal collection of vocabulary lists and bookmarked articles.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab('lists')}
              className={`px-6 py-2 rounded-md transition-colors ${activeTab === 'lists'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              📚 Lists ({wordLists.length})
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`px-6 py-2 rounded-md transition-colors ${activeTab === 'articles'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              📰 Articles ({bookmarkedArticles.length})
            </button>
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-6 py-2 rounded-md transition-colors ${activeTab === 'stories'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              📖 Stories ({bookmarkedStories.length})
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'lists' ? (
          !selectedList ? (
            // Lists view
            wordLists.length === 0 ? (
              // Empty State for Lists
              <div className="text-center max-w-md mx-auto py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  No Word Lists Yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create your first list to start organizing your Japanese vocabulary.
                </p>
                <button
                  onClick={() => setShowCreateListModal(true)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First List
                </button>
              </div>
            ) : (
              <>
                {/* Controls */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">My Word Lists</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreateListModal(true)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      + Create List
                    </button>
                    {wordLists.length > 0 && (
                      <button
                        onClick={clearAllSaved}
                        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors text-sm font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Word Lists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-32 md:mb-8">
                  {wordLists.map((list) => (
                    <div
                      key={list.id}
                      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => handleListClick(list)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: list.color }}
                          ></div>
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {list.name}
                          </h3>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleListDelete(list.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                          title="Delete list"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {list.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{list.description}</p>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{list.wordIds.length} items</span>
                        <span className={`px-2 py-1 rounded text-xs ${list.isConjugable
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}>
                          {list.isConjugable ? 'Drillable' : 'Flashcard'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            // Selected list detail view
            <>
              {/* List Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedList(null);
                      setListWords([]);
                      setListKanji([]);
                    }}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: selectedList.color }}
                    ></div>
                    <h2 className="text-xl font-semibold text-foreground">{selectedList.name}</h2>
                    <span className="text-sm text-muted-foreground">({selectedList.wordIds.length} items)</span>
                  </div>
                </div>
                <button
                  onClick={() => handleListDelete(selectedList.id)}
                  className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
                >
                  Delete List
                </button>
              </div>

              {/* List Items */}
              {listWords.length > 0 || listKanji.length > 0 ? (
                <div className="space-y-4 mb-32 md:mb-8">
                  {/* Words */}
                  {listWords.map((word) => (
                    <WordCard
                      key={word.id}
                      word={word}
                      onWordClick={() => setSelectedWord(word)}
                      onRemoveClick={() => handleWordRemoveFromList(word.id)}
                      showRemoveButton={true}
                    />
                  ))}

                  {/* Kanji */}
                  {listKanji.map((kanji) => (
                    <KanjiCard
                      key={kanji.kanji}
                      kanji={kanji}
                      onKanjiClick={() => { }}
                      onRemoveClick={() => handleKanjiRemoveFromList(kanji.kanji)}
                      showRemoveButton={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-muted-foreground">No items in this list yet</p>
                </div>
              )}
            </>
          )
        ) : activeTab === 'articles' ? (
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
                    {categories.map((category, idx) => (
                      <option key={category || idx} value={category}>
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
                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
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
                          onClick={() => setPendingDeleteArticleId(article.contentId)}
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
                        Bookmarked {article.bookmarkedAt?.toLocaleDateString?.() || ''}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <a
                          href={`/news/${article.contentId}`}
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
        ) : (
          storiesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your bookmarked stories...</p>
            </div>
          ) : bookmarkedStories.length === 0 ? (
            // Empty State for Stories
            <div className="text-center max-w-md mx-auto py-12">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                No Bookmarked Stories Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start reading AI-generated Japanese stories and bookmark the ones you want to revisit later.
                {!isPremium && ` Free users can bookmark up to 5 stories.`}
              </p>
              <a
                href="/stories"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                📖 Browse Stories
              </a>
            </div>
          ) : (
            <>
              {/* Story Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{bookmarkedStories.length}</div>
                  <div className="text-xs text-muted-foreground">Total Bookmarked</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500 mb-1">{themes.length}</div>
                  <div className="text-xs text-muted-foreground">Themes</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-500 mb-1">
                    {isPremium ? '∞' : Math.max(0, 5 - bookmarkedStories.length)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isPremium ? 'Unlimited' : 'Remaining'}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-500 mb-1">
                    {Math.round(bookmarkedStories.reduce((sum, story) => sum + (story.readingProgress || 0), 0) / bookmarkedStories.length)}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Progress %</div>
                </div>
              </div>

              {/* Story Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Filter by Theme */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Filter by Theme
                  </label>
                  <select
                    value={storyFilterTheme}
                    onChange={(e) => setStoryFilterTheme(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">All Themes ({bookmarkedStories.length})</option>
                    {themes.map((theme, idx) => (
                      <option key={theme || idx} value={theme}>
                        {theme} ({bookmarkedStories.filter(s => (s.originalContent?.theme || 'Unknown') === theme).length})
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
                    value={storySortBy}
                    onChange={(e) => setStorySortBy(e.target.value as 'recent' | 'title' | 'theme')}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="recent">Recently Bookmarked</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="theme">Theme</option>
                  </select>
                </div>

                {/* Clear All Button */}
                <div className="flex items-end">
                  <button
                    onClick={clearAllSaved}
                    className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
                  >
                    Clear All Stories
                  </button>
                </div>
              </div>

              {/* Stories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32 md:mb-8 pb-safe">
                {filteredAndSortedStories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    {/* Story Content */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground line-clamp-2 flex-1">
                          {story.contentTitle}
                        </h3>
                        <button
                          onClick={() => setPendingDeleteStoryId(story.contentId)}
                          className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                          title="Remove bookmark"
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Story Metadata */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                          {story.originalContent?.theme || 'Unknown'}
                        </span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded">
                          {story.contentDifficulty}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                          {story.readingProgress || 0}% read
                        </span>
                      </div>

                      {/* Bookmark Date */}
                      <div className="text-xs text-muted-foreground">
                        Bookmarked {story.bookmarkedAt?.toLocaleDateString?.() || ''}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <a
                          href={`/stories/${story.contentId}`}
                          className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded text-sm text-center hover:bg-primary/90 transition-colors"
                        >
                          📖 Read Story
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No results after filtering */}
              {filteredAndSortedStories.length === 0 && bookmarkedStories.length > 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No stories found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filter settings to see more results.
                  </p>
                </div>
              )}
            </>
          )
        )}

        {/* Word Detail Modal */}
        {selectedWord && (
          <WordModal
            word={selectedWord}
            onClose={() => setSelectedWord(null)}
          />
        )}

        {/* Create List Modal */}
        {showCreateListModal && (
          <CreateListModal
            onClose={() => setShowCreateListModal(false)}
            onCreated={loadWordLists}
          />
        )}

        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          loading={confirmDialog.loading}
        />

        {/* Add a ConfirmationDialog for single article delete */}
        <ConfirmationDialog
          isOpen={!!pendingDeleteArticleId}
          title="Remove Article Bookmark"
          message="Are you sure you want to remove this article from your saved items? This action cannot be undone."
          confirmText="Remove"
          cancelText="Cancel"
          isDestructive={true}
          onConfirm={async () => {
            if (pendingDeleteArticleId) {
              await handleArticleRemove(pendingDeleteArticleId);
              setPendingDeleteArticleId(null);
            }
          }}
          onCancel={() => setPendingDeleteArticleId(null)}
          loading={false}
        />

        {/* Add ConfirmationDialog for single story delete */}
        <ConfirmationDialog
          isOpen={!!pendingDeleteStoryId}
          title="Remove Story Bookmark"
          message={singleStoryDeleteError ? singleStoryDeleteError : "Are you sure you want to remove this story from your saved items? This action cannot be undone."}
          confirmText="Remove"
          cancelText="Cancel"
          isDestructive={true}
          onConfirm={async () => {
            if (pendingDeleteStoryId) {
              setSingleStoryDeleteLoading(true);
              setSingleStoryDeleteError(null);
              try {
                await handleStoryRemove(pendingDeleteStoryId);
                setPendingDeleteStoryId(null);
              } catch (error) {
                setSingleStoryDeleteError('Failed to remove the story bookmark. Please try again.');
              } finally {
                setSingleStoryDeleteLoading(false);
              }
            }
          }}
          onCancel={() => {
            setPendingDeleteStoryId(null);
            setSingleStoryDeleteError(null);
          }}
          loading={singleStoryDeleteLoading}
        />

        {/* Add error message display in the return JSX */}
        {errorMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded shadow z-50">
            {errorMessage}
            <button className="ml-4 underline" onClick={() => setErrorMessage(null)}>Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Component definitions
interface WordCardProps {
  word: JapaneseWord;
  onWordClick: () => void;
  onRemoveClick?: () => void;
  showRemoveButton?: boolean;
}

function WordCard({ word, onWordClick, onRemoveClick, showRemoveButton }: WordCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Ichidan':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Godan':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Irregular':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'i-adjective':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'na-adjective':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div
      onClick={onWordClick}
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground">{word.word}</h3>
            <span className="text-sm text-muted-foreground">{word.reading}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{word.meaning}</p>
          {word.type && (
            <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getTypeColor(word.type)}`}>
              {word.type}
            </span>
          )}
        </div>
        {showRemoveButton && onRemoveClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick();
            }}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Remove from list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface KanjiCardProps {
  kanji: Kanji;
  onKanjiClick: () => void;
  onRemoveClick?: () => void;
  showRemoveButton?: boolean;
}

function KanjiCard({ kanji, onKanjiClick, onRemoveClick, showRemoveButton }: KanjiCardProps) {
  return (
    <div
      onClick={onKanjiClick}
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="text-3xl font-semibold text-foreground">{kanji.kanji}</div>
            <div>
              <div className="text-sm text-muted-foreground">
                {kanji.on && kanji.on.length > 0 && <div>On: {kanji.on.join(', ')}</div>}
                {kanji.kun && kanji.kun.length > 0 && <div>Kun: {kanji.kun.join(', ')}</div>}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{kanji.meaning}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block px-2 py-1 text-xs rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20">
              Kanji
            </span>
            {kanji.jlpt && (
              <span className="text-xs text-muted-foreground">{kanji.jlpt}</span>
            )}
          </div>
        </div>
        {showRemoveButton && onRemoveClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick();
            }}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Remove from list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface WordModalProps {
  word: JapaneseWord;
  onClose: () => void;
}

function WordModal({ word, onClose }: WordModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">{word.word}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Reading</p>
            <p className="text-lg">{word.reading}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Meaning</p>
            <p className="text-lg">{word.meaning}</p>
          </div>

          {word.type && (
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="text-lg">{word.type}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CreateListModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateListModal({ onClose, onCreated }: CreateListModalProps) {
  const { user } = useAuth();
  const { userSubscription } = useSubscription();
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!listName.trim()) return;

    try {
      setCreating(true);
      await StudyListManager.createStudyList(
        listName,
        'flashcard', // Default to flashcard type for simple word lists
        description,
        user,
        userSubscription?.subscription?.status
      );
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating list:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Create New List</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., JLPT N5 Verbs, Cooking Terms"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this list..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!listName.trim() || creating}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
}
