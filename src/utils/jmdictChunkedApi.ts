import { JapaneseWord } from '@/types';

// Cache for chunked JMdict results
let cachedChunkedResults: JapaneseWord[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Interface for chunked API response
interface ChunkedJMdictResponse {
  query: string;
  results: JapaneseWord[];
  count: number;
  source: string;
  error?: string;
}

// Search JMdict vocabulary using chunked approach
export async function searchJMdictChunkedVocabulary(query: string, limit: number = 20): Promise<JapaneseWord[]> {
  try {
    console.log(`Searching chunked JMdict for: "${query}"`);

    // Try our new Next.js API route first
    try {
      const response = await fetch(`/api/jmdict?action=search&query=${encodeURIComponent(query)}&limit=${limit}`);
      const result = await response.json();

      if (!result.error && result.results && result.results.length > 0) {
        console.log(`Found ${result.results.length} results from Next.js JMdict API`);
        // Convert the basic API results to JapaneseWord format
        const convertedResults = result.results.map((item: any, index: number) => ({
          id: item.id || `jmdict_${index}`,
          word: item.kanji || item.reading,
          reading: item.reading,
          meanings: item.meanings || [],
          type: 'Unknown' as const,
          jlpt: undefined,
          wanikaniLevel: undefined,
        }));
        return convertedResults;
      } else {
        console.log('Next.js JMdict API returned no results or error:', result.error);
      }
    } catch (apiError) {
      console.warn('Next.js JMdict API failed:', apiError);
    }

    // Check if we're in production (has Netlify functions) - fallback
    const isProduction = typeof window !== 'undefined' &&
                         window.location.hostname !== 'localhost' &&
                         window.location.hostname !== '127.0.0.1';

    if (isProduction) {
      // Try to use chunked Netlify function in production as fallback
      try {
        const response = await fetch(`/.netlify/functions/jmdict-chunked?action=search&query=${encodeURIComponent(query)}&limit=${limit}`);
        const result: ChunkedJMdictResponse = await response.json();

        if (!result.error && result.results && result.results.length > 0) {
          console.log(`Found ${result.results.length} results from chunked JMdict`);
          return result.results;
        } else {
          console.log('Chunked JMdict function returned no results or error:', result.error);
        }
      } catch (netlifyError) {
        console.warn('Chunked JMdict function failed:', netlifyError);
      }
    }

    // Return empty array since chunked system is the primary approach
    // The main API will fall back to other sources
    return [];

  } catch (error) {
    console.error('Error searching chunked JMdict vocabulary:', error);
    return [];
  }
}

// Get common words for practice using chunked approach
export async function getCommonWordsFromJMdictChunked(): Promise<JapaneseWord[]> {
  try {
    console.log('Fetching common words from chunked JMdict');

    // Check cache first
    const now = Date.now();
    if (cachedChunkedResults && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Using cached chunked results');
      return cachedChunkedResults;
    }

    // Try multiple common search terms to get a variety of words
    const commonSearchTerms = [
      '食べる', '飲む', '見る', '行く', '来る', 'する', '話す', '読む', '書く', '買う',
      '大きい', '小さい', '高い', '安い', '新しい', '古い', '美しい', '綺麗', '便利',
      '水', '手', '世界', 'こんにちは'
    ];

    const allResults: JapaneseWord[] = [];

    // Search for a few terms to build a common words list
    for (const term of commonSearchTerms.slice(0, 8)) {
      try {
        const results = await searchJMdictChunkedVocabulary(term, 5);
        allResults.push(...results);

        // Add a small delay to avoid overwhelming the function
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Error searching for ${term}:`, error);
      }
    }

    // Remove duplicates and filter for practice words (verbs and adjectives)
    const uniqueWords = allResults.filter((word, index, self) =>
      index === self.findIndex(w => w.id === word.id)
    );

    const practiceWords = uniqueWords.filter(word =>
      word.type === 'Ichidan' ||
      word.type === 'Godan' ||
      word.type === 'Irregular' ||
      word.type === 'i-adjective' ||
      word.type === 'na-adjective'
    );

    // Cache the results
    cachedChunkedResults = practiceWords;
    cacheTimestamp = now;

    console.log(`Found ${practiceWords.length} common practice words from chunked JMdict`);
    return practiceWords;

  } catch (error) {
    console.error('Error getting common words from chunked JMdict:', error);
    return [];
  }
}

// Get common verbs using chunked approach
export async function getCommonVerbsFromJMdictChunked(): Promise<JapaneseWord[]> {
  try {
    console.log('Fetching common verbs from chunked JMdict');

    const commonVerbs = [
      '食べる', '飲む', '見る', '行く', '来る', 'する', '話す', '読む', '書く', '買う',
      '売る', '作る', '聞く', '立つ', '座る', '歩く', '走る', '泳ぐ', '歌う', '踊る'
    ];

    const allResults: JapaneseWord[] = [];

    for (const verb of commonVerbs.slice(0, 10)) {
      try {
        const results = await searchJMdictChunkedVocabulary(verb, 3);
        allResults.push(...results);

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Error searching for verb ${verb}:`, error);
      }
    }

    // Remove duplicates and filter for verbs only
    const uniqueWords = allResults.filter((word, index, self) =>
      index === self.findIndex(w => w.id === word.id)
    );

    const verbs = uniqueWords.filter(word =>
      word.type === 'Ichidan' ||
      word.type === 'Godan' ||
      word.type === 'Irregular'
    );

    console.log(`Found ${verbs.length} common verbs from chunked JMdict`);
    return verbs;

  } catch (error) {
    console.error('Error getting common verbs from chunked JMdict:', error);
    return [];
  }
}

// Test chunked system availability
export async function testChunkedJMdictSystem(): Promise<{ available: boolean; message: string; stats?: any }> {
  try {
    console.log('Testing chunked JMdict system...');

    const response = await fetch('/.netlify/functions/jmdict-chunked?action=test');
    const result = await response.json();

    if (result.success) {
      return {
        available: true,
        message: result.message,
        stats: result.indexStats
      };
    } else {
      return {
        available: false,
        message: result.message || 'Chunked system not available'
      };
    }

  } catch (error) {
    console.error('Error testing chunked JMdict system:', error);
    return {
      available: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Get chunked system statistics
export async function getChunkedJMdictStats(): Promise<any> {
  try {
    const response = await fetch('/.netlify/functions/jmdict-chunked?action=stats');
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error getting chunked JMdict stats:', error);
    return null;
  }
}

// Clear cached results (useful for development)
export function clearChunkedCache(): void {
  cachedChunkedResults = null;
  cacheTimestamp = 0;
  console.log('Chunked JMdict cache cleared');
}
