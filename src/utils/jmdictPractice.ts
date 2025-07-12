import { JapaneseWord, JLPTLevel } from '@/types';

// Priority tags indicating common usage - higher weight for more common tags
const PRIORITY_SCORES: Record<string, number> = {
  'news1': 500,
  'ichi1': 400,
  'spec1': 300,
  'gai1': 200,
  'news2': 150,
  'ichi2': 120,
  'spec2': 100,
  'gai2': 80,
  'nf01': 70, 'nf02': 65, 'nf03': 60, 'nf04': 55, 'nf05': 50,
  'nf06': 45, 'nf07': 40, 'nf08': 35, 'nf09': 30, 'nf10': 25
};

// JMdict-simplified types
interface JMdictWord {
  id: string;
  kanji: Array<{
    common: boolean;
    text: string;
    tags: string[];
  }>;
  kana: Array<{
    common: boolean;
    text: string;
    tags: string[];
    appliesToKanji: string[];
  }>;
  sense: Array<{
    partOfSpeech: string[];
    appliesToKanji: string[];
    appliesToKana: string[];
    gloss: Array<{
      lang: string;
      text: string;
    }>;
  }>;
}

interface JMdict {
  words: JMdictWord[];
}

// Cache for practice words
let practiceVerbsCache: JapaneseWord[] | null = null;
let practiceAdjectivesCache: JapaneseWord[] | null = null;
let jmdictLoaded = false;

/**
 * Get priority score based on tags
 */
function getPriorityScore(tags: string[]): number {
  let maxScore = 0;
  for (const tag of tags) {
    if (PRIORITY_SCORES[tag]) {
      maxScore = Math.max(maxScore, PRIORITY_SCORES[tag]);
    }
  }
  return maxScore;
}

/**
 * Get word length score (prefer simpler words)
 */
function getWordLengthScore(word: JMdictWord): number {
  // Prefer shorter, simpler words
  const kanjiLength = word.kanji[0]?.text?.length || 0;
  const kanaLength = word.kana[0]?.text?.length || 0;
  const minLength = Math.min(kanjiLength || 999, kanaLength || 999);
  
  if (minLength === 1) return 100;
  if (minLength === 2) return 80;
  if (minLength === 3) return 60;
  if (minLength === 4) return 40;
  if (minLength === 5) return 20;
  return 0;
}

/**
 * Calculate commonality score for a word
 */
function getCommonalityScore(word: JMdictWord): number {
  let score = 0;
  
  // Get all tags from kanji and kana entries
  const tags: string[] = [
    ...(word.kanji?.flatMap(k => k.tags || []) || []),
    ...(word.kana?.flatMap(k => k.tags || []) || [])
  ];
  
  // Priority tag score
  score += getPriorityScore(tags);
  
  // Word length score (prefer simpler words)
  score += getWordLengthScore(word);
  
  // Penalty for words with too many senses (likely less common)
  if (word.sense?.length > 5) {
    score -= 50 * (word.sense.length - 5);
  }
  
  // Bonus for common kanji/kana forms
  const hasCommonKanji = word.kanji?.some(k => k.common) || false;
  const hasCommonKana = word.kana?.some(k => k.common) || false;
  if (hasCommonKanji || hasCommonKana) {
    score += 200;
  }
  
  return score;
}

/**
 * Map JMdict part of speech tags to our word types
 */
function mapPartOfSpeechToType(partOfSpeech: string[]): string | null {
  // Check for verb types
  if (partOfSpeech.includes('v1') || partOfSpeech.includes('v1-s')) {
    return 'Ichidan';
  }
  if (partOfSpeech.includes('v5u') || partOfSpeech.includes('v5k') || 
      partOfSpeech.includes('v5g') || partOfSpeech.includes('v5s') || 
      partOfSpeech.includes('v5t') || partOfSpeech.includes('v5n') || 
      partOfSpeech.includes('v5b') || partOfSpeech.includes('v5m') || 
      partOfSpeech.includes('v5r') || partOfSpeech.includes('v5w') ||
      partOfSpeech.includes('v5z') || partOfSpeech.includes('v5aru') ||
      partOfSpeech.includes('v5k-s') || partOfSpeech.includes('v5iku')) {
    return 'Godan';
  }
  if (partOfSpeech.includes('vs-i') || partOfSpeech.includes('vs-s') ||
      partOfSpeech.includes('vk') || partOfSpeech.includes('v-unspec')) {
    return 'Irregular';
  }
  
  // Check for adjective types
  if (partOfSpeech.includes('adj-i') || partOfSpeech.includes('adj-ix')) {
    return 'i-adjective';
  }
  if (partOfSpeech.includes('adj-na') || partOfSpeech.includes('adj-no')) {
    return 'na-adjective';
  }
  
  return null;
}

/**
 * Extract the specific godan ending for conjugation
 */
function getGodanEnding(kanjiText: string, partOfSpeech: string[]): string {
  // Map specific verb type tags to endings
  if (partOfSpeech.includes('v5u')) return 'u';
  if (partOfSpeech.includes('v5k')) return 'ku';
  if (partOfSpeech.includes('v5g')) return 'gu';
  if (partOfSpeech.includes('v5s')) return 'su';
  if (partOfSpeech.includes('v5t')) return 'tsu';
  if (partOfSpeech.includes('v5n')) return 'nu';
  if (partOfSpeech.includes('v5b')) return 'bu';
  if (partOfSpeech.includes('v5m')) return 'mu';
  if (partOfSpeech.includes('v5r')) return 'ru';
  if (partOfSpeech.includes('v5w')) return 'u'; // わ行 verbs
  if (partOfSpeech.includes('v5aru')) return 'ru'; // Special ある verbs
  if (partOfSpeech.includes('v5k-s')) return 'ku'; // Special く verbs
  if (partOfSpeech.includes('v5iku')) return 'ku'; // 行く
  
  // Fallback: try to determine from the last character
  const lastChar = kanjiText[kanjiText.length - 1];
  const endings = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む', 'る'];
  if (endings.includes(lastChar)) {
    return lastChar;
  }
  
  return 'u'; // Default fallback
}

/**
 * Convert JMdict entry to JapaneseWord format
 */
function convertToJapaneseWord(word: JMdictWord): JapaneseWord | null {
  // Get the first sense with English glosses
  const primarySense = word.sense.find(s => s.gloss.some(g => g.lang === 'eng'));
  if (!primarySense) return null;
  
  // Determine word type from part of speech
  const wordType = mapPartOfSpeechToType(primarySense.partOfSpeech);
  if (!wordType) return null;
  
  // Get the most common kanji form or first available
  const kanjiForm = word.kanji.find(k => k.common) || word.kanji[0];
  const kanjiText = kanjiForm?.text || '';
  
  // Get the most common kana form or first available
  const kanaForm = word.kana.find(k => k.common) || word.kana[0];
  const kanaText = kanaForm?.text || '';
  
  // If no kanji form, use kana as the main form
  const mainForm = kanjiText || kanaText;
  const reading = kanjiText ? kanaText : '';
  
  // Get English meanings
  const meanings = primarySense.gloss
    .filter(g => g.lang === 'eng')
    .map(g => g.text)
    .slice(0, 3); // Limit to 3 meanings
  
  // Determine godan ending if applicable
  let godanEnding = '';
  if (wordType === 'Godan' && mainForm) {
    godanEnding = getGodanEnding(mainForm, primarySense.partOfSpeech);
  }
  
  // Calculate commonality score
  const commonalityScore = getCommonalityScore(word);
  
  return {
    id: word.id,
    kanji: mainForm,
    kana: kanaText || mainForm, // Use kana text or fallback to main form
    romaji: '', // Would need romanization library
    meaning: meanings.join('; '),
    english: meanings.join('; '), // Some places expect 'english' property
    type: wordType as JapaneseWord['type'],
    jlpt: 5 as JLPTLevel, // Default, could be enhanced with JLPT data
    tags: [], // Could add tags based on frequency
    word: mainForm, // Keep for backward compatibility
    reading: reading,
    meanings: meanings,
    jlptLevel: 5,
    frequency: commonalityScore, // Use commonality score as frequency
    kanaReading: kanaText,
    godanEnding: godanEnding,
    commonalityScore: commonalityScore // Store the actual score
  };
}

/**
 * Load and process JMdict data for practice
 */
export async function loadJMdictForPractice(): Promise<void> {
  if (jmdictLoaded) return;
  
  try {
    console.log('Loading JMdict data for practice...');
    const response = await fetch('/data/jmdict-eng-common.json');
    if (!response.ok) {
      throw new Error('Failed to load JMdict data');
    }
    
    const jmdict: JMdict = await response.json();
    console.log(`Loaded ${jmdict.words.length} JMdict entries`);
    
    // Process words and separate into verbs and adjectives
    const verbs: JapaneseWord[] = [];
    const adjectives: JapaneseWord[] = [];
    
    for (const word of jmdict.words) {
      const converted = convertToJapaneseWord(word);
      if (!converted) continue;
      
      if (converted.type === 'Ichidan' || converted.type === 'Godan' || converted.type === 'Irregular') {
        verbs.push(converted);
      } else if (converted.type === 'i-adjective' || converted.type === 'na-adjective') {
        adjectives.push(converted);
      }
    }
    
    // Sort by frequency (higher score = more common, so reverse order)
    verbs.sort((a, b) => b.frequency - a.frequency);
    adjectives.sort((a, b) => b.frequency - a.frequency);
    
    // Cache the results
    practiceVerbsCache = verbs;
    practiceAdjectivesCache = adjectives;
    jmdictLoaded = true;
    
    console.log(`Processed ${verbs.length} verbs and ${adjectives.length} adjectives for practice`);
    
    // Log top 5 most common verbs and adjectives
    console.log('Top 5 most common verbs:', verbs.slice(0, 5).map(v => ({
      word: v.kanji,
      kana: v.kana,
      meaning: v.meaning,
      score: v.frequency
    })));
    console.log('Top 5 most common adjectives:', adjectives.slice(0, 5).map(a => ({
      word: a.kanji,
      kana: a.kana,
      meaning: a.meaning,
      score: a.frequency
    })));
  } catch (error) {
    console.error('Failed to load JMdict for practice:', error);
    throw error;
  }
}

/**
 * Get random practice words from JMdict
 */
export async function getJMdictPracticeWords(
  type: 'all' | 'verbs' | 'adjectives' = 'all',
  limit: number = 50
): Promise<JapaneseWord[]> {
  // Ensure data is loaded
  if (!jmdictLoaded) {
    await loadJMdictForPractice();
  }
  
  let pool: JapaneseWord[] = [];
  
  if (type === 'verbs') {
    pool = practiceVerbsCache || [];
  } else if (type === 'adjectives') {
    pool = practiceAdjectivesCache || [];
  } else {
    // Combine both
    pool = [...(practiceVerbsCache || []), ...(practiceAdjectivesCache || [])];
  }
  
  // Take top common words (already sorted by frequency)
  const topWords = pool.slice(0, limit * 2); // Get more than needed for variety
  
  // Add some randomization while keeping most common words more likely to appear
  const shuffled = topWords.sort(() => Math.random() - 0.3); // Slight shuffle, not complete randomization
  
  // Return requested amount
  return shuffled.slice(0, Math.min(limit, topWords.length));
}

/**
 * Search for specific words in JMdict
 */
export async function searchJMdictWords(
  searchTerm: string,
  limit: number = 50
): Promise<JapaneseWord[]> {
  // Ensure data is loaded
  if (!jmdictLoaded) {
    await loadJMdictForPractice();
  }
  
  const allWords = [...(practiceVerbsCache || []), ...(practiceAdjectivesCache || [])];
  const searchLower = searchTerm.toLowerCase();
  
  // Search in word, reading, and meanings
  const results = allWords.filter(word => {
    const inWord = word.word.includes(searchTerm);
    const inReading = word.reading.includes(searchTerm) || word.kanaReading.includes(searchTerm);
    const inMeanings = word.meanings.some(m => m.toLowerCase().includes(searchLower));
    
    return inWord || inReading || inMeanings;
  });
  
  // Sort by relevance (exact matches first)
  results.sort((a, b) => {
    const aExact = a.word === searchTerm || a.reading === searchTerm || a.kanaReading === searchTerm;
    const bExact = b.word === searchTerm || b.reading === searchTerm || b.kanaReading === searchTerm;
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Then by frequency
    return a.frequency - b.frequency;
  });
  
  return results.slice(0, limit);
}