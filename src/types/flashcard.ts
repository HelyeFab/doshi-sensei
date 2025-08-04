import { JapaneseWord } from './index';

// Anki card structure when used in flashcards
export interface AnkiFlashcardItem {
  id: string;
  itemType: 'anki_card';
  ankiData?: {
    originalId: string;
    deckName: string;
    cardType: 'basic' | 'cloze' | 'reverse';
    front: string;
    back: string;
    tags: string[];
    media: string[];
    fields?: string[];
    rawFront?: string;
    rawBack?: string;
    srsData: {
      ease: number;
      interval: number;
      reviews: number;
      lapses: number;
      lastReviewed?: string;
      due?: string;
      state: 'new' | 'learning' | 'review' | 'relearning';
      step?: number;
      left?: number;
      odue?: number;
      odid?: number;
      flags?: number;
      data?: string;
    };
  };
  // Display properties for compatibility
  kanji: string;  // Maps to front
  kana: string;   // Empty for Anki cards
  meaning: string; // Maps to back
  type: any;      // Type for Anki cards
}

// Union type for flashcard items
export type FlashcardItem = JapaneseWord | AnkiFlashcardItem;

// Type guards
export function isAnkiCard(item: FlashcardItem): item is AnkiFlashcardItem {
  return 'itemType' in item && item.itemType === 'anki_card';
}

export function isJapaneseWord(item: FlashcardItem): item is JapaneseWord {
  return !('itemType' in item) || ('romaji' in item && 'jlpt' in item && 'tags' in item);
}

// Helper to get display text from either type
export function getFlashcardDisplayText(item: FlashcardItem) {
  if (isAnkiCard(item)) {
    return {
      front: item.ankiData?.front || item.kanji || '',
      back: item.ankiData?.back || item.meaning || '',
      type: 'anki',
      tags: item.ankiData?.tags || []
    };
  } else {
    return {
      front: item.kanji || item.kana,
      back: item.meaning,
      type: item.type,
      tags: item.tags
    };
  }
}

// Helper to create a minimal JapaneseWord from Anki card for compatibility
export function ankiToMinimalWord(anki: AnkiFlashcardItem): JapaneseWord {
  return {
    id: anki.id,
    kanji: anki.kanji || anki.ankiData?.front || '',
    kana: anki.kana || '',
    romaji: '', // No romaji for Anki cards
    meaning: anki.meaning || anki.ankiData?.back || '',
    type: 'other' as const,
    jlpt: 'N5' as const, // Default JLPT level
    tags: anki.ankiData?.tags || []
  };
}