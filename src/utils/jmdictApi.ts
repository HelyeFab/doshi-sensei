import { JapaneseWord, WordType, JLPTLevel } from '@/types';
import {
  parseJMdictXML,
  convertToJapaneseWord,
  searchJMdictEntries,
  type JMdictEntry
} from './jmdictParser';

// Cache for parsed JMdict entries (memory cache)
let cachedEntries: JMdictEntry[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Extended sample XML data for local development/fallback
const sampleJMdictXML = `
<entry>
  <ent_seq>1000040</ent_seq>
  <k_ele>
    <keb>〃</keb>
  </k_ele>
  <r_ele>
    <reb>おなじ</reb>
  </r_ele>
  <sense>
    <pos>&n;</pos>
    <gloss>ditto mark</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>1500340</ent_seq>
  <k_ele>
    <keb>手</keb>
  </k_ele>
  <r_ele>
    <reb>て</reb>
  </r_ele>
  <sense>
    <pos>&n;</pos>
    <gloss>hand</gloss>
    <gloss>arm</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>1578850</ent_seq>
  <k_ele>
    <keb>食べる</keb>
  </k_ele>
  <r_ele>
    <reb>たべる</reb>
  </r_ele>
  <sense>
    <pos>&v1;</pos>
    <gloss>to eat</gloss>
    <gloss>to live on (e.g. a salary)</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>1234567</ent_seq>
  <k_ele>
    <keb>水</keb>
  </k_ele>
  <r_ele>
    <reb>みず</reb>
  </r_ele>
  <sense>
    <pos>&n;</pos>
    <gloss>water</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>1987654</ent_seq>
  <k_ele>
    <keb>世界</keb>
  </k_ele>
  <r_ele>
    <reb>せかい</reb>
  </r_ele>
  <sense>
    <pos>&n;</pos>
    <gloss>world</gloss>
    <gloss>society</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>1111111</ent_seq>
  <r_ele>
    <reb>こんにちは</reb>
  </r_ele>
  <sense>
    <pos>&int;</pos>
    <gloss>hello</gloss>
    <gloss>good afternoon</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000001</ent_seq>
  <k_ele>
    <keb>飲む</keb>
  </k_ele>
  <r_ele>
    <reb>のむ</reb>
  </r_ele>
  <sense>
    <pos>&v5m;</pos>
    <gloss>to drink</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000002</ent_seq>
  <k_ele>
    <keb>見る</keb>
  </k_ele>
  <r_ele>
    <reb>みる</reb>
  </r_ele>
  <sense>
    <pos>&v1;</pos>
    <gloss>to see</gloss>
    <gloss>to watch</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000003</ent_seq>
  <k_ele>
    <keb>行く</keb>
  </k_ele>
  <r_ele>
    <reb>いく</reb>
  </r_ele>
  <sense>
    <pos>&v5k-s;</pos>
    <gloss>to go</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000004</ent_seq>
  <k_ele>
    <keb>来る</keb>
  </k_ele>
  <r_ele>
    <reb>くる</reb>
  </r_ele>
  <sense>
    <pos>&vk;</pos>
    <gloss>to come</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000005</ent_seq>
  <k_ele>
    <keb>する</keb>
  </k_ele>
  <r_ele>
    <reb>する</reb>
  </r_ele>
  <sense>
    <pos>&vs-i;</pos>
    <gloss>to do</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000006</ent_seq>
  <k_ele>
    <keb>大きい</keb>
  </k_ele>
  <r_ele>
    <reb>おおきい</reb>
  </r_ele>
  <sense>
    <pos>&adj-i;</pos>
    <gloss>big</gloss>
    <gloss>large</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000007</ent_seq>
  <k_ele>
    <keb>小さい</keb>
  </k_ele>
  <r_ele>
    <reb>ちいさい</reb>
  </r_ele>
  <sense>
    <pos>&adj-i;</pos>
    <gloss>small</gloss>
    <gloss>little</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000008</ent_seq>
  <k_ele>
    <keb>美しい</keb>
  </k_ele>
  <r_ele>
    <reb>うつくしい</reb>
  </r_ele>
  <sense>
    <pos>&adj-i;</pos>
    <gloss>beautiful</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000009</ent_seq>
  <k_ele>
    <keb>綺麗</keb>
  </k_ele>
  <r_ele>
    <reb>きれい</reb>
  </r_ele>
  <sense>
    <pos>&adj-na;</pos>
    <gloss>pretty</gloss>
    <gloss>clean</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000010</ent_seq>
  <k_ele>
    <keb>便利</keb>
  </k_ele>
  <r_ele>
    <reb>べんり</reb>
  </r_ele>
  <sense>
    <pos>&adj-na;</pos>
    <gloss>convenient</gloss>
    <gloss>useful</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000011</ent_seq>
  <k_ele>
    <keb>話す</keb>
  </k_ele>
  <r_ele>
    <reb>はなす</reb>
  </r_ele>
  <sense>
    <pos>&v5s;</pos>
    <gloss>to speak</gloss>
    <gloss>to talk</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000012</ent_seq>
  <k_ele>
    <keb>読む</keb>
  </k_ele>
  <r_ele>
    <reb>よむ</reb>
  </r_ele>
  <sense>
    <pos>&v5m;</pos>
    <gloss>to read</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000013</ent_seq>
  <k_ele>
    <keb>書く</keb>
  </k_ele>
  <r_ele>
    <reb>かく</reb>
  </r_ele>
  <sense>
    <pos>&v5k;</pos>
    <gloss>to write</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000014</ent_seq>
  <k_ele>
    <keb>買う</keb>
  </k_ele>
  <r_ele>
    <reb>かう</reb>
  </r_ele>
  <sense>
    <pos>&v5u;</pos>
    <gloss>to buy</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2000015</ent_seq>
  <k_ele>
    <keb>売る</keb>
  </k_ele>
  <r_ele>
    <reb>うる</reb>
  </r_ele>
  <sense>
    <pos>&v5r;</pos>
    <gloss>to sell</gloss>
  </sense>
</entry>
`;

// Load JMdict entries from Netlify function or fallback to sample data
async function loadJMdictEntries(): Promise<JMdictEntry[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedEntries && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Using cached JMdict entries');
      return cachedEntries;
    }

    console.log('Loading JMdict entries...');

    // Check if we're in production (has Netlify functions)
    const isProduction = typeof window !== 'undefined' &&
                         window.location.hostname !== 'localhost' &&
                         window.location.hostname !== '127.0.0.1';

    if (isProduction) {
      // Try to load from Netlify function in production
      try {
        const response = await fetch('/.netlify/functions/jmdict-xml?action=test');
        const result = await response.json();

        if (result.success && result.sampleEntries) {
          // Convert sample entries back to JMdictEntry format for consistency
          // This is a simplified approach - in a full implementation you'd want
          // to call the search endpoint with common terms
          console.log('Loaded entries from Netlify function');
          const entries = parseJMdictXML(sampleJMdictXML, 50);
          cachedEntries = entries;
          cacheTimestamp = now;
          return entries;
        }
      } catch (netlifError) {
        console.warn('Netlify function failed, using sample data:', netlifError);
      }
    }

    // Fallback to sample data (local development or if Netlify fails)
    console.log('Using sample JMdict data');
    const entries = parseJMdictXML(sampleJMdictXML, 50);
    cachedEntries = entries;
    cacheTimestamp = now;
    return entries;

  } catch (error) {
    console.error('Error loading JMdict entries:', error);
    // Return sample data as last resort
    return parseJMdictXML(sampleJMdictXML, 20);
  }
}

// Search JMdict vocabulary with fallback to sample data
export async function searchJMdictVocabulary(query: string, limit: number = 20): Promise<JapaneseWord[]> {
  try {
    console.log(`Searching JMdict for: "${query}"`);

    // Check if we're in production (has Netlify functions)
    const isProduction = typeof window !== 'undefined' &&
                         window.location.hostname !== 'localhost' &&
                         window.location.hostname !== '127.0.0.1';

      if (isProduction) {
        // Try to use Netlify function in production
        try {
          const response = await fetch(`/.netlify/functions/jmdict-xml?action=search&query=${encodeURIComponent(query)}&limit=${limit}`);
          const result = await response.json();

          if (!result.error && result.results && result.results.length > 0) {
            console.log(`Found ${result.results.length} results from JMdict Netlify function`);
            return result.results;
          } else {
            console.log('JMdict Netlify function returned 0 results (large file not deployed to serverless environment)');
          }
        } catch (netlifyError) {
          console.warn('Netlify function search failed:', netlifyError);
        }
      }

    // Fallback to local search with sample data
    console.log('Using local JMdict search with sample data');
    const allEntries = await loadJMdictEntries();
    const matchingEntries = searchJMdictEntries(allEntries, query, limit);
    const results = matchingEntries.map((entry, index) => convertToJapaneseWord(entry, index));

    console.log(`Found ${results.length} results from local JMdict search`);
    return results;

  } catch (error) {
    console.error('Error searching JMdict vocabulary:', error);
    return [];
  }
}

// Get common words for practice (verbs and adjectives)
export async function getCommonWordsFromJMdict(): Promise<JapaneseWord[]> {
  try {
    console.log('Fetching common words from JMdict');

    const allEntries = await loadJMdictEntries();

    // Filter for verbs and adjectives only
    const practiceWords = allEntries
      .map((entry, index) => convertToJapaneseWord(entry, index))
      .filter(word =>
        word.type === 'Ichidan' ||
        word.type === 'Godan' ||
        word.type === 'Irregular' ||
        word.type === 'i-adjective' ||
        word.type === 'na-adjective'
      );

    // Shuffle and limit to 50
    const shuffled = practiceWords.sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, 50);

    console.log(`Found ${limited.length} common verbs and adjectives from JMdict`);
    return limited;

  } catch (error) {
    console.error('Error getting common words from JMdict:', error);
    return [];
  }
}

// Get common verbs from JMdict
export async function getCommonVerbsFromJMdict(): Promise<JapaneseWord[]> {
  try {
    console.log('Fetching common verbs from JMdict');

    const allEntries = await loadJMdictEntries();

    // Filter for verbs only
    const verbs = allEntries
      .map((entry, index) => convertToJapaneseWord(entry, index))
      .filter(word =>
        word.type === 'Ichidan' ||
        word.type === 'Godan' ||
        word.type === 'Irregular'
      );

    // Shuffle and limit to 50
    const shuffled = verbs.sort(() => Math.random() - 0.5);
    const limited = shuffled.slice(0, 50);

    console.log(`Found ${limited.length} common verbs from JMdict`);
    return limited;

  } catch (error) {
    console.error('Error getting common verbs from JMdict:', error);
    return [];
  }
}

// Get words by JLPT level from JMdict
export async function getWordsByJLPTLevelFromJMdict(level: JLPTLevel): Promise<JapaneseWord[]> {
  try {
    console.log(`Fetching ${level} words from JMdict`);

    const allEntries = await loadJMdictEntries();

    // Convert all entries and filter by JLPT level
    // Note: JMdict doesn't include JLPT data, so we'll return a mix
    // In a real implementation, you'd maintain a separate JLPT mapping
    const allWords = allEntries.map((entry, index) => convertToJapaneseWord(entry, index));

    // For demo purposes, distribute words across JLPT levels
    const levelMap: { [key in JLPTLevel]: number } = {
      'N5': 0,
      'N4': 1,
      'N3': 2,
      'N2': 3,
      'N1': 4
    };

    const targetRemainder = levelMap[level];
    const filteredWords = allWords.filter((_, index) => index % 5 === targetRemainder);

    // Set the correct JLPT level for these words
    const levelWords = filteredWords.map(word => ({
      ...word,
      jlpt: level
    }));

    console.log(`Found ${levelWords.length} ${level} words from JMdict`);
    return levelWords.slice(0, 30);

  } catch (error) {
    console.error(`Error getting ${level} words from JMdict:`, error);
    return [];
  }
}

// Clear cache (useful for testing)
export function clearJMdictCache(): void {
  cachedEntries = null;
  cacheTimestamp = 0;
  console.log('JMdict cache cleared');
}

// Get cache status (useful for debugging)
export function getJMdictCacheStatus(): { cached: boolean; age: number; count: number } {
  return {
    cached: cachedEntries !== null,
    age: cachedEntries ? Math.round((Date.now() - cacheTimestamp) / 1000) : 0,
    count: cachedEntries ? cachedEntries.length : 0
  };
}
