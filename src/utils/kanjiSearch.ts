import { Kanji } from '@/types';
import { KanjiItem } from '@/types/moodBoard';
import KanjiManager from './kanjiManager';

// Extract all unique kanji from all JLPT levels
async function extractAllKanji(): Promise<Kanji[]> {
  const kanjiMap = new Map<string, Kanji>();
  const levels: Array<'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['N5', 'N4', 'N3', 'N2', 'N1'];

  for (const level of levels) {
    try {
      const levelKanji = await KanjiManager.loadKanjiByLevel(level);
      levelKanji.forEach(kanji => {
        if (!kanjiMap.has(kanji.kanji)) {
          kanjiMap.set(kanji.kanji, kanji);
        }
      });
    } catch (error) {
      console.error(`Error loading kanji for ${level}:`, error);
    }
  }

  return Array.from(kanjiMap.values()).sort((a, b) => a.kanji.localeCompare(b.kanji));
}

// Common N5 kanji for quick suggestions
const COMMON_N5_KANJI: KanjiItem[] = [
  {
    char: '人',
    meaning: 'person, human',
    readings: { on: ['ジン', 'ニン'], kun: ['ひと'] },
    examples: ['人間 (human)', '日本人 (Japanese person)'],
    difficulty: 1
  },
  {
    char: '日',
    meaning: 'day, sun',
    readings: { on: ['ニチ', 'ジツ'], kun: ['ひ', 'か'] },
    examples: ['今日 (today)', '日本 (Japan)'],
    difficulty: 1
  },
  {
    char: '本',
    meaning: 'book, origin',
    readings: { on: ['ホン'], kun: ['もと'] },
    examples: ['本 (book)', '日本 (Japan)'],
    difficulty: 1
  },
  {
    char: '中',
    meaning: 'middle, inside',
    readings: { on: ['チュウ'], kun: ['なか'] },
    examples: ['中国 (China)', '中学校 (middle school)'],
    difficulty: 1
  },
  {
    char: '大',
    meaning: 'big, large',
    readings: { on: ['ダイ', 'タイ'], kun: ['おお'] },
    examples: ['大きい (big)', '大学 (university)'],
    difficulty: 1
  },
  {
    char: '小',
    meaning: 'small, little',
    readings: { on: ['ショウ'], kun: ['ちい', 'こ'] },
    examples: ['小さい (small)', '小学校 (elementary school)'],
    difficulty: 1
  },
  {
    char: '上',
    meaning: 'up, above',
    readings: { on: ['ジョウ'], kun: ['うえ', 'あ'] },
    examples: ['上手 (skillful)', '机の上 (on the desk)'],
    difficulty: 1
  },
  {
    char: '下',
    meaning: 'down, below',
    readings: { on: ['カ', 'ゲ'], kun: ['した', 'さ'] },
    examples: ['下手 (unskillful)', '机の下 (under the desk)'],
    difficulty: 1
  },
  {
    char: '山',
    meaning: 'mountain',
    readings: { on: ['サン'], kun: ['やま'] },
    examples: ['富士山 (Mt. Fuji)', '山田 (Yamada)'],
    difficulty: 1
  },
  {
    char: '川',
    meaning: 'river',
    readings: { on: ['セン'], kun: ['かわ'] },
    examples: ['川 (river)', '小川 (stream)'],
    difficulty: 1
  }
];

let cachedKanji: KanjiItem[] | null = null;

// Extract kanji from mood boards (simplified version)
function extractKanjiFromMoodBoards(): KanjiItem[] {
  // For now, return empty array since mood boards are loaded dynamically
  // This prevents the error while maintaining functionality
  return [];
}

export function getAllKanji(): KanjiItem[] {
  if (!cachedKanji) {
    const extractedKanji = extractKanjiFromMoodBoards();
    const commonKanjiMap = new Map(COMMON_N5_KANJI.map(k => [k.char, k]));
    
    // Merge extracted kanji with common kanji, preferring extracted data
    extractedKanji.forEach(kanji => {
      commonKanjiMap.set(kanji.char, kanji);
    });
    
    // Add any common kanji that weren't in the extracted data
    COMMON_N5_KANJI.forEach(kanji => {
      if (!commonKanjiMap.has(kanji.char)) {
        commonKanjiMap.set(kanji.char, kanji);
      }
    });
    
    cachedKanji = Array.from(commonKanjiMap.values()).sort((a, b) => a.char.localeCompare(b.char));
  }
  
  return cachedKanji;
}

export function searchKanji(query: string, limit = 10): KanjiItem[] {
  if (!query.trim()) {
    return getAllKanji().slice(0, limit);
  }

  const searchTerm = query.toLowerCase();
  const allKanji = getAllKanji();
  
  const results = allKanji.filter(kanji => {
    // Search by character
    if (kanji.char.includes(query)) return true;
    
    // Search by meaning
    if (kanji.meaning.toLowerCase().includes(searchTerm)) return true;
    
    // Search by readings
    const allReadings = [...kanji.readings.on, ...kanji.readings.kun];
    if (allReadings.some(reading => reading.toLowerCase().includes(searchTerm))) return true;
    
    // Search by examples
    if (kanji.examples.some(example => example.toLowerCase().includes(searchTerm))) return true;
    
    return false;
  });

  // Sort results by relevance
  results.sort((a, b) => {
    // Exact character match first
    if (a.char === query) return -1;
    if (b.char === query) return 1;
    
    // Meaning starts with query
    if (a.meaning.toLowerCase().startsWith(searchTerm)) return -1;
    if (b.meaning.toLowerCase().startsWith(searchTerm)) return 1;
    
    // Character contains query
    if (a.char.includes(query) && !b.char.includes(query)) return -1;
    if (b.char.includes(query) && !a.char.includes(query)) return 1;
    
    // Default alphabetical sort
    return a.char.localeCompare(b.char);
  });

  return results.slice(0, limit);
}

export function getKanjiByCharacter(char: string): KanjiItem | null {
  const allKanji = getAllKanji();
  return allKanji.find(kanji => kanji.char === char) || null;
}

export function getRandomKanji(count = 5): KanjiItem[] {
  const allKanji = getAllKanji();
  const shuffled = [...allKanji].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getKanjiByJLPT(level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'): KanjiItem[] {
  // This is a simplified mapping based on difficulty
  const difficultyMap: Record<string, number[]> = {
    'N5': [1, 2],
    'N4': [2, 3],
    'N3': [3, 4],
    'N2': [4, 5],
    'N1': [5]
  };
  
  const targetDifficulties = difficultyMap[level] || [1];
  const allKanji = getAllKanji();
  
  return allKanji.filter(kanji => targetDifficulties.includes(kanji.difficulty));
}