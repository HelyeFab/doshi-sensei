// Define a base interface for all learning items
interface BaseLearningItem {
  id: string; // Unique identifier for the item
  itemType: 'vocabulary' | 'kanji' | 'hiragana' | 'katakana' | 'custom'; // Type of learning item
  text: string; // Primary display text (e.g., Kanji, Hiragana character)
  reading: string; // Reading (e.g., Furigana, Romaji)
  meaning: string; // Definition or translation
  audioFile?: string; // Path to audio pronunciation
  tags?: string[]; // For categorization or filtering
  notes?: string; // Additional notes
}

// Specific types extending BaseLearningItem
export interface VocabularyItem extends BaseLearningItem {
  itemType: 'vocabulary';
  text: string; // Japanese word
  reading: string; // Kana reading
  meaning: string; // English meaning
  examples?: {
    japanese: string;
    reading: string;
    english: string;
  }[];
  // Textbook-specific fields (can be optional or removed if not applicable)
  lesson?: number;
  textbook?: string;
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null;
  frequency?: number;
}

export interface KanjiItem extends BaseLearningItem {
  itemType: 'kanji';
  text: string; // Kanji character
  reading: string; // Onyomi/Kunyomi readings
  meaning: string; // English meaning
  examples?: {
    japanese: string;
    reading: string;
    english: string;
  }[];
  // Add Kanji-specific fields if needed, e.g., stroke count, radicals
  strokeCount?: number;
  radicals?: string[];
}

export interface CharacterItem extends BaseLearningItem {
  itemType: 'hiragana' | 'katakana';
  text: string; // The character itself
  reading: string; // Romaji or name of the character
  meaning: string; // e.g., "A", "I", "Ka"
  // No specific fields needed for basic characters
}

// Union type for all learning items
export type LearningItem = VocabularyItem | KanjiItem | CharacterItem;

// --- Adapting existing types ---

// Progress data can be generalized by using itemId
export interface ProgressData {
  itemId: string; // References LearningItem.id
  itemType: LearningItem['itemType']; // To know which type of item it is
  level: number;          // 1-5 mastery level
  lastReview: Date;
  nextReview: Date;
  correctCount: number;
  totalReviews: number;
  // Add any itemType-specific progress data if necessary, or handle it in specific services
}

// Filter options need to be more flexible
export interface FilterOptions {
  itemType?: LearningItem['itemType']; // Filter by type
  textbook?: string; // Keep for vocabulary, but might be optional
  lesson?: number; // Keep for vocabulary, but might be optional
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null; // Keep for vocabulary, but might be optional
  tags?: string[]; // General tags for filtering
  searchQuery: string;
  partOfSpeech?: string | string[]; // Keep for vocabulary, but might be optional
  // Add other filters as needed for different item types
}

// Data source metadata could be a more general concept
export interface DataSourceMetadata {
  id: string; // e.g., 'genki-1', 'kanji-n5', 'hiragana-chart'
  name: string;
  description?: string;
  itemTypes: LearningItem['itemType'][]; // What types of items this source provides
  // Textbook-specific metadata (optional)
  totalLessons?: number; // Total number of lessons available in this source (e.g., for textbooks)
  lessons?: number[]; // Array of available lesson numbers
  jlptLevels?: ('N5' | 'N4' | 'N3' | 'N2' | 'N1')[]; // JLPT levels covered by this source
  // Other metadata relevant to the source
  commonTags?: string[];
  color?: {
    primary: string;
    secondary: string;
    gradient: string;
  };
}