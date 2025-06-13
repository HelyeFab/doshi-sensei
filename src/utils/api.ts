import axios from 'axios';
import { JishoAPIResponse, JishoWord, JapaneseWord, WordType, JLPTLevel } from '@/types';
import {
  setWanikaniApiToken,
  searchWanikaniVocabulary,
  getCommonVerbsFromWanikani,
  getWordsByJLPTLevelFromWanikani
} from './wanikaniApi';
import { getFallbackData } from './jishoData';

// Initialize WaniKani API with token from environment variables
const initWanikaniApi = () => {
  // Check for server-side environment variables
  if (typeof process !== 'undefined' && process.env.WANIKANI_API_TOKEN) {
    setWanikaniApiToken(process.env.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from server-side environment variables');
    return;
  }

  // Check for client-side environment variables
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.props?.pageProps?.env?.WANIKANI_API_TOKEN) {
    setWanikaniApiToken((window as any).__NEXT_DATA__.props.pageProps.env.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from client-side environment variables');
    return;
  }

  // Check for Next.js exposed environment variables
  if (typeof window !== 'undefined' && (window as any).ENV?.WANIKANI_API_TOKEN) {
    setWanikaniApiToken((window as any).ENV.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from Next.js exposed environment variables');
    return;
  }

  // Check for Next.js config environment variables
  if (typeof window !== 'undefined' && process.env.WANIKANI_API_TOKEN) {
    setWanikaniApiToken(process.env.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from Next.js config environment variables');
    return;
  }

  console.warn('WaniKani API token not found in environment variables');
};

// Initialize WaniKani API
initWanikaniApi();

// Jisho API base URL (used as fallback)
const JISHO_API_BASE = 'https://jisho.org/api/v1/search/words';

// Create a custom axios instance with CORS proxy for Jisho API (used as fallback)
const jishoAxios = axios.create({
  baseURL: 'https://cors-anywhere.herokuapp.com/https://jisho.org/api/v1/search/words',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': typeof window !== 'undefined' ? window.location.origin : ''
  }
});

// Convert Jisho word to our JapaneseWord format
function convertJishoWord(jishoWord: JishoWord, index: number): JapaneseWord {
  const japanese = jishoWord.japanese[0];
  const sense = jishoWord.senses[0];

  // Determine word type from parts of speech
  const wordType = determineWordType(sense.parts_of_speech);

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

function determineWordType(partsOfSpeech: string[]): WordType {
  const pos = partsOfSpeech.join(' ').toLowerCase();

  // Check for verbs first
  if (pos.includes('ichidan') || pos.includes('ru verb')) {
    return 'Ichidan';
  } else if (pos.includes('godan') || pos.includes('u verb')) {
    return 'Godan';
  } else if (pos.includes('irregular') || pos.includes('suru verb') || pos.includes('kuru verb')) {
    return 'Irregular';
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

// Search words using WaniKani API (with fallback to Jisho API)
export async function searchWords(query: string, limit: number = 20): Promise<JapaneseWord[]> {
  try {
    // First try with WaniKani API
    console.log(`Searching for "${query}" using WaniKani API`);
    const wanikaniResults = await searchWanikaniVocabulary(query, limit);

    if (wanikaniResults.length > 0) {
      console.log(`Found ${wanikaniResults.length} results from WaniKani API`);
      return wanikaniResults;
    }

    console.log('No results from WaniKani API, trying Jisho API');

    // If WaniKani API returns no results, try Jisho API
    try {
      const response = await axios.get<JishoAPIResponse>(`${JISHO_API_BASE}?keyword=${encodeURIComponent(query)}`);

      if (response.data.meta.status !== 200) {
        throw new Error('API request failed');
      }

      return processJishoResponse(response.data, limit);
    } catch (directError) {
      console.warn('Direct Jisho API call failed, trying with CORS proxy:', directError);

      // If direct call fails, try with CORS proxy
      try {
        const proxyResponse = await jishoAxios.get<JishoAPIResponse>(`?keyword=${encodeURIComponent(query)}`);

        if (proxyResponse.data.meta.status !== 200) {
          throw new Error('API request with proxy failed');
        }

        return processJishoResponse(proxyResponse.data, limit);
      } catch (proxyError) {
        console.warn('CORS proxy call failed, using local fallback data:', proxyError);

        // If both direct and proxy calls fail, use local fallback data
        const fallbackData = getFallbackData(query);
        console.log('Using fallback data for query:', query);
        return processJishoResponse(fallbackData, limit);
      }
    }
  } catch (error) {
    console.error('All methods to fetch data failed:', error);
    // Return filtered mock data based on query as last resort
    return mockWords.filter(word =>
      word.kanji.includes(query) ||
      word.kana.includes(query) ||
      word.meaning.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
  }
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

// Mock data for when API calls fail - minimal fallback
const mockWords: JapaneseWord[] = [];

// Get common verbs for practice using WaniKani API
export async function getCommonVerbs(limit: number = 50): Promise<JapaneseWord[]> {
  try {
    // First try with WaniKani API
    console.log('Fetching common verbs from WaniKani API');
    const wanikaniResults = await getCommonVerbsFromWanikani();

    if (wanikaniResults.length > 0) {
      console.log(`Found ${wanikaniResults.length} common verbs from WaniKani API`);
      return wanikaniResults;
    }

    console.log('No results from WaniKani API, trying Jisho API with common tag');

    // Try using Jisho API with common tag
    try {
      const jishoResults = await searchJishoCommon(limit);

      if (jishoResults.length > 0) {
        console.log(`Found ${jishoResults.length} common words from Jisho API`);

        // Filter for verbs only
        const verbs = jishoResults.filter(word =>
          word.type === 'Ichidan' ||
          word.type === 'Godan' ||
          word.type === 'Irregular'
        );

        if (verbs.length > 0) {
          console.log(`Found ${verbs.length} common verbs from Jisho API`);
          return verbs;
        }
      }

      console.log('No results from Jisho API with common tag, using fallback method');

      // If Jisho API with common tag returns no results, use fallback method
      const commonVerbQueries = [
        'common verbs',
        'する',
        'いる',
        'ある',
        '行く',
        '来る',
        '食べる',
        '飲む',
        '見る',
        '聞く',
        '話す',
        '読む',
        '書く',
        '買う',
        '売る',
        '作る'
      ];

      const allWords: JapaneseWord[] = [];
      const queriesPromises = commonVerbQueries.slice(0, 5).map(query =>
        searchWords(query, 10).catch(err => {
          console.warn(`Error fetching words for query "${query}":`, err);
          return [];
        })
      );

      const results = await Promise.all(queriesPromises);
      results.forEach(words => allWords.push(...words));

      // Remove duplicates based on kanji
      const uniqueWords = allWords.filter((word, index, self) =>
        index === self.findIndex(w => w.kanji === word.kanji)
      );

      return uniqueWords.slice(0, 50); // Return top 50 unique words
    } catch (jishoError) {
      console.error('Error fetching common words from Jisho API:', jishoError);

      // If Jisho API fails, use fallback method
      const commonVerbQueries = [
        'common verbs',
        'する',
        'いる',
        'ある',
        '行く',
        '来る',
        '食べる',
        '飲む',
        '見る',
        '聞く',
        '話す',
        '読む',
        '書く',
        '買う',
        '売る',
        '作る'
      ];

      const allWords: JapaneseWord[] = [];
      const queriesPromises = commonVerbQueries.slice(0, 5).map(query =>
        searchWords(query, 10).catch(err => {
          console.warn(`Error fetching words for query "${query}":`, err);
          return [];
        })
      );

      const results = await Promise.all(queriesPromises);
      results.forEach(words => allWords.push(...words));

      // Remove duplicates based on kanji
      const uniqueWords = allWords.filter((word, index, self) =>
        index === self.findIndex(w => w.kanji === word.kanji)
      );

      return uniqueWords.slice(0, 50); // Return top 50 unique words
    }
  } catch (error) {
    console.error('Error fetching common verbs:', error);
    // Return mock data when API call fails
    return mockWords;
  }
}

// Get sample words for each JLPT level using WaniKani API
export async function getWordsByJLPTLevel(level: JLPTLevel, limit: number = 30): Promise<JapaneseWord[]> {
  try {
    // First try with WaniKani API
    console.log(`Fetching ${level} words from WaniKani API`);
    const wanikaniResults = await getWordsByJLPTLevelFromWanikani(level);

    if (wanikaniResults.length > 0) {
      console.log(`Found ${wanikaniResults.length} ${level} words from WaniKani API`);
      return wanikaniResults;
    }

    console.log('No results from WaniKani API, trying Jisho API with JLPT tag');

    // Try using Jisho API with JLPT tag
    try {
      const jishoResults = await searchJishoByJLPT(level, limit);

      if (jishoResults.length > 0) {
        console.log(`Found ${jishoResults.length} ${level} words from Jisho API`);
        return jishoResults;
      }

      console.log('No results from Jisho API with JLPT tag, using fallback method');

      // If Jisho API with JLPT tag returns no results, use fallback method
      const levelQueries = {
        'N5': ['JLPT N5 verbs', 'basic verbs'],
        'N4': ['JLPT N4 verbs', 'intermediate verbs'],
        'N3': ['JLPT N3 verbs'],
        'N2': ['JLPT N2 verbs'],
        'N1': ['JLPT N1 verbs', 'advanced verbs']
      };

      const queries = levelQueries[level];
      const queriesPromises = queries.map(query =>
        searchWords(query, 15).catch(err => {
          console.warn(`Error fetching words for JLPT ${level} query "${query}":`, err);
          return [];
        })
      );

      const results = await Promise.all(queriesPromises);
      const allWords: JapaneseWord[] = [];
      results.forEach(words => allWords.push(...words));

      return allWords.filter(word => word.jlpt === level).slice(0, 30);
    } catch (jishoError) {
      console.error(`Error fetching ${level} words from Jisho API:`, jishoError);

      // If Jisho API fails, use fallback method
      const levelQueries = {
        'N5': ['JLPT N5 verbs', 'basic verbs'],
        'N4': ['JLPT N4 verbs', 'intermediate verbs'],
        'N3': ['JLPT N3 verbs'],
        'N2': ['JLPT N2 verbs'],
        'N1': ['JLPT N1 verbs', 'advanced verbs']
      };

      const queries = levelQueries[level];
      const queriesPromises = queries.map(query =>
        searchWords(query, 15).catch(err => {
          console.warn(`Error fetching words for JLPT ${level} query "${query}":`, err);
          return [];
        })
      );

      const results = await Promise.all(queriesPromises);
      const allWords: JapaneseWord[] = [];
      results.forEach(words => allWords.push(...words));

      return allWords.filter(word => word.jlpt === level).slice(0, 30);
    }
  } catch (error) {
    console.error(`Error fetching ${level} words:`, error);
    // Return filtered mock data based on JLPT level
    return mockWords.filter(word => word.jlpt === level);
  }
}

// Direct search with Jisho API (for specific word lookup)
export async function searchJisho(
  query: string,
  page: number = 1,
  tags?: string[]
): Promise<JishoAPIResponse> {
  try {
    // Build query parameters
    let params = `keyword=${encodeURIComponent(query)}&page=${page}`;

    // Add tags if provided
    if (tags && tags.length > 0) {
      params += `&tags=${tags.map(tag => encodeURIComponent(tag)).join(',')}`;
    }

    // First try direct API call
    try {
      const response = await axios.get<JishoAPIResponse>(`${JISHO_API_BASE}?${params}`);
      return response.data;
    } catch (directError) {
      console.warn('Direct Jisho API call failed, trying with CORS proxy:', directError);

      // If direct call fails, try with CORS proxy
      const proxyResponse = await jishoAxios.get<JishoAPIResponse>(`?${params}`);
      return proxyResponse.data;
    }
  } catch (error) {
    console.error('Error with Jisho API:', error);
    throw new Error('Failed to fetch data from Jisho API');
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
    return mockWords.filter(word => word.jlpt === level).slice(0, limit);
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
    return mockWords.slice(0, limit);
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
    return mockWords.slice(0, limit);
  }
}
