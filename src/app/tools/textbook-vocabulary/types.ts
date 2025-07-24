export interface VocabularyItem {
  id: string;
  japanese: string;
  reading: string;
  meaning: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null;
  partOfSpeech: string[];
  examples: {
    japanese: string;
    reading: string;
    english: string;
  }[];
  audioFile?: string;
  tags: string[];
  lesson: number;
  textbook: string;
  frequency?: number;
  notes?: string;
}

export interface ProgressData {
  wordId: string;
  level: number;          // 1-5 mastery level
  lastReview: Date;
  nextReview: Date;
  correctCount: number;
  totalReviews: number;
}

export interface FilterOptions {
  jlptLevel: string | null;
  theme: string | null;
  searchQuery: string;
  partOfSpeech: string | null;
}

export interface TextbookMetadata {
  title: string;
  subtitle?: string;
  totalCards: number;
  lessons: number[];
  jlptLevels: string[];
  description?: string;
  color?: {
    primary: string;
    secondary: string;
    gradient: string;
  };
}