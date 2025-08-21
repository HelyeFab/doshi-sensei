import { JLPTLevel } from './kanji';

export interface StoryPage {
  pageNumber: number;
  imageUrl: string;
  imageAlt?: string;
  text: string; // Japanese text with ruby tags
  translation: string; // English translation
}

export interface StoryQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Story {
  id: string;
  title: string;
  titleJa: string; // Japanese title with furigana
  description: string;
  jlptLevel: JLPTLevel;
  theme: string;
  tags: string[];
  coverImageUrl: string;
  pages: StoryPage[];
  quiz: StoryQuizQuestion[];

  // Metadata
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  status: 'draft' | 'published' | 'archived';

  // Stats
  viewCount: number;
  completionCount: number;
  averageQuizScore?: number;

  // SEO
  slug: string;
  seoTitle?: string;
  seoDescription?: string;

  // Mood Board Reference (optional)
  moodBoardId?: string;
  moodBoardTitle?: string;
  moodBoardKanji?: string[];
}

// Enhanced Story Progress (extends unified ReadingProgress)
export interface StoryProgress {
  storyId: string;
  userId: string;
  currentPage: number;
  totalPages?: number; // Optional - total number of pages
  lastReadSection?: string; // Optional - last read section identifier
  completed: boolean;
  completedAt?: Date;
  quizScore?: number;
  quizAttempts: number;
  savedWords: string[];
  lastReadAt: Date;
  progress: number; // 0-100 percentage
  timeSpent: number; // Total time spent reading in seconds
  quizScores?: number[]; // Multiple quiz attempts
  vocabularyLearned?: string[];
  updatedAt: Date;
}

// Story Bookmark interface (extends unified UserBookmark)
export interface StoryBookmark {
  id: string;
  userId: string;
  storyId: string;
  storyTitle: string;
  storyDifficulty: JLPTLevel;
  bookmarkedAt: Date;
  lastReadAt?: Date;
  readingProgress: number; // 0-100 progress
  notes?: string;
  tags?: string[];
  isFavorite: boolean;
  syncStatus: 'local' | 'synced' | 'pending';
  originalContent?: any; // Story snapshot for offline access
  updatedAt: Date;
}

export interface StoryStats {
  totalStoriesRead: number;
  storiesReadToday: number;
  lastStoryDate: string;
  favoriteThemes: string[];
  averageQuizScore: number;
  savedWordsFromStories: number;
}

// Story themes
export const STORY_THEMES = [
  'Adventure',
  'School Life',
  'Traditional Culture',
  'Modern Life',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Slice of Life',
  'Historical',
  'Comedy'
] as const;

export type StoryTheme = typeof STORY_THEMES[number];

// Story tags for more specific categorization
export const STORY_TAGS = [
  'animals',
  'food',
  'travel',
  'friendship',
  'family',
  'work',
  'sports',
  'music',
  'art',
  'nature',
  'technology',
  'folklore',
  'seasons',
  'festivals',
  'daily-life'
] as const;

export type StoryTag = typeof STORY_TAGS[number];