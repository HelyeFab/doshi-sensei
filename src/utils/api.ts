import axios from 'axios';
import { JishoAPIResponse, JishoWord, JapaneseWord, WordType, JLPTLevel } from '@/types';

// WaniKani imports - primary dictionary source
import {
  setWanikaniApiToken,
  searchWanikaniVocabulary,
  getCommonVerbsFromWanikani,
  getCommonWordsFromWanikani,
  getWordsByJLPTLevelFromWanikani
} from './wanikaniApi';

// Tatoeba example sentences
import { batchSearchTatoebaExamples } from './tatoebaSearch';

// WaniKani API initialization - primary source
const initWanikaniApi = () => {
  // The token MUST be prefixed with NEXT_PUBLIC_ to be available in the browser
  // This is embedded at build time by Next.js
  const token = process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN;
  
  if (token) {
    setWanikaniApiToken(token);
    if (typeof window !== 'undefined') {
      console.log('[WaniKani] API initialized with token:', token.substring(0, 8) + '...');
    }
  } else {
    // Fallback: try hardcoded token if env var is not available
    // This ensures it works in production even if env vars aren't properly set
    const fallbackToken = 'db0708c2-d1d4-4865-948c-b31c9ebdc04e';
    setWanikaniApiToken(fallbackToken);
    
    if (typeof window !== 'undefined') {
      console.warn('[WaniKani] Using fallback token - env var not found');
    }
  }
};

// Initialize WaniKani API
initWanikaniApi();

// Jisho API base URL (used as fallback only)
const JISHO_API_BASE = 'https://jisho.org/api/v1/search/words';

// Netlify function proxy endpoint for Jisho API (used as fallback only)
const JISHO_PROXY_BASE = '/.netlify/functions/jisho-proxy';

// Create a custom axios instance for Jisho proxy (used as fallback only)
const jishoAxios = axios.create({
  baseURL: JISHO_PROXY_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Convert Jisho word to our JapaneseWord format
function convertJishoWord(jishoWord: JishoWord, index: number): JapaneseWord {
  const japanese = jishoWord.japanese[0];
  const sense = jishoWord.senses[0];

  // Determine word type from parts of speech (pass word for する verb detection)
  const wordType = determineWordType(sense.parts_of_speech, japanese.word || japanese.reading);
  
  // Debug logging for conjugation issues
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Jisho] Converting word: ${japanese.word || japanese.reading}`, {
      partsOfSpeech: sense.parts_of_speech,
      determinedType: wordType
    });
  }

  // Get JLPT level
  const jlptLevel = determineJLPTLevel(jishoWord.jlpt);

  // Generate romaji (simplified - in a real app you'd use a proper romanization library)
  const romaji = generateRomaji(japanese.reading);

  return {
    id: `${jishoWord.slug}-${index}`,
    kanji: japanese.word || japanese.reading,
    kana: japanese.reading,
    romaji,
    meaning: sense.english_definitions.join(', '),
    type: wordType,
    jlpt: jlptLevel,
    tags: sense.tags
  };
}

function determineWordType(partsOfSpeech: string[], word?: string): WordType {
  const pos = partsOfSpeech.join(' ').toLowerCase();

  // Check for irregular verbs FIRST (especially する verbs)
  if (pos.includes('irregular') || pos.includes('suru verb') || pos.includes('kuru verb') ||
      pos.includes('vs-i') || pos.includes('vs-s') || pos.includes('vs') || pos.includes('vk')) {
    return 'Irregular';
  }
  
  // Also check if the word ends with する
  if (word && word.endsWith('する')) {
    return 'Irregular';
  }
  
  // Then check for other verb types
  else if (pos.includes('ichidan') || pos.includes('ru verb')) {
    return 'Ichidan';
  } else if (pos.includes('godan') || pos.includes('u verb')) {
    return 'Godan';
  }

  // Check for adjectives
  else if (pos.includes('i-adjective')) {
    return 'i-adjective';
  } else if (pos.includes('na-adjective') || pos.includes('no-adjective')) {
    return 'na-adjective';
  }

  // Check for nouns
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

function determineJLPTLevel(jlptArray: string[]): JLPTLevel {
  if (jlptArray.includes('jlpt-n5')) return 'N5';
  if (jlptArray.includes('jlpt-n4')) return 'N4';
  if (jlptArray.includes('jlpt-n3')) return 'N3';
  if (jlptArray.includes('jlpt-n2')) return 'N2';
  if (jlptArray.includes('jlpt-n1')) return 'N1';
  return 'N5'; // Default to beginner level
}

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

// Simple search with WaniKani as primary source (pure results as requested)
export async function searchWords(query: string, limit: number = 20): Promise<JapaneseWord[]> {
  // Debug logging for data source tracking
  const debugLog = (source: string, results: any[], extra?: any) => {
    if (typeof window !== 'undefined') {
      console.log(`🔍 [Search API] Source: ${source}, Results: ${results.length}`, {
        query,
        sample: results.slice(0, 2).map(r => ({
          word: r.kanji || r.kana || r.word,
          type: r.type,
          meaning: r.meaning || (r.meanings ? r.meanings.join(', ') : '')
        })),
        ...extra
      });
    }
  };

  try {
    // Always try WaniKani first - they have the best curated results
    let wanikaniResults: JapaneseWord[] = [];
    try {
      wanikaniResults = await searchWanikaniVocabulary(query, Math.min(10, limit));
      debugLog('WaniKani', wanikaniResults);
      
      if (wanikaniResults.length > 0) {
        // Add Tatoeba example sentences to WaniKani results
        const wordsToSearch = wanikaniResults.map(word => word.kanji || word.kana);
        const examplesMap = await batchSearchTatoebaExamples(wordsToSearch, 3);
        
        wanikaniResults = wanikaniResults.map(word => ({
          ...word,
          exampleSentences: examplesMap.get(word.kanji || word.kana) || []
        }));
      }
    } catch (wanikaniError) {
      console.warn('WaniKani search failed:', wanikaniError);
      // Continue - we'll use other sources
    }

    // If we have enough results from WaniKani and it's a small limit, return them
    if (wanikaniResults.length >= limit) {
      return wanikaniResults.slice(0, limit);
    }

    // Calculate how many more results we need
    const remainingLimit = limit - wanikaniResults.length;

    // Now get additional results from JMDict to fill up the remaining slots
    let additionalResults: JapaneseWord[] = [];
    
    if (remainingLimit > 0) {
      try {
        // Try specific conjugation-focused search first
        const { searchJMdictWords: searchPractice } = await import('./jmdictPractice');
        const practiceResults = await searchPractice(query, remainingLimit + 10); // Get extra to filter
        debugLog('JMDict Practice', practiceResults);
        
        if (practiceResults.length > 0) {
          // Filter out any duplicates with WaniKani results
          const wanikaniKanji = new Set(wanikaniResults.map(w => w.kanji));
          const uniquePracticeResults = practiceResults.filter(word => 
            !wanikaniKanji.has(word.kanji)
          );
          
          // Add Tatoeba example sentences
          const wordsToSearch = uniquePracticeResults.slice(0, remainingLimit).map(word => word.kanji || word.kana);
          const examplesMap = await batchSearchTatoebaExamples(wordsToSearch, 3);
          
          additionalResults = uniquePracticeResults.slice(0, remainingLimit).map(word => ({
            ...word,
            exampleSentences: examplesMap.get(word.kanji || word.kana) || []
          }));
        }
      } catch (practiceError) {
        console.warn('JMDict practice search failed:', practiceError);
        
        // Try the general JMDict search as secondary fallback
        try {
          const { searchJMdictWords } = await import('./jmdictLocalSearch');
          const jmdictResults = await searchJMdictWords(query, remainingLimit + 10);
          
          if (jmdictResults.length > 0) {
            // Convert JMDict results to our format
            const convertedResults: JapaneseWord[] = jmdictResults.map((result, index) => ({
              id: `jmdict-${result.word}-${index}`,
              kanji: result.word,
              kana: result.reading,
              romaji: result.romaji || '',
              meaning: result.meanings.join(', '),
              type: result.type as any || 'other',
              jlpt: result.jlpt as any || 'N5',
              tags: [],
              frequency: result.frequency,
              exampleSentences: []
            }));
            
            // Filter out duplicates
            const wanikaniKanji = new Set(wanikaniResults.map(w => w.kanji));
            const uniqueJmdictResults = convertedResults.filter(word => 
              !wanikaniKanji.has(word.kanji)
            );
            
            // Add Tatoeba example sentences
            const wordsToSearch = uniqueJmdictResults.slice(0, remainingLimit).map(word => word.kanji || word.kana);
            const examplesMap = await batchSearchTatoebaExamples(wordsToSearch, 3);
            
            additionalResults = uniqueJmdictResults.slice(0, remainingLimit).map(word => ({
              ...word,
              exampleSentences: examplesMap.get(word.kanji || word.kana) || []
            }));
          }
        } catch (jmdictError) {
          console.warn('JMDict local search also failed:', jmdictError);
        }
      }
    }
    
    // Combine WaniKani results (first) with additional results
    const combinedResults = [...wanikaniResults, ...additionalResults];

    // If we have any combined results, return them
    if (combinedResults.length > 0) {
      return combinedResults.slice(0, limit);
    }

    // Final fallback to Jisho API only if we have NO results at all
    if (combinedResults.length === 0) {
      try {
        const jishoResults = await searchJisho(query, 1);

        if (jishoResults.data && jishoResults.data.length > 0) {
          const convertedResults = processJishoResponse(jishoResults, limit);
          
          // Add Tatoeba example sentences to Jisho results too
          const wordsToSearch = convertedResults.map(word => word.kanji || word.kana);
          const examplesMap = await batchSearchTatoebaExamples(wordsToSearch, 3);
          
          const resultsWithExamples = convertedResults.map(word => ({
            ...word,
            exampleSentences: examplesMap.get(word.kanji || word.kana) || []
          }));
          
          return resultsWithExamples;
        }
      } catch (jishoError) {
        console.warn('Jisho fallback failed:', jishoError);
      }
    }

    return combinedResults;

  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

// Mock vocabulary data for development
function getMockVocabularyData(query: string): JapaneseWord[] {
  const mockData: Record<string, JapaneseWord> = {
    '新': {
      id: 'mock-新',
      kanji: '新',
      kana: 'あたら',
      romaji: 'atara',
      meaning: 'new, fresh',
      type: 'i-adjective',
      jlpt: 'N5',
      tags: []
    },
    '新しい': {
      id: 'mock-新しい',
      kanji: '新しい',
      kana: 'あたらしい',
      romaji: 'atarashii',
      meaning: 'new, fresh, novel',
      type: 'i-adjective',
      jlpt: 'N5',
      tags: []
    },
    '電車': {
      id: 'mock-電車',
      kanji: '電車',
      kana: 'でんしゃ',
      romaji: 'densha',
      meaning: 'train, electric train',
      type: 'noun',
      jlpt: 'N5',
      tags: []
    },
    '運行': {
      id: 'mock-運行',
      kanji: '運行',
      kana: 'うんこう',
      romaji: 'unkou',
      meaning: 'operation, service, running',
      type: 'noun',
      jlpt: 'N3',
      tags: []
    },
    '開始': {
      id: 'mock-開始',
      kanji: '開始',
      kana: 'かいし',
      romaji: 'kaishi',
      meaning: 'start, beginning, commencement',
      type: 'noun',
      jlpt: 'N3',
      tags: []
    },
    '今日': {
      id: 'mock-今日',
      kanji: '今日',
      kana: 'きょう',
      romaji: 'kyou',
      meaning: 'today',
      type: 'noun',
      jlpt: 'N5',
      tags: []
    },
    '東京': {
      id: 'mock-東京',
      kanji: '東京',
      kana: 'とうきょう',
      romaji: 'toukyou',
      meaning: 'Tokyo',
      type: 'noun',
      jlpt: 'N5',
      tags: []
    },
    '雪': {
      id: 'mock-雪',
      kanji: '雪',
      kana: 'ゆき',
      romaji: 'yuki',
      meaning: 'snow',
      type: 'noun',
      jlpt: 'N5',
      tags: []
    },
    '降る': {
      id: 'mock-降る',
      kanji: '降る',
      kana: 'ふる',
      romaji: 'furu',
      meaning: 'to fall (rain, snow), to descend',
      type: 'Godan',
      jlpt: 'N4',
      tags: []
    }
  };

  // Return mock data if available
  if (mockData[query]) {
    return [mockData[query]];
  }

  // Return empty array if not found (no generic mock word)
  return [];
}

// Process Jisho API response
function processJishoResponse(data: JishoAPIResponse, limit: number): JapaneseWord[] {
  return data.data
    .slice(0, limit)
    .map((word, index) => convertJishoWord(word, index))
    .filter(word =>
      word.type === 'Ichidan' ||
      word.type === 'Godan' ||
      word.type === 'Irregular' ||
      word.type === 'i-adjective' ||
      word.type === 'na-adjective' ||
      word.type === 'noun' ||
      word.type === 'adverb' ||
      word.type === 'particle' ||
      word.type === 'other'
    );
}

// Utility function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get common words (verbs and adjectives) for practice - WaniKani primary
export async function getCommonWordsForPractice(limit: number = 50): Promise<JapaneseWord[]> {
  try {
    const wanikaniResults = await getCommonWordsFromWanikani();

    if (wanikaniResults.length > 0) {
      // Shuffle to provide variety on each reload
      const shuffledResults = shuffleArray(wanikaniResults);
      return shuffledResults.slice(0, limit);
    }

    return [];
  } catch (error) {
    console.error('Error fetching common words for practice:', error);
    return [];
  }
}

// Get common verbs for practice - WaniKani primary
export async function getCommonVerbs(limit: number = 50): Promise<JapaneseWord[]> {
  try {
    const wanikaniResults = await getCommonVerbsFromWanikani();

    if (wanikaniResults.length > 0) {
      return wanikaniResults;
    }

    return [];
  } catch (error) {
    console.error('Error fetching common verbs:', error);
    return [];
  }
}

// Get sample words for each JLPT level - WaniKani primary
export async function getWordsByJLPTLevel(level: JLPTLevel, limit: number = 30): Promise<JapaneseWord[]> {
  try {
    const wanikaniResults = await getWordsByJLPTLevelFromWanikani(level);

    if (wanikaniResults.length > 0) {
      return wanikaniResults;
    }

    // Fallback to Jisho if WaniKani has no results for this level
    try {
      const jishoResults = await searchJishoByJLPT(level, limit);

      if (jishoResults.length > 0) {
        return jishoResults;
      }
    } catch (jishoError) {
      console.error(`Jisho fallback failed for ${level}:`, jishoError);
    }

    return [];
  } catch (error) {
    console.error(`Error fetching ${level} words:`, error);
    return [];
  }
}

// Direct search with Jisho API (fallback only)
export async function searchJisho(
  query: string,
  page: number = 1,
  tags?: string[]
): Promise<JishoAPIResponse> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('keyword', query);
    params.append('page', page.toString());

    // Add tags if provided
    if (tags && tags.length > 0) {
      params.append('tags', tags.join(','));
    }

    // First try direct API call (this will work in most cases due to CORS being allowed by Jisho)
    try {
      const response = await axios.get<JishoAPIResponse>(`${JISHO_API_BASE}?${params.toString()}`);
      return response.data;
    } catch (directError) {
      console.warn('Direct Jisho API call failed:', directError);

      // If direct call fails and we're in a deployed environment, try Netlify proxy
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        try {
          const proxyResponse = await jishoAxios.get<JishoAPIResponse>(`?${params.toString()}`);
          return proxyResponse.data;
        } catch (proxyError) {
          console.warn('Netlify proxy also failed:', proxyError);
        }
      }

      // If all else fails, return empty response instead of throwing
      console.warn('All Jisho API methods failed, returning empty response');
      return {
        meta: { status: 200 },
        data: []
      };
    }
  } catch (error) {
    console.error('Error with Jisho API:', error);
    // Return empty response instead of throwing to prevent app crashes
    return {
      meta: { status: 200 },
      data: []
    };
  }
}

// Search for words with specific JLPT level using Jisho API
export async function searchJishoByJLPT(level: JLPTLevel, limit: number = 20): Promise<JapaneseWord[]> {
  try {
    // Convert JLPTLevel to Jisho tag format
    const jlptTag = `jlpt-${level.toLowerCase()}`;

    // Search with JLPT tag
    const response = await searchJisho('', 1, [jlptTag]);

    // Process response
    return processJishoResponse(response, limit);
  } catch (error) {
    console.error(`Error fetching ${level} words from Jisho:`, error);
    return [];
  }
}

// Search for common words using Jisho API
export async function searchJishoCommon(limit: number = 20): Promise<JapaneseWord[]> {
  try {
    // Search with common tag
    const response = await searchJisho('', 1, ['common']);

    // Process response
    return processJishoResponse(response, limit);
  } catch (error) {
    console.error('Error fetching common words from Jisho:', error);
    return [];
  }
}

// Search for words by part of speech using Jisho API
export async function searchJishoByPartOfSpeech(
  partOfSpeech: string,
  limit: number = 20
): Promise<JapaneseWord[]> {
  try {
    // Search with part of speech
    const response = await searchJisho(partOfSpeech, 1);

    // Process response
    return processJishoResponse(response, limit);
  } catch (error) {
    console.error(`Error fetching ${partOfSpeech} words from Jisho:`, error);
    return [];
  }
}
// Force rebuild Tue Aug 12 03:55:09 PM CEST 2025
