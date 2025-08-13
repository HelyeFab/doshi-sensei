import axios from 'axios';
import { JapaneseWord, WordType, JLPTLevel } from '@/types';

// WaniKani API configuration
const WANIKANI_API_BASE = 'https://api.wanikani.com/v2';

// Determine if we should use proxy based on environment
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const PROXY_BASE = isProduction ? '/.netlify/functions/wanikani-proxy' : null;

// Create a custom axios instance for WaniKani API
const wanikaniAxios = axios.create({
  baseURL: PROXY_BASE || WANIKANI_API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Add cache control headers to prevent service worker caching
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Set the API token when available
export function setWanikaniApiToken(token: string) {
  // If using proxy, we don't need to set Authorization header in browser
  if (PROXY_BASE) {
    if (typeof window !== 'undefined') {
      console.log('[WaniKani] Using proxy, token handled server-side');
    }
    return;
  }
  
  // For development or server-side, set the token
  const validToken = token || 'db0708c2-d1d4-4865-948c-b31c9ebdc04e';
  wanikaniAxios.defaults.headers.common['Authorization'] = `Bearer ${validToken}`;
  wanikaniAxios.defaults.headers.common['Wanikani-Revision'] = '20170710';
  
  // Log for debugging
  if (typeof window !== 'undefined') {
    console.log('[WaniKani] Token set:', validToken.substring(0, 8) + '...', 'Full header:', wanikaniAxios.defaults.headers.common['Authorization']?.substring(0, 20) + '...');
  }
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
function determineWordType(partsOfSpeech: string[] | undefined, word?: { characters?: string }): WordType {
  if (!partsOfSpeech || partsOfSpeech.length === 0) {
    // Check if it's a する verb by looking at the word itself
    if (word?.characters && word.characters.endsWith('する')) {
      return 'Irregular';
    }
    return 'other'; // Default to other instead of verb
  }

  const posArray = partsOfSpeech.map(p => p.toLowerCase());
  const pos = posArray.join(' ');

  // Check for irregular verbs FIRST (highest priority - especially する verbs)
  if (pos.includes('irregular') || pos.includes('suru verb') || pos.includes('kuru verb') || 
      pos.includes('する verb') || pos.includes('来る verb') || pos.includes('vs-i') || 
      pos.includes('vs-s') || pos.includes('vs') || pos.includes('vk')) {
    return 'Irregular';
  }
  
  // Also check if the word ends with する (compound suru verbs)
  if (word?.characters && word.characters.endsWith('する')) {
    return 'Irregular';
  }
  
  // Then check for other verb types
  else if (pos.includes('ichidan') || pos.includes('ru verb') || pos.includes('る verb')) {
    return 'Ichidan';
  } else if (pos.includes('godan') || pos.includes('u verb') || pos.includes('う verb')) {
    return 'Godan';
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

  // Determine word type (pass characters for する verb detection)
  const wordType = determineWordType(data.parts_of_speech, { characters: data.characters });
  
  // Debug logging for する verb detection
  if (typeof window !== 'undefined' && data.characters?.endsWith('する')) {
    console.log(`[WaniKani] する verb detected: ${data.characters}`, {
      partsOfSpeech: data.parts_of_speech,
      determinedType: wordType
    });
  }

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

    const endpoint = PROXY_BASE ? '' : '/subjects';
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(endpoint, {
      params: {
        ...(PROXY_BASE && { endpoint: '/subjects' }),
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

      // Remove the base URL from next_url if present
      if (nextUrl && nextUrl.startsWith('https://api.wanikani.com/v2')) {
        nextUrl = nextUrl.replace('https://api.wanikani.com/v2', '');
      }
    } catch (error) {
      console.error('Error fetching vocabulary page:', error);
      break;
    }
  }

  return allVocabulary;
}

// Cache for WaniKani vocabulary data
let vocabularyCache: JapaneseWord[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Optimized search vocabulary in WaniKani API with caching
export async function searchWanikaniVocabulary(query: string, limit: number = 50): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set
    if (!wanikaniAxios.defaults.headers.common['Authorization']) {
      console.error('[WaniKani] API token not set in Authorization header');
      // Try to reinitialize with fallback token
      const token = process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN || 'db0708c2-d1d4-4865-948c-b31c9ebdc04e';
      setWanikaniApiToken(token);
      console.log('[WaniKani] Reinitialized with token:', token.substring(0, 8) + '...');
      
      // Check again after reinitialization
      if (!wanikaniAxios.defaults.headers.common['Authorization']) {
        console.error('[WaniKani] Failed to set token even after reinitialization');
        return [];
      }
    }


    // Check if we have valid cached data
    const now = Date.now();
    if (vocabularyCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return performSearch(vocabularyCache, query, limit);
    }

    // If no cache or expired, fetch from API
    const allWords: JapaneseWord[] = [];

    // Optimized parallel requests instead of sequential
    const levelRanges = [
      '1,2,3,4,5', '6,7,8,9,10', '11,12,13,14,15', '16,17,18,19,20',
      '21,22,23,24,25', '26,27,28,29,30', '31,32,33,34,35', '36,37,38,39,40',
      '41,42,43,44,45', '46,47,48,49,50', '51,52,53,54,55', '56,57,58,59,60'
    ];

    // Log the API request details
    console.log('[WaniKani] Making API requests with token:', 
      wanikaniAxios.defaults.headers.common['Authorization']?.toString().substring(0, 20) + '...');
    
    // Make all API calls in parallel for speed
    const endpoint = PROXY_BASE ? '' : '/subjects';
    const promises = levelRanges.map(levels =>
      wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(endpoint, {
        params: {
          ...(PROXY_BASE && { endpoint: '/subjects' }),
          types: 'vocabulary',
          hidden: false,
          levels: levels,
          limit: 1000,
          // Add timestamp to prevent caching
          _t: Date.now()
        }
      }).catch(error => {
        console.error(`[WaniKani] Error fetching vocabulary for levels ${levels}:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
          usingProxy: !!PROXY_BASE
        });
        return null;
      })
    );

    const responses = await Promise.all(promises);

    // Process all successful responses
    for (const response of responses) {
      if (response?.data?.data) {
        const words = response.data.data
          .map(convertWanikaniSubject)
          .filter((word): word is JapaneseWord => word !== null);
        allWords.push(...words);
      }
    }


    // Cache the results
    vocabularyCache = allWords;
    cacheTimestamp = now;

    // Perform search on fresh data
    return performSearch(allWords, query, limit);
  } catch (error) {
    console.error('Error searching vocabulary in WaniKani:', error);
    return [];
  }
}

// Helper function to perform the actual search
function performSearch(words: JapaneseWord[], query: string, limit: number): JapaneseWord[] {
  const queryLower = query.toLowerCase().trim();

  // Enhanced search logic to catch more variations
  const matchingWords = words.filter(word => {
    // Exact match on kanji
    if (word.kanji.toLowerCase() === queryLower) return true;

    // Exact match on kana
    if (word.kana.toLowerCase() === queryLower) return true;

    // Exact match on romaji
    if (word.romaji.toLowerCase() === queryLower) return true;

    // Check meanings more comprehensively
    const meaning = word.meaning.toLowerCase();

    // Exact word match in meanings
    if (meaning.includes(queryLower)) {
      // Check if it's a word boundary match (more precise)
      const wordBoundaryRegex = new RegExp(`\\b${queryLower}\\b`);
      if (wordBoundaryRegex.test(meaning)) return true;

      // Also match "to [verb]" patterns
      if (meaning.includes(`to ${queryLower}`)) return true;

      // Match if query appears at start of meaning
      if (meaning.startsWith(queryLower)) return true;
    }

    return false;
  });

  // Sort by relevance (exact matches first, then others)
  const sortedMatches = matchingWords.sort((a, b) => {
    const aExact = a.kanji.toLowerCase() === queryLower || a.kana.toLowerCase() === queryLower;
    const bExact = b.kanji.toLowerCase() === queryLower || b.kana.toLowerCase() === queryLower;

    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // Then sort by meaning relevance
    const aMeaningStarts = a.meaning.toLowerCase().startsWith(queryLower);
    const bMeaningStarts = b.meaning.toLowerCase().startsWith(queryLower);

    if (aMeaningStarts && !bMeaningStarts) return -1;
    if (!aMeaningStarts && bMeaningStarts) return 1;

    return 0;
  });

  return sortedMatches.slice(0, limit);
}

// Function to clear cache (useful for testing or manual refresh)
export function clearWanikaniCache(): void {
  vocabularyCache = null;
  cacheTimestamp = 0;
}

// Fallback conjugable words when WaniKani API is not available
const fallbackConjugableWords: JapaneseWord[] = [
  {
    id: 'fallback-1',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: 'to eat',
    type: 'Ichidan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-2',
    kanji: '飲む',
    kana: 'のむ',
    romaji: 'nomu',
    meaning: 'to drink',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-3',
    kanji: '読む',
    kana: 'よむ',
    romaji: 'yomu',
    meaning: 'to read',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-4',
    kanji: '書く',
    kana: 'かく',
    romaji: 'kaku',
    meaning: 'to write',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-5',
    kanji: '見る',
    kana: 'みる',
    romaji: 'miru',
    meaning: 'to see, to watch',
    type: 'Ichidan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-6',
    kanji: '来る',
    kana: 'くる',
    romaji: 'kuru',
    meaning: 'to come',
    type: 'Irregular',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-7',
    kanji: 'する',
    kana: 'する',
    romaji: 'suru',
    meaning: 'to do',
    type: 'Irregular',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-8',
    kanji: '行く',
    kana: 'いく',
    romaji: 'iku',
    meaning: 'to go',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-9',
    kanji: '大きい',
    kana: 'おおきい',
    romaji: 'ookii',
    meaning: 'big, large',
    type: 'i-adjective',
    jlpt: 'N5',
    tags: ['adjective']
  },
  {
    id: 'fallback-10',
    kanji: '小さい',
    kana: 'ちいさい',
    romaji: 'chiisai',
    meaning: 'small',
    type: 'i-adjective',
    jlpt: 'N5',
    tags: ['adjective']
  },
  {
    id: 'fallback-11',
    kanji: '新しい',
    kana: 'あたらしい',
    romaji: 'atarashii',
    meaning: 'new',
    type: 'i-adjective',
    jlpt: 'N5',
    tags: ['adjective']
  },
  {
    id: 'fallback-12',
    kanji: '古い',
    kana: 'ふるい',
    romaji: 'furui',
    meaning: 'old',
    type: 'i-adjective',
    jlpt: 'N5',
    tags: ['adjective']
  },
  {
    id: 'fallback-13',
    kanji: '元気',
    kana: 'げんき',
    romaji: 'genki',
    meaning: 'healthy, energetic',
    type: 'na-adjective',
    jlpt: 'N5',
    tags: ['adjective']
  },
  {
    id: 'fallback-14',
    kanji: '静か',
    kana: 'しずか',
    romaji: 'shizuka',
    meaning: 'quiet',
    type: 'na-adjective',
    jlpt: 'N5',
    tags: ['adjective']
  },
  {
    id: 'fallback-15',
    kanji: '走る',
    kana: 'はしる',
    romaji: 'hashiru',
    meaning: 'to run',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-16',
    kanji: '歩く',
    kana: 'あるく',
    romaji: 'aruku',
    meaning: 'to walk',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-17',
    kanji: '話す',
    kana: 'はなす',
    romaji: 'hanasu',
    meaning: 'to speak',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-18',
    kanji: '聞く',
    kana: 'きく',
    romaji: 'kiku',
    meaning: 'to listen, to hear',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-19',
    kanji: '学ぶ',
    kana: 'まなぶ',
    romaji: 'manabu',
    meaning: 'to learn',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  },
  {
    id: 'fallback-20',
    kanji: '働く',
    kana: 'はたらく',
    romaji: 'hataraku',
    meaning: 'to work',
    type: 'Godan',
    jlpt: 'N5',
    tags: ['verb']
  }
];

// Get common verbs and adjectives from WaniKani
export async function getCommonWordsFromWanikani(): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set (only needed for non-proxy)
    if (!PROXY_BASE && !wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set, using fallback conjugable words');
      return fallbackConjugableWords;
    }

    // Fetch all vocabulary
    const endpoint = PROXY_BASE ? '' : '/subjects';
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(endpoint, {
      params: {
        ...(PROXY_BASE && { endpoint: '/subjects' }),
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

    // Debug: Log some examples with their parts of speech
    allWords.slice(0, 10).forEach(word => {
      const originalSubject = response.data.data.find(s => s.id === parseInt(word.id.replace('wanikani-', '')));
    });

    // Filter for verbs and adjectives only
    const practiceWords = allWords.filter(word =>
      word.type === 'Ichidan' ||
      word.type === 'Godan' ||
      word.type === 'Irregular' ||
      word.type === 'i-adjective' ||
      word.type === 'na-adjective'
    );


    // Log breakdown by type for debugging
    const breakdown = {
      ichidan: practiceWords.filter(w => w.type === 'Ichidan').length,
      godan: practiceWords.filter(w => w.type === 'Godan').length,
      irregular: practiceWords.filter(w => w.type === 'Irregular').length,
      iAdjective: practiceWords.filter(w => w.type === 'i-adjective').length,
      naAdjective: practiceWords.filter(w => w.type === 'na-adjective').length
    };

    return practiceWords.slice(0, 50); // Return top 50 words (mixed verbs and adjectives)
  } catch (error) {
    console.error('Error fetching common verbs and adjectives from WaniKani:', error);
    return [];
  }
}

// Get common verbs from WaniKani (kept for backward compatibility)
export async function getCommonVerbsFromWanikani(): Promise<JapaneseWord[]> {
  try {
    // Check if API token is set (only needed for non-proxy)
    if (!PROXY_BASE && !wanikaniAxios.defaults.headers.common['Authorization']) {
      console.warn('WaniKani API token not set');
      return [];
    }

    // Fetch all vocabulary
    const endpoint = PROXY_BASE ? '' : '/subjects';
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(endpoint, {
      params: {
        ...(PROXY_BASE && { endpoint: '/subjects' }),
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
    // Check if API token is set (only needed for non-proxy)
    if (!PROXY_BASE && !wanikaniAxios.defaults.headers.common['Authorization']) {
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
    const endpoint = PROXY_BASE ? '' : '/subjects';
    const response = await wanikaniAxios.get<WanikaniApiResponse<WanikaniSubject>>(endpoint, {
      params: {
        ...(PROXY_BASE && { endpoint: '/subjects' }),
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
