import { GameKanji } from './kanjiUtils';

// JMdict-simplified types (matching the actual structure)
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
    related: any[];
    antonym: any[];
    field: string[];
    dialect: string[];
    misc: string[];
    info: string[];
    languageSource: any[];
    gloss: Array<{
      lang: string;
      gender: string | null;
      type: string | null;
      text: string;
    }>;
  }>;
}

interface JMdict {
  words: JMdictWord[];
}

// Cache for loaded JMdict data
let jmdictData: JMdict | null = null;
let vocabularyByKanji: Map<string, Array<{
  word: string;
  reading: string;
  meaning: string;
  common: boolean;
}>> | null = null;

/**
 * Load JMdict data from JSON file
 * This should be called once when the app initializes
 */
export async function loadJMdict(): Promise<void> {
  try {
    // Try to load the JMdict JSON file
    // You'll need to place the jmdict-eng-common.json file in public/data/
    const response = await fetch('/data/jmdict-eng-common.json');
    if (!response.ok) {

      return;
    }
    
    jmdictData = await response.json();
    buildVocabularyIndex();
  } catch (error) {
    console.error('Failed to load JMdict data:', error);
  }
}

/**
 * Build an index of vocabulary by kanji character
 */
function buildVocabularyIndex(): void {
  if (!jmdictData) return;
  
  vocabularyByKanji = new Map();
  
  for (const word of jmdictData.words) {
    // Skip if no kanji forms
    if (word.kanji.length === 0) continue;
    
    // Process each kanji form
    for (const kanjiForm of word.kanji) {
      const kanjiText = kanjiForm.text;
      
      // Get all unique kanji characters in the word
      const kanjiChars = kanjiText.match(/[一-龯]/g) || [];
      
      for (const char of kanjiChars) {
        if (!vocabularyByKanji.has(char)) {
          vocabularyByKanji.set(char, []);
        }
        
        // Find the most common reading for this kanji form
        const applicableKana = word.kana.filter(k => 
          k.appliesToKanji.includes('*') || 
          k.appliesToKanji.includes(kanjiText)
        );
        
        const reading = applicableKana[0]?.text || '';
        
        // Get the first English meaning
        const meaning = word.sense[0]?.gloss
          ?.filter(g => g.lang === 'eng')
          ?.[0]?.text || '';
        
        vocabularyByKanji.get(char)!.push({
          word: kanjiText,
          reading: reading,
          meaning: meaning,
          common: kanjiForm.common
        });
      }
    }
  }
  
  // Sort by commonality and limit entries
  for (const [char, vocab] of vocabularyByKanji.entries()) {
    // Sort by common first, then by word length (shorter = more basic)
    vocab.sort((a, b) => {
      if (a.common && !b.common) return -1;
      if (!a.common && b.common) return 1;
      return a.word.length - b.word.length;
    });
    
    // Keep only top 10 examples per kanji
    vocabularyByKanji.set(char, vocab.slice(0, 10));
  }
}

/**
 * Get vocabulary examples for a specific kanji
 */
export function getVocabularyForKanji(
  kanji: string, 
  limit: number = 3
): Array<{ word: string; reading: string; meaning: string }> {
  if (!vocabularyByKanji) {
    // Return fallback examples if JMdict not loaded
    return getFallbackVocabulary(kanji).slice(0, limit);
  }
  
  const vocab = vocabularyByKanji.get(kanji) || [];
  
  // If we have vocabulary, return it
  if (vocab.length > 0) {
    return vocab.slice(0, limit).map(v => ({
      word: v.word,
      reading: v.reading,
      meaning: v.meaning
    }));
  }
  
  // Otherwise use fallback
  return getFallbackVocabulary(kanji).slice(0, limit);
}

/**
 * Fallback vocabulary for common kanji when JMdict is not available
 */
function getFallbackVocabulary(kanji: string): Array<{
  word: string;
  reading: string;
  meaning: string;
}> {
  const fallbacks: Record<string, Array<{ word: string; reading: string; meaning: string }>> = {
    '木': [
      { word: '木曜日', reading: 'もくようび', meaning: 'Thursday' },
      { word: '大木', reading: 'たいぼく', meaning: 'big tree' },
      { word: '木', reading: 'き', meaning: 'tree' }
    ],
    '日': [
      { word: '日曜日', reading: 'にちようび', meaning: 'Sunday' },
      { word: '今日', reading: 'きょう', meaning: 'today' },
      { word: '日本', reading: 'にほん', meaning: 'Japan' }
    ],
    '人': [
      { word: '人間', reading: 'にんげん', meaning: 'human being' },
      { word: '一人', reading: 'ひとり', meaning: 'one person' },
      { word: '日本人', reading: 'にほんじん', meaning: 'Japanese person' }
    ],
    '大': [
      { word: '大きい', reading: 'おおきい', meaning: 'big' },
      { word: '大学', reading: 'だいがく', meaning: 'university' },
      { word: '大人', reading: 'おとな', meaning: 'adult' }
    ],
    '小': [
      { word: '小さい', reading: 'ちいさい', meaning: 'small' },
      { word: '小学校', reading: 'しょうがっこう', meaning: 'elementary school' },
      { word: '小鳥', reading: 'ことり', meaning: 'small bird' }
    ],
    '中': [
      { word: '中国', reading: 'ちゅうごく', meaning: 'China' },
      { word: '中学校', reading: 'ちゅうがっこう', meaning: 'middle school' },
      { word: '中', reading: 'なか', meaning: 'inside' }
    ],
    '上': [
      { word: '上', reading: 'うえ', meaning: 'above' },
      { word: '上手', reading: 'じょうず', meaning: 'skillful' },
      { word: '上る', reading: 'のぼる', meaning: 'to climb' }
    ],
    '下': [
      { word: '下', reading: 'した', meaning: 'below' },
      { word: '下手', reading: 'へた', meaning: 'unskillful' },
      { word: '下さい', reading: 'ください', meaning: 'please' }
    ],
    '月': [
      { word: '月曜日', reading: 'げつようび', meaning: 'Monday' },
      { word: '今月', reading: 'こんげつ', meaning: 'this month' },
      { word: '月', reading: 'つき', meaning: 'moon' }
    ],
    '火': [
      { word: '火曜日', reading: 'かようび', meaning: 'Tuesday' },
      { word: '火事', reading: 'かじ', meaning: 'fire' },
      { word: '火', reading: 'ひ', meaning: 'fire' }
    ],
    '水': [
      { word: '水曜日', reading: 'すいようび', meaning: 'Wednesday' },
      { word: '水', reading: 'みず', meaning: 'water' },
      { word: '水泳', reading: 'すいえい', meaning: 'swimming' }
    ],
    '金': [
      { word: '金曜日', reading: 'きんようび', meaning: 'Friday' },
      { word: 'お金', reading: 'おかね', meaning: 'money' },
      { word: '金魚', reading: 'きんぎょ', meaning: 'goldfish' }
    ],
    '土': [
      { word: '土曜日', reading: 'どようび', meaning: 'Saturday' },
      { word: '土', reading: 'つち', meaning: 'soil' },
      { word: '土地', reading: 'とち', meaning: 'land' }
    ],
    '本': [
      { word: '日本', reading: 'にほん', meaning: 'Japan' },
      { word: '本', reading: 'ほん', meaning: 'book' },
      { word: '本当', reading: 'ほんとう', meaning: 'truth' }
    ],
    '学': [
      { word: '学校', reading: 'がっこう', meaning: 'school' },
      { word: '大学', reading: 'だいがく', meaning: 'university' },
      { word: '学生', reading: 'がくせい', meaning: 'student' }
    ],
    '生': [
      { word: '学生', reading: 'がくせい', meaning: 'student' },
      { word: '生きる', reading: 'いきる', meaning: 'to live' },
      { word: '先生', reading: 'せんせい', meaning: 'teacher' }
    ],
    '年': [
      { word: '今年', reading: 'ことし', meaning: 'this year' },
      { word: '去年', reading: 'きょねん', meaning: 'last year' },
      { word: '三年', reading: 'さんねん', meaning: 'three years' }
    ],
    '時': [
      { word: '時間', reading: 'じかん', meaning: 'time' },
      { word: '時計', reading: 'とけい', meaning: 'clock' },
      { word: '時', reading: 'とき', meaning: 'time/when' }
    ],
    '間': [
      { word: '時間', reading: 'じかん', meaning: 'time' },
      { word: '人間', reading: 'にんげん', meaning: 'human being' },
      { word: '間', reading: 'あいだ', meaning: 'between' }
    ],
    '分': [
      { word: '五分', reading: 'ごふん', meaning: 'five minutes' },
      { word: '分かる', reading: 'わかる', meaning: 'to understand' },
      { word: '自分', reading: 'じぶん', meaning: 'oneself' }
    ]
  };
  
  return fallbacks[kanji] || [];
}

/**
 * Enhance GameKanji with vocabulary from JMdict
 */
export function enhanceKanjiWithVocabulary(kanji: GameKanji): GameKanji {
  const vocabulary = getVocabularyForKanji(kanji.character, 3);
  
  // Only update if we have better vocabulary than what's already there
  if (vocabulary.length > 0 && 
      (kanji.vocabulary.length === 0 || 
       kanji.vocabulary.every(v => !v.reading))) {
    return {
      ...kanji,
      vocabulary
    };
  }
  
  return kanji;
}