// News System Type Definitions for Doshi Sensei
import { JLPTLevel, JapaneseWord, Kanji } from './index';

// Core News Article Interface
export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  url: string;
  imageUrl?: string;
  publishDate: Date;
  scrapedAt: Date;
  source: ArticleSource;
  category: string;
  tags: string[];
  difficulty: JLPTLevel;
  estimatedReadingTime: number;
  vocabulary: ExtractedVocabulary[];
  kanji: ExtractedKanji[];
  isBookmarked?: boolean;
  readingProgress?: number; // 0-100 percentage
  
  // Article Management Fields
  expiresAt?: Date; // Auto-delete after 60 days
  isArchived?: boolean; // Moved to cold storage
  bookmarkedBy?: string[]; // User IDs who bookmarked this
  viewCount?: number; // How many times viewed
  lastViewedAt?: Date; // Last view timestamp
}

// Simplified source for articles
export interface ArticleSource {
  id: string;
  name: string;
  displayName: string;
}

// Full News Source Configuration
export interface NewsSource {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  hasRuby: boolean; // Has furigana support
  isActive: boolean;
  scrapingConfig: ScrapingConfig;
  rateLimit: RateLimitConfig;
}

// Scraping Configuration
export interface ScrapingConfig {
  listPageUrl: string;
  listItemSelector: string;
  articleSelectors: {
    title: string;
    content: string;
    date: string;
    category?: string;
    image?: string;
    tags?: string;
  };
  excludeSelectors?: string[]; // Elements to remove before processing
  waitForSelector?: string; // Wait for this element before scraping
  userAgent?: string;
}

// Rate Limiting Configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  cooldownSeconds: number;
}

// Extracted Content Interfaces
export interface ExtractedVocabulary {
  word: string;
  reading: string;
  position: number;
  length: number;
  isKnown: boolean;
  definition?: string;
  jlptLevel?: JLPTLevel;
  frequency?: number;
}

export interface ExtractedKanji {
  kanji: string;
  position: number;
  meaning?: string;
  readings?: string[];
  jlptLevel?: JLPTLevel;
  isKnown?: boolean;
}

// Reading Progress Tracking
export interface ReadingProgress {
  id: string;
  articleId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  scrollProgress: number; // 0-100 percentage
  readingTime: number; // Total time spent reading in seconds
  vocabularyEncountered: string[];
  kanjiEncountered: string[];
  wordsLookedUp: string[];
  completed: boolean;
  comprehensionScore?: number; // If quiz taken
  createdAt: Date;
  updatedAt: Date;
}

// Article Bookmarks
export interface ArticleBookmark {
  id: string;
  articleId: string;
  userId: string;
  title: string;
  snippet: string;
  bookmarkedAt: Date;
  tags: string[];
  notes?: string;
}

// Reading Session
export interface ReadingSession {
  id: string;
  userId: string;
  articleIds: string[];
  startTime: Date;
  endTime?: Date;
  totalReadingTime: number;
  articlesCompleted: number;
  vocabularyLearned: string[];
  sessionType: 'casual' | 'study' | 'review';
  averageComprehension?: number;
}

// Cached News Data
export interface CachedNewsData {
  id: string;
  sourceId: string;
  articles: NewsArticle[];
  cacheDate: Date;
  expiryDate: Date;
  totalArticles: number;
  lastScrapedUrl?: string;
}

// Scraping Result
export interface ScrapingResult {
  success: boolean;
  articlesScraped: number;
  errors: ScrapingError[];
  timeElapsed: number;
  nextScrapingTime?: Date;
  source: string;
  fallbackUsed?: boolean; // Indicates if mock data was used as fallback
}

export interface ScrapingError {
  type: 'network' | 'parsing' | 'rate-limit' | 'unknown';
  message: string;
  url?: string;
  timestamp: Date;
  retry?: boolean;
}

// News Search and Filtering
export interface NewsSearchOptions {
  query?: string;
  sources?: string[];
  categories?: string[];
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  jlptLevels?: JLPTLevel[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasImage?: boolean;
  readingTimeRange?: {
    min: number; // minutes
    max: number; // minutes
  };
  sortBy?: 'date' | 'difficulty' | 'readingTime' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface NewsSearchResult {
  articles: NewsArticle[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
  filters: NewsSearchOptions;
}

// News Categories
export interface NewsCategory {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

// Vocabulary Analysis Result
export interface VocabularyAnalysis {
  totalWords: number;
  uniqueWords: number;
  knownWords: number;
  unknownWords: number;
  jlptDistribution: {
    [key in JLPTLevel]: number;
  };
  difficultyScore: number; // 0-100
  recommendedLevel: JLPTLevel;
  vocabularyCoverage: number; // Percentage of known words
}

// News Statistics
export interface NewsStatistics {
  totalArticlesRead: number;
  totalReadingTime: number; // in minutes
  averageReadingSpeed: number; // words per minute
  vocabularyLearned: number;
  kanjiEncountered: number;
  favoriteCategories: string[];
  readingStreak: number; // days
  comprehensionAverage: number;
  lastReadingDate?: Date;
  monthlyProgress: {
    month: string;
    articlesRead: number;
    timeSpent: number;
  }[];
}

// News API Response Types
export interface NewsAPIResponse {
  success: boolean;
  data?: NewsArticle[] | NewsArticle;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    scrapedAt: Date;
    source: string;
    cached: boolean;
  };
}

// News Feed Configuration
export interface NewsFeedConfig {
  sources: string[];
  categories: string[];
  maxArticlesPerSource: number;
  refreshInterval: number; // minutes
  enableAutoRefresh: boolean;
  preferredDifficulty: ('beginner' | 'intermediate' | 'advanced')[];
  hideReadArticles: boolean;
  showImages: boolean;
}

// Reading Preferences
export interface ReadingPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  fontFamily: 'system' | 'serif' | 'sans-serif';
  showFurigana: boolean;
  highlightVocabulary: boolean;
  autoPlayAudio: boolean;
  darkMode: boolean;
  showTranslations: boolean;
  vocabularyPopups: boolean;
}

// Notification Settings for News
export interface NewsNotificationSettings {
  enableBreakingNews: boolean;
  enableDailyDigest: boolean;
  enableReadingReminders: boolean;
  digestTime: string; // HH:MM format
  reminderFrequency: 'daily' | 'weekly' | 'custom';
  customReminderDays: number[];
  categories: string[];
  sources: string[];
}

// Export all news-related constants
export const NEWS_SOURCES = {
  NHK_EASY: 'nhk-easy',
  YAHOO_JAPAN: 'yahoo-japan',
  ASAHI_SHIMBUN: 'asahi-shimbun',
  MAINICHI_SHIMBUN: 'mainichi-shimbun'
} as const;

export const NEWS_CATEGORIES = {
  GENERAL: 'general',
  POLITICS: 'politics',
  ECONOMICS: 'economics',
  SOCIETY: 'society',
  INTERNATIONAL: 'international',
  SPORTS: 'sports',
  CULTURE: 'culture',
  TECHNOLOGY: 'technology',
  WEATHER: 'weather',
  DISASTER: 'disaster'
} as const;

export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
} as const;

export type NewsSourceId = typeof NEWS_SOURCES[keyof typeof NEWS_SOURCES];
export type NewsCategoryId = typeof NEWS_CATEGORIES[keyof typeof NEWS_CATEGORIES];
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

// User Bookmark System
export interface UserBookmark {
  id: string;
  userId: string;
  articleId: string;
  articleTitle: string;
  articleDifficulty: JLPTLevel;
  bookmarkedAt: Date;
  readingProgress?: number;
  notes?: string;
}

// Article Pagination
export interface ArticlePaginationOptions {
  page: number;
  limit: number;
  difficulty?: JLPTLevel[];
  category?: string[];
  source?: string[];
  sortBy?: 'publishDate' | 'scrapedAt' | 'difficulty' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ArticlePaginationResult {
  articles: NewsArticle[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Article Management Configuration
export interface ArticleManagementConfig {
  maxArticlesPerSource: number;
  expirationDays: number;
  freeUserBookmarkLimit: number;
  premiumUserBookmarkLimit: number;
  archiveAfterDays: number;
  cleanupIntervalHours: number;
}

// Article Statistics
export interface ArticleStats {
  totalArticles: number;
  articlesByDifficulty: Record<JLPTLevel, number>;
  articlesBySource: Record<string, number>;
  articlesByCategory: Record<string, number>;
  averageReadingTime: number;
  totalBookmarks: number;
  expiringSoon: number; // Articles expiring in next 7 days
}
