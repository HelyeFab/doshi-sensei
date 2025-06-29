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
}

export interface StoryProgress {
  storyId: string;
  userId: string;
  currentPage: number;
  completed: boolean;
  completedAt?: Date;
  quizScore?: number;
  quizAttempts: number;
  savedWords: string[];
  lastReadAt: Date;
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