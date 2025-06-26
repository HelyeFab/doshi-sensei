import { MoodBoard, MoodBoardImport, KanjiItem, KanjiImportItem } from '@/types/moodBoard';

/**
 * Converts a MoodBoardImport (JSON format) to internal MoodBoard format
 */
export function convertImportToMoodBoard(importData: MoodBoardImport): Omit<MoodBoard, 'id' | 'createdAt'> {
  // Generate a gradient from the theme color
  const background = `linear-gradient(135deg, ${importData.themeColor} 0%, ${importData.themeColor}88 100%)`;
  
  // Convert kanji items
  const kanji: KanjiItem[] = importData.kanjiList.map(item => convertKanjiItem(item));
  
  // Determine JLPT level - use the most common level from kanji if not specified
  let jlpt = importData.jlptLevel || 'N5';
  if (!importData.jlptLevel && kanji.length > 0) {
    const levels = importData.kanjiList.map(k => k.jlptLevel);
    jlpt = getMostCommonLevel(levels) || 'N5';
  }
  
  return {
    title: importData.category,
    emoji: importData.emoji || getDefaultEmoji(importData.category),
    jlpt,
    background,
    description: importData.description,
    kanji,
    isActive: true,
    sortOrder: 0,
    createdBy: 'admin'
  };
}

/**
 * Converts a KanjiImportItem to internal KanjiItem format
 */
function convertKanjiItem(item: KanjiImportItem): KanjiItem {
  // Since the import format doesn't separate on/kun readings,
  // we'll use the kana as kun reading
  const readings = {
    on: [], // Could be populated from a dictionary in the future
    kun: [item.kana]
  };
  
  // Convert examples to simple string array (just sentences)
  const examples = item.examples.map(ex => ex.sentence);
  
  // Convert JLPT level to difficulty (1-5)
  const difficulty = jlptToDifficulty(item.jlptLevel);
  
  return {
    char: item.kanji,
    meaning: item.meaning,
    readings,
    examples,
    difficulty
  };
}

/**
 * Convert JLPT level to difficulty scale (1-5)
 */
function jlptToDifficulty(level: string): number {
  switch (level) {
    case 'N5': return 1;
    case 'N4': return 2;
    case 'N3': return 3;
    case 'N2': return 4;
    case 'N1': return 5;
    default: return 1;
  }
}

/**
 * Get the most common JLPT level from an array
 */
function getMostCommonLevel(levels: string[]): 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null {
  if (levels.length === 0) return null;
  
  const counts = levels.reduce((acc, level) => {
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommon = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)[0][0];
    
  return mostCommon as 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
}

/**
 * Get a default emoji based on category name
 */
function getDefaultEmoji(category: string): string {
  const lowerCategory = category.toLowerCase();
  
  const emojiMap: Record<string, string> = {
    'colors': '🎨',
    'nature': '🌸',
    'animals': '🐱',
    'family': '👨‍👩‍👧‍👦',
    'food': '🍜',
    'transportation': '🚗',
    'time': '⏰',
    'school': '🎒',
    'body': '👤',
    'weather': '☀️',
    'places': '🏠',
    'numbers': '🔢',
    'emotions': '😊',
    'verbs': '🏃',
    'adjectives': '📝'
  };
  
  // Try to find a matching emoji
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerCategory.includes(key)) {
      return emoji;
    }
  }
  
  // Default emoji if no match
  return '📚';
}

/**
 * Validate import data structure
 */
export function validateMoodBoardImport(data: any): data is MoodBoardImport {
  if (!data || typeof data !== 'object') return false;
  
  // Required fields
  if (!data.category || typeof data.category !== 'string') return false;
  if (!data.themeColor || typeof data.themeColor !== 'string') return false;
  if (!data.description || typeof data.description !== 'string') return false;
  if (!Array.isArray(data.kanjiList)) return false;
  
  // Validate each kanji item
  return data.kanjiList.every((item: any) => {
    if (!item || typeof item !== 'object') return false;
    if (!item.kanji || typeof item.kanji !== 'string') return false;
    if (!item.kana || typeof item.kana !== 'string') return false;
    if (!item.meaning || typeof item.meaning !== 'string') return false;
    if (!item.jlptLevel || !['N5', 'N4', 'N3', 'N2', 'N1'].includes(item.jlptLevel)) return false;
    if (!Array.isArray(item.examples)) return false;
    
    // Validate examples
    return item.examples.every((ex: any) => 
      ex && typeof ex === 'object' &&
      typeof ex.sentence === 'string' &&
      typeof ex.translation === 'string'
    );
  });
}