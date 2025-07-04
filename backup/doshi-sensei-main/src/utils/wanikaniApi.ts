import axios from 'axios';
import { JapaneseWord, WordType, JLPTLevel } from '@/types';

// WaniKani API base URL
const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';

// Create a custom axios instance for WaniKani API
const wanikaniAxios = axios.create({
  baseURL: WANIKANI_API_BASE,
  headers: {
    'Wanikani-Revision': '20170710',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Set the API token when available
export function setWanikaniApiToken(token: string) {
  wanikaniAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Interface for WaniKani API responses
interface WanikaniApiResponse<T> {
  object: string;
  url: string;
  pages: {
    per_page: number;
    next_url: string | null;
    previous_url: string | null;
  };
  total_count: number;
  data_updated_at: string;
  data: T[];
}

// Interface for WaniKani Subject data
interface WanikaniSubject {
  id: number;
  object: string;
  url: string;
  data_updated_at: string;
  data: {
    created_at: string;
    level: number;
    slug: string;
    hidden_at: string | null;
    document_url: string;
    characters: string;
    meanings: {
      meaning: string;
      primary: boolean;
      accepted_answer: boolean;
    }[];
    readings?: {
      type: string;
      primary: boolean;
      accepted_answer: boolean;
      reading: string;
    }[];
    parts_of_speech?: string[];
    component_subject_ids?: number[];
    amalgamation_subject_ids?: number[];
    meaning_mnemonic?: string;
    reading_mnemonic?: string;
  };
}

// Function to determine JLPT level based on WaniKani level
function determineJLPTLevel(level: number): JLPTLevel {
  if (level <= 3) return 'N5';
  if (level <= 10) return 'N4';
  if (level <= 20) return 'N3';
  if (level <= 40) return 'N2';
  return 'N1';
}

// Function to determine word type based on parts of speech
function determineWordType(partsOfSpeech: string[] | undefined): WordType {
  if (!partsOfSpeech || partsOfSpeech.length === 0) {
    return 'other'; // Default to other instead of verb
  }

  const posArray = partsOfSpeech.map(p => p.toLowerCase());
  const pos = posArray.join(' ');

  // Check for verbs first (highest priority for conjugation)
  if (pos.includes('ichidan') || pos.includes('ru verb') || pos.includes('る verb')) {
    return 'Ichidan';
  } else if (pos.includes('godan') || pos.includes('u verb') || pos.includes('う verb')) {
    return 'Godan';
  } else if (pos.includes('irregular') || pos.includes('suru verb') || pos.includes('kuru verb') || pos.includes('する verb') || pos.includes('来る verb')) {
    return 'Irregular';
  }

  // Check for TRUE i-adjectives only (standalone, conjugatable adjectives)
  else if (
    (posArray.includes('i adjective') || posArray.includes('う adjective') || posArray.includes('i-adjective') || posArray.includes('い adjective') || posArray.includes('い-adjective')) &&
    !pos.includes('noun') // Exclude "noun, い adjective" combinations
  ) {
    return 'i-adjective';
  }

  // Check for TRUE na-adjectives only (standalone, conjugatable adjectives)
  else if (
    (posArray.includes('な adjective') || posArray.includes('na adjective') || posArray.includes('na-adjective') || posArray.includes('な-adjective')) &&
    !pos.includes('noun') // Exclude "noun, な adjective" combinations like 大人
  ) {
    return 'na-adjective';
  }

  // Check for nouns (including "noun, adjective" combinations)
  else if (pos.includes('noun') || pos.includes('counter') || pos.includes('suffix') || pos.includes('prefix')) {
    return 'noun';
  }

  // Check for adverbs
  else if (pos.includes('adverb')) {
    return 'adverb';
  }

  // Check for particles
  else if (pos.includes('particle')) {
    return 'particle';
  }

  // Default to other for unknown types
  return 'other';
}

// Function to generate romaji from kana
function generateRomaji(kana: string): string {
  // Simple kana to romaji conversion (basic implementation)
  // In a production app, you'd use a proper library like kuroshiro
  const kanaToRomaji: { [key: string]: string } = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n',
    // Long vowels
    'ー': '', 'っ': ''
  };

  let result = '';
  for (let i = 0; i < kana.length; i++) {
    const char = kana[i];
    if (kanaToRomaji[char]) {
      result += kanaToRomaji[char];
    } else {
      result += char; // Keep unknown characters as-is
    }
  }
  return result;
}

// Convert WaniKani subject to our JapaneseWord format
function convertWanikaniSubject(subject: WanikaniSubject): JapaneseWord | null {
  // Only process vocabulary subjects
  if (subject.object !== 'vocabulary') {
    return null;
  }

  const { data } = subject;

  // Get primary meaning
  const primaryMeaning = data.meanings.find(m => m.primary)?.meaning || data.meanings[0]?.meaning || '';

  // Get all meanings
  const allMeanings = data.meanings.map(m => m.meaning).join(', ');

  // Get primary reading
  const primaryReading = data.readings?.find(r => r.primary)?.reading || data.readings?.[0]?.reading || '';

  // Generate romaji
  const romaji = generateRomaji(primaryReading);

  // Determine word type
  const wordType = determineWordType(data.parts_of_speech);

  // Determine JLPT level based on WaniKani level
  const jlptLevel = determineJLPTLevel(data.level);

  return {
    id: `wanikani-${subject.id}`,
    kanji: data.characters,
    kana: primaryReading,
    romaji,
    meaning: allMeanings,
    type: wordType,
    jlpt: jlptLevel,
    tags: data.parts_of_speech || []
  };
}

// Fetch vocabulary from WaniKani API
export async function fetchWanikaniVocabulary(limit: number = 20): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set
    if (!wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set');
      return [];
    }

    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>('/subjects', {
      params: {
        types: 'vocabulary',
        hidden: false,
        levels: '1,2,3,4,5,6,7,8,9,10', // Adjust levels as needed
        limit
      }
    });

    // Convert WaniKani subjects to JapaneseWord format
    const words = response.data.data
      .map(convertWanikaniSubject)
      .filter((word): word is JapaneseWord => word !== null);

    return words;
  } catch (error) {
    console.error('Error fetching vocabulary from WaniKani:', error);
    return [];
  }
}

// Fetch all vocabulary with pagination
async function fetchAllWanikaniVocabulary(): Promise<WanikaniSubject[]> {
  const allVocabulary: WanikaniSubject[] = [];
  let nextUrl: string | null = '/subjects?types=vocabulary&hidden=false';

  while (nextUrl) {
    try {
      const response: { data: WanikaniApiResponse<WanikaniSubject> } = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(nextUrl);
      allVocabulary.push(...response.data.data);
      nextUrl = response.data.pages.next_url;

      // Log progress
      console.log(`Fetched ${allVocabulary.length} vocabulary items so far...`);

      // Remove the base URL from next_url if present
      if (nextUrl && nextUrl.startsWith('https://api.wanikani.com/v2')) {
        nextUrl = nextUrl.replace('https://api.wanikani.com/v2', '');
      }
    } catch (error) {
      console.error('Error fetching vocabulary page:', error);
      break;
    }
  }

  console.log(`Total vocabulary items fetched: ${allVocabulary.length}`);
  return allVocabulary;
}

// Search vocabulary in WaniKani API (more efficient approach)
export async function searchWanikaniVocabulary(query: string, limit: number = 20): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set
    if (!wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set');
      return [];
    }

    // Instead of fetching ALL vocabulary, fetch a reasonable subset from multiple levels
    console.log(`Searching WaniKani vocabulary for "${query}"...`);
    const allWords: JapaneseWord[] = [];

    // Fetch vocabulary from levels 1-20 (covers N5-N3, most common words)
    const levelRanges = ['1,2,3,4,5', '6,7,8,9,10', '11,12,13,14,15', '16,17,18,19,20'];

    for (const levels of levelRanges) {
      try {
        const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>('/subjects', {
          params: {
            types: 'vocabulary',
            hidden: false,
            levels: levels,
            limit: 500 // Fetch 500 per level range
          }
        });

        // Convert WaniKani subjects to JapaneseWord format
        const words = response.data.data
          .map(convertWanikaniSubject)
          .filter((word): word is JapaneseWord => word !== null);

        allWords.push(...words);
      } catch (error) {
        console.warn(`Error fetching vocabulary for levels ${levels}:`, error);
        continue; // Continue with other level ranges
      }
    }

    console.log(`Fetched ${allWords.length} words from WaniKani to search`);

    const queryLower = query.toLowerCase().trim();

    // First, look for exact matches
    const exactMatches = allWords.filter(word => {
      // Exact match on kanji
      if (word.kanji.toLowerCase() === queryLower) return true;

      // Exact match on kana
      if (word.kana.toLowerCase() === queryLower) return true;

      // Exact match on romaji
      if (word.romaji.toLowerCase() === queryLower) return true;

      // Exact match as complete word in meanings (comma or space separated)
      const meanings = word.meaning.toLowerCase().split(/[,\s]+/).map(m => m.trim());
      if (meanings.includes(queryLower)) return true;

      return false;
    });

    // If we found exact matches, return them
    if (exactMatches.length > 0) {
      console.log(`Found ${exactMatches.length} exact matches for "${query}" in WaniKani`);
      return exactMatches.slice(0, limit);
    }

    // Otherwise, fall back to partial matches
    const partialMatches = allWords.filter(word =>
      word.kanji.includes(query) ||
      word.kana.includes(query) ||
      word.meaning.toLowerCase().includes(queryLower)
    );

    console.log(`Found ${partialMatches.length} partial matches for "${query}" in WaniKani`);
    return partialMatches.slice(0, limit);
  } catch (error) {
    console.error('Error searching vocabulary in WaniKani:', error);
    return [];
  }
}

// Get common verbs and adjectives from WaniKani
export async function getCommonWordsFromWanikani(): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set
    if (!wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set');
      return [];
    }

    // Fetch all vocabulary
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>('/subjects', {
      params: {
        types: 'vocabulary',
        hidden: false,
        levels: '1,2,3,4,5,6,7,8,9,10', // Expanded range for better variety
        limit: 200 // Increased limit for more diversity
      }
    });

    // Convert WaniKani subjects to JapaneseWord format
    const allWords = response.data.data
      .map(convertWanikaniSubject)
      .filter((word): word is JapaneseWord => word !== null);

    // Debug: Log all parts of speech we're getting from WaniKani
    const allPartsOfSpeech = new Set<string>();
    response.data.data.forEach(subject => {
      if (subject.data.parts_of_speech) {
        subject.data.parts_of_speech.forEach(pos => allPartsOfSpeech.add(pos));
      }
    });
    console.log('All parts of speech from WaniKani:', Array.from(allPartsOfSpeech).sort());

    // Debug: Log some examples with their parts of speech
    console.log('Sample words with parts of speech:');
    allWords.slice(0, 10).forEach(word => {
      const originalSubject = response.data.data.find(s => s.id === parseInt(word.id.replace('wanikani-', '')));
      console.log(`${word.kanji} (${word.kana}) - ${word.type} - Parts: [${originalSubject?.data.parts_of_speech?.join(', ') || 'none'}]`);
    });

    // Filter for verbs and adjectives only
    const practiceWords = allWords.filter(word =>
      word.type === 'Ichidan' ||
      word.type === 'Godan' ||
      word.type === 'Irregular' ||
      word.type === 'i-adjective' ||
      word.type === 'na-adjective'
    );

    console.log(`Found ${practiceWords.length} verbs and adjectives from WaniKani`);

    // Log breakdown by type for debugging
    const breakdown = {
      ichidan: practiceWords.filter(w => w.type === 'Ichidan').length,
      godan: practiceWords.filter(w => w.type === 'Godan').length,
      irregular: practiceWords.filter(w => w.type === 'Irregular').length,
      iAdjective: practiceWords.filter(w => w.type === 'i-adjective').length,
      naAdjective: practiceWords.filter(w => w.type === 'na-adjective').length
    };
    console.log('WaniKani word type breakdown:', breakdown);

    return practiceWords.slice(0, 50); // Return top 50 words (mixed verbs and adjectives)
  } catch (error) {
    console.error('Error fetching common verbs and adjectives from WaniKani:', error);
    return [];
  }
}

// Get common verbs from WaniKani (kept for backward compatibility)
export async function getCommonVerbsFromWanikani(): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set
    if (!wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set');
      return [];
    }

    // Fetch all vocabulary
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>('/subjects', {
      params: {
        types: 'vocabulary',
        hidden: false,
        levels: '1,2,3,4,5', // Lower levels for common verbs
        limit: 100
      }
    });

    // Convert WaniKani subjects to JapaneseWord format
    const allWords = response.data.data
      .map(convertWanikaniSubject)
      .filter((word): word is JapaneseWord => word !== null);

    // Filter for verbs only
    const verbs = allWords.filter(word =>
      word.type === 'Ichidan' ||
      word.type === 'Godan' ||
      word.type === 'Irregular'
    );

    return verbs.slice(0, 50); // Return top 50 verbs
  } catch (error) {
    console.error('Error fetching common verbs from WaniKani:', error);
    return [];
  }
}

// Get words by JLPT level from WaniKani
export async function getWordsByJLPTLevelFromWanikani(level: JLPTLevel): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set
    if (!wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set');
      return [];
    }

    // Map JLPT level to WaniKani levels
    let wanikaniLevels: string;
    switch (level) {
      case 'N5':
        wanikaniLevels = '1,2,3';
        break;
      case 'N4':
        wanikaniLevels = '4,5,6,7,8,9,10';
        break;
      case 'N3':
        wanikaniLevels = '11,12,13,14,15,16,17,18,19,20';
        break;
      case 'N2':
        wanikaniLevels = '21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40';
        break;
      case 'N1':
        wanikaniLevels = '41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60';
        break;
      default:
        wanikaniLevels = '1,2,3,4,5';
    }

    // Fetch vocabulary for the specified levels
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>('/subjects', {
      params: {
        types: 'vocabulary',
        hidden: false,
        levels: wanikaniLevels,
        limit: 100
      }
    });

    // Convert WaniKani subjects to JapaneseWord format
    const words = response.data.data
      .map(convertWanikaniSubject)
      .filter((word): word is JapaneseWord => word !== null);

    return words.slice(0, 30); // Return top 30 words
  } catch (error) {
    console.error(`Error fetching ${level} words from WaniKani:`, error);
    return [];
  }
}
