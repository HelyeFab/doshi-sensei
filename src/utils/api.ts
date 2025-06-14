import axios from 'axios';
import { JishoAPIResponse, JishoWord, JapaneseWord, WordType, JLPTLevel } from '@/types';
// JMdict imports - primary dictionary source
import {
  searchJMdictVocabulary,
  getCommonVerbsFromJMdict,
  getCommonWordsFromJMdict,
  getWordsByJLPTLevelFromJMdict
} from './jmdictApi';
// WaniKani imports - fallback dictionary source
import {
  setWanikaniApiToken,
  searchWanikaniVocabulary,
  getCommonVerbsFromWanikani,
  getCommonWordsFromWanikani,
  getWordsByJLPTLevelFromWanikani
} from './wanikaniApi';

// WaniKani API initialization - fallback use only
const initWanikaniApi = () => {
  // Check for server-side environment variables
  if (typeof process !== 'undefined' && process.env.WANIKANI_API_TOKEN) {
    setWanikaniApiToken(process.env.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from server-side environment variables (fallback only)');
    return;
  }

  // Check for client-side environment variables
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.props?.pageProps?.env?.WANIKANI_API_TOKEN) {
    setWanikaniApiToken((window as any).__NEXT_DATA__.props.pageProps.env.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from client-side environment variables (fallback only)');
    return;
  }

  // Check for Next.js exposed environment variables
  if (typeof window !== 'undefined' && (window as any).ENV?.WANIKANI_API_TOKEN) {
    setWanikaniApiToken((window as any).ENV.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from Next.js exposed environment variables (fallback only)');
    return;
  }

  // Check for Next.js config environment variables
  if (typeof window !== 'undefined' && process.env.WANIKANI_API_TOKEN) {
    setWanikaniApiToken(process.env.WANIKANI_API_TOKEN);
    console.log('WaniKani API token set from Next.js config environment variables (fallback only)');
    return;
  }

  console.warn('WaniKani API token not found in environment variables (fallback source will be unavailable)');
};

// Initialize WaniKani API for fallback
initWanikaniApi();

// Jisho API base URL (used as fallback)
const JISHO_API_BASE = 'https://jisho.org/api/v1/search/words';

// Netlify function proxy endpoint for Jisho API (used as fallback)
const JISHO_PROXY_BASE = '/.netlify/functions/jisho-proxy';

// Create a custom axios instance for Jisho proxy (used as fallback)
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

// Find exact match in search results
function findExactMatch(words: JapaneseWord[], query: string): JapaneseWord | null {
  const queryLower = query.toLowerCase().trim();

  // Check for exact matches in order of priority
  for (const word of words) {
    // Exact match on kanji
    if (word.kanji.toLowerCase() === queryLower) {
      return word;
    }

    // Exact match on kana
    if (word.kana.toLowerCase() === queryLower) {
      return word;
    }

    // Exact match on romaji
    if (word.romaji.toLowerCase() === queryLower) {
      return word;
    }

    // Exact match as the primary meaning (first in comma-separated list)
    const meanings = word.meaning.toLowerCase().split(',').map(m => m.trim());
    if (meanings[0] === queryLower) {
      return word;
    }

    // Exact match as any complete meaning in comma-separated list
    if (meanings.includes(queryLower)) {
      return word;
    }
  }

  return null;
}

// Prioritize exact matches in search results
function prioritizeExactMatches(words: JapaneseWord[], query: string): JapaneseWord[] {
  const queryLower = query.toLowerCase();

  return words.sort((a, b) => {
    // Exact match on kanji gets highest priority
    const aKanjiExact = a.kanji.toLowerCase() === queryLower;
    const bKanjiExact = b.kanji.toLowerCase() === queryLower;
    if (aKanjiExact && !bKanjiExact) return -1;
    if (!aKanjiExact && bKanjiExact) return 1;

    // Exact match on kana gets second priority
    const aKanaExact = a.kana.toLowerCase() === queryLower;
    const bKanaExact = b.kana.toLowerCase() === queryLower;
    if (aKanaExact && !bKanaExact) return -1;
    if (!aKanaExact && bKanaExact) return 1;

    // Exact match on romaji gets third priority
    const aRomajiExact = a.romaji.toLowerCase() === queryLower;
    const bRomajiExact = b.romaji.toLowerCase() === queryLower;
    if (aRomajiExact && !bRomajiExact) return -1;
    if (!aRomajiExact && bRomajiExact) return 1;

    // For English searches, prioritize words where the query is a complete word in meaning
    const aMeaningWords = a.meaning.toLowerCase().split(/[,\s]+/).map(w => w.trim());
    const bMeaningWords = b.meaning.toLowerCase().split(/[,\s]+/).map(w => w.trim());
    const aExactMeaningWord = aMeaningWords.includes(queryLower);
    const bExactMeaningWord = bMeaningWords.includes(queryLower);
    if (aExactMeaningWord && !bExactMeaningWord) return -1;
    if (!aExactMeaningWord && bExactMeaningWord) return 1;

    // Exact match in meaning gets fourth priority (for comma-separated meanings)
    const aMeaningExact = a.meaning.toLowerCase().split(', ').includes(queryLower);
    const bMeaningExact = b.meaning.toLowerCase().split(', ').includes(queryLower);
    if (aMeaningExact && !bMeaningExact) return -1;
    if (!aMeaningExact && bMeaningExact) return 1;

    // Prioritize meanings that start with the query
    const aMeaningStarts = a.meaning.toLowerCase().startsWith(queryLower);
    const bMeaningStarts = b.meaning.toLowerCase().startsWith(queryLower);
    if (aMeaningStarts && !bMeaningStarts) return -1;
    if (!aMeaningStarts && bMeaningStarts) return 1;

    // Prioritize shorter meanings (more likely to be the primary meaning)
    if (a.meaning.length !== b.meaning.length) {
      return a.meaning.length - b.meaning.length;
    }

    // Words that start with the query get higher priority than those that just contain it
    const aKanjiStarts = a.kanji.toLowerCase().startsWith(queryLower);
    const bKanjiStarts = b.kanji.toLowerCase().startsWith(queryLower);
    if (aKanjiStarts && !bKanjiStarts) return -1;
    if (!aKanjiStarts && bKanjiStarts) return 1;

    const aKanaStarts = a.kana.toLowerCase().startsWith(queryLower);
    const bKanaStarts = b.kana.toLowerCase().startsWith(queryLower);
    if (aKanaStarts && !bKanaStarts) return -1;
    if (!aKanaStarts && bKanaStarts) return 1;

    const aRomajiStarts = a.romaji.toLowerCase().startsWith(queryLower);
    const bRomajiStarts = b.romaji.toLowerCase().startsWith(queryLower);
    if (aRomajiStarts && !bRomajiStarts) return -1;
    if (!aRomajiStarts && bRomajiStarts) return 1;

    // Shorter words get priority (more likely to be the exact word they're looking for)
    if (a.kanji.length !== b.kanji.length) {
      return a.kanji.length - b.kanji.length;
    }

    // Keep original order for same priority
    return 0;
  });
}

// Search words using preferred source with fallback - JMdict primary, WaniKani/Jisho fallback
export async function searchWords(query: string, limit: number = 20, preferredSource: 'wanikani' | 'jisho' = 'jisho'): Promise<JapaneseWord[]> {
  try {
    // Primary search with JMdict (our custom parser - always first)
    try {
      console.log(`Searching for "${query}" using JMdict (primary source)`);
      const jmdictResults = await searchJMdictVocabulary(query, limit);

      if (jmdictResults.length > 0) {
        console.log(`Found ${jmdictResults.length} results from JMdict`);

        // Check for exact matches first
        const exactMatch = findExactMatch(jmdictResults, query);
        if (exactMatch) {
          console.log(`Found exact match from JMdict: ${exactMatch.kanji} (${exactMatch.kana}) - ${exactMatch.meaning}`);
          return [exactMatch];
        }

        return prioritizeExactMatches(jmdictResults, query);
      }

      console.log('No results from JMdict, trying fallback sources');
    } catch (error) {
      console.error('JMdict search failed, trying fallback sources:', error);
    }

    // Fallback based on preferred source
    if (preferredSource === 'jisho') {
      // Try Jisho API first as fallback
      try {
        console.log(`Fallback 1: Searching for "${query}" using Jisho API`);
        const jishoResponse = await searchJisho(query);
        const jishoResults = processJishoResponse(jishoResponse, limit);

        if (jishoResults.length > 0) {
          console.log(`Found ${jishoResults.length} results from Jisho API`);

          // Check for exact matches first
          const exactMatch = findExactMatch(jishoResults, query);
          if (exactMatch) {
            console.log(`Found exact match from Jisho: ${exactMatch.kanji} (${exactMatch.kana}) - ${exactMatch.meaning}`);
            return [exactMatch];
          }

          return prioritizeExactMatches(jishoResults, query);
        }

        console.log('No results from Jisho API, trying WaniKani fallback');
      } catch (error) {
        console.error('Jisho search failed, trying WaniKani fallback:', error);
      }

      // Final fallback to WaniKani
      try {
        console.log(`Fallback 2: Searching for "${query}" using WaniKani API`);
        const wanikaniResults = await searchWanikaniVocabulary(query, limit);

        if (wanikaniResults.length > 0) {
          console.log(`Found ${wanikaniResults.length} results from WaniKani fallback`);

          // Check for exact matches first
          const exactMatch = findExactMatch(wanikaniResults, query);
          if (exactMatch) {
            console.log(`Found exact match from WaniKani: ${exactMatch.kanji} (${exactMatch.kana}) - ${exactMatch.meaning}`);
            return [exactMatch];
          }

          return prioritizeExactMatches(wanikaniResults, query);
        }
      } catch (wanikaniError) {
        console.error('WaniKani fallback also failed:', wanikaniError);
      }
    } else {
      // Try WaniKani API first as fallback
      try {
        console.log(`Fallback 1: Searching for "${query}" using WaniKani API`);
        const wanikaniResults = await searchWanikaniVocabulary(query, limit);

        if (wanikaniResults.length > 0) {
          console.log(`Found ${wanikaniResults.length} results from WaniKani API`);

          // Check for exact matches first
          const exactMatch = findExactMatch(wanikaniResults, query);
          if (exactMatch) {
            console.log(`Found exact match from WaniKani: ${exactMatch.kanji} (${exactMatch.kana}) - ${exactMatch.meaning}`);
            return [exactMatch];
          }

          return prioritizeExactMatches(wanikaniResults, query);
        }

        console.log('No results from WaniKani API, trying Jisho fallback');
      } catch (error) {
        console.error('WaniKani search failed, trying Jisho fallback:', error);
      }

      // Final fallback to Jisho
      try {
        console.log(`Fallback 2: Searching for "${query}" using Jisho API`);
        const jishoResponse = await searchJisho(query);
        const jishoResults = processJishoResponse(jishoResponse, limit);

        if (jishoResults.length > 0) {
          console.log(`Found ${jishoResults.length} results from Jisho fallback`);

          // Check for exact matches first
          const exactMatch = findExactMatch(jishoResults, query);
          if (exactMatch) {
            console.log(`Found exact match from Jisho: ${exactMatch.kanji} (${exactMatch.kana}) - ${exactMatch.meaning}`);
            return [exactMatch];
          }

          return prioritizeExactMatches(jishoResults, query);
        }
      } catch (jishoError) {
        console.error('Jisho search also failed:', jishoError);
      }
    }

    console.log('No results from any search method');
    return [];

  } catch (error) {
    console.error('All search methods failed:', error);
    return [];
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

// Get common words (verbs and adjectives) for practice - JMdict primary, WaniKani/Jisho fallback
export async function getCommonWordsForPractice(limit: number = 50): Promise<JapaneseWord[]> {
  try {
    // JMdict approach - primary
    try {
      console.log('Fetching common verbs and adjectives from JMdict (primary source)');
      const jmdictResults = await getCommonWordsFromJMdict();

      if (jmdictResults.length > 0) {
        console.log(`Found ${jmdictResults.length} common words from JMdict`);
        return jmdictResults;
      }

      console.log('No results from JMdict, trying WaniKani fallback');
    } catch (error) {
      console.error('JMdict failed, trying WaniKani fallback:', error);
    }

    // WaniKani fallback
    try {
      console.log('Fallback: Fetching common verbs and adjectives from WaniKani API');
      const wanikaniResults = await getCommonWordsFromWanikani();

      if (wanikaniResults.length > 0) {
        console.log(`Found ${wanikaniResults.length} common words from WaniKani API`);
        return wanikaniResults;
      }

      console.log('No results from WaniKani API, trying Jisho API with common tag');
    } catch (error) {
      console.error('WaniKani API failed, trying Jisho fallback:', error);
    }

    console.log('Fetching common words using Jisho fallback');

    // Try using Jisho API with common tag
    try {
      const jishoResults = await searchJishoCommon(limit);

      if (jishoResults.length > 0) {
        console.log(`Found ${jishoResults.length} common words from Jisho API`);

        // Filter for verbs and adjectives only
        const practiceWords = jishoResults.filter(word =>
          word.type === 'Ichidan' ||
          word.type === 'Godan' ||
          word.type === 'Irregular' ||
          word.type === 'i-adjective' ||
          word.type === 'na-adjective'
        );

        if (practiceWords.length > 0) {
          console.log(`Found ${practiceWords.length} common verbs and adjectives from Jisho API`);
          return practiceWords;
        }
      }

      console.log('No results from Jisho API with common tag, using fallback method');

      // If Jisho API with common tag returns no results, use fallback method
      const commonWordQueries = [
        'common verbs',
        'common adjectives',
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
        '作る',
        '大きい',
        '小さい',
        '高い',
        '安い',
        '新しい',
        '古い',
        '美しい',
        '綺麗',
        '便利',
        '簡単'
      ];

      const allWords: JapaneseWord[] = [];
      const queriesPromises = commonWordQueries.slice(0, 8).map(query =>
        searchWords(query, 8).catch(err => {
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

      // Filter for practice-relevant words (verbs and adjectives)
      const practiceWords = uniqueWords.filter(word =>
        word.type === 'Ichidan' ||
        word.type === 'Godan' ||
        word.type === 'Irregular' ||
        word.type === 'i-adjective' ||
        word.type === 'na-adjective'
      );

      return practiceWords.slice(0, 50); // Return top 50 unique words
    } catch (jishoError) {
      console.error('Error fetching common words from Jisho API:', jishoError);
      return [];
    }
  } catch (error) {
    console.error('Error fetching common words for practice:', error);
    return [];
  }
}

// Get common verbs for practice - JMdict primary, WaniKani/Jisho fallback
export async function getCommonVerbs(limit: number = 50): Promise<JapaneseWord[]> {
  try {
    // JMdict approach - primary
    try {
      console.log('Fetching common verbs from JMdict (primary source)');
      const jmdictResults = await getCommonVerbsFromJMdict();

      if (jmdictResults.length > 0) {
        console.log(`Found ${jmdictResults.length} common verbs from JMdict`);
        return jmdictResults;
      }

      console.log('No results from JMdict, trying WaniKani fallback');
    } catch (error) {
      console.error('JMdict failed, trying WaniKani fallback:', error);
    }

    // WaniKani fallback
    try {
      console.log('Fallback: Fetching common verbs from WaniKani API');
      const wanikaniResults = await getCommonVerbsFromWanikani();

      if (wanikaniResults.length > 0) {
        console.log(`Found ${wanikaniResults.length} common verbs from WaniKani API`);
        return wanikaniResults;
      }

      console.log('No results from WaniKani API, trying Jisho API with common tag');
    } catch (error) {
      console.error('WaniKani API failed, trying Jisho fallback:', error);
    }

    console.log('Fetching common verbs using Jisho fallback');

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
      return [];
    }
  } catch (error) {
    console.error('Error fetching common verbs:', error);
    return [];
  }
}

// Get sample words for each JLPT level - JMdict primary, WaniKani/Jisho fallback
export async function getWordsByJLPTLevel(level: JLPTLevel, limit: number = 30): Promise<JapaneseWord[]> {
  try {
    // JMdict approach - primary
    try {
      console.log(`Fetching ${level} words from JMdict (primary source)`);
      const jmdictResults = await getWordsByJLPTLevelFromJMdict(level);

      if (jmdictResults.length > 0) {
        console.log(`Found ${jmdictResults.length} ${level} words from JMdict`);
        return jmdictResults;
      }

      console.log('No results from JMdict, trying WaniKani fallback');
    } catch (error) {
      console.error('JMdict failed, trying WaniKani fallback:', error);
    }

    // WaniKani fallback
    try {
      console.log(`Fallback: Fetching ${level} words from WaniKani API`);
      const wanikaniResults = await getWordsByJLPTLevelFromWanikani(level);

      if (wanikaniResults.length > 0) {
        console.log(`Found ${wanikaniResults.length} ${level} words from WaniKani API`);
        return wanikaniResults;
      }

      console.log('No results from WaniKani API, trying Jisho API with JLPT tag');
    } catch (error) {
      console.error('WaniKani API failed, trying Jisho fallback:', error);
    }

    console.log(`Fetching ${level} words using Jisho fallback`);

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
      return [];
    }
  } catch (error) {
    console.error(`Error fetching ${level} words:`, error);
    return [];
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
          console.log('Trying Netlify proxy fallback');
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
