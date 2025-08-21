// src/utils/jmdictLocalSearch.ts
import { JapaneseWord } from '@/types';
import { batchSearchTatoebaExamples } from './tatoebaSearch';

interface JMDictGloss {
  lang: string;
  text: string;
}

interface JMDictSense {
  gloss?: JMDictGloss[];
  partOfSpeech?: string[];
}

interface JMDictKanji {
  text?: string;
  tags?: string[];
}

interface JMDictKana {
  text?: string;
  tags?: string[];
}

interface JMDictWord {
  id: string;
  kanji?: JMDictKanji[];
  kana?: JMDictKana[];
  sense?: JMDictSense[];
}

interface JMDictData {
  words: JMDictWord[];
}

let jmdictData: JMDictData | null = null;
let loadingPromise: Promise<void> | null = null;

export async function loadJMdictData(): Promise<void> {
  if (jmdictData) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch('/data/jmdict-eng-common.json')
    .then(res => res.json())
    .then((data: JMDictData) => {
      jmdictData = data;
    })
    .catch(err => {
      console.error('Failed to load JMdict data:', err);
      jmdictData = null;
    });
  return loadingPromise;
}

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

// Common parts of speech with scores
const POS_SCORES: Record<string, number> = {
  'noun': 50,
  'verb': 40,
  'adjective': 35,
  'adverb': 30,
  'expression': 25,
  'pronoun': 20,
  'conjunction': 15,
  'interjection': 10,
  'compound': -20, // Penalty for compounds
  'technical': -30, // Penalty for technical terms
  'obscure': -40 // Penalty for obscure terms
};

// Common words that should be prioritized
const COMMON_WORDS: Record<string, string[]> = {
  // Animals
  'pig': ['豚', 'ぶた'],
  'cat': ['猫', 'ねこ'],
  'dog': ['犬', 'いぬ'],
  'bird': ['鳥', 'とり'],
  'fish': ['魚', 'さかな'],
  'horse': ['馬', 'うま'],
  'cow': ['牛', 'うし'],
  'chicken': ['鶏', 'にわとり'],
  'mouse': ['鼠', 'ねずみ'],
  'rat': ['鼠', 'ねずみ'],
  'rabbit': ['兎', 'うさぎ'],
  'tiger': ['虎', 'とら'],
  'lion': ['獅子', 'しし'],
  'bear': ['熊', 'くま'],
  'elephant': ['象', 'ぞう'],
  'monkey': ['猿', 'さる'],
  'sheep': ['羊', 'ひつじ'],
  'goat': ['山羊', 'やぎ'],
  'deer': ['鹿', 'しか'],
  'fox': ['狐', 'きつね'],
  // Common objects
  'book': ['本', 'ほん'],
  'pen': ['ペン', 'ぺん'],
  'pencil': ['鉛筆', 'えんぴつ'],
  'desk': ['机', 'つくえ'],
  'chair': ['椅子', 'いす'],
  'table': ['テーブル', 'てーぶる'],
  'door': ['ドア', 'どあ'],
  'window': ['窓', 'まど'],
  'car': ['車', 'くるま'],
  'train': ['電車', 'でんしゃ'],
  'bicycle': ['自転車', 'じてんしゃ'],
  'house': ['家', 'いえ'],
  'school': ['学校', 'がっこう'],
  'hospital': ['病院', 'びょういん'],
  // Food
  'rice': ['米', 'こめ'],
  'bread': ['パン', 'ぱん'],
  'meat': ['肉', 'にく'],
  'vegetable': ['野菜', 'やさい'],
  'fruit': ['果物', 'くだもの'],
  'water': ['水', 'みず'],
  'tea': ['茶', 'ちゃ'],
  'coffee': ['コーヒー', 'こーひー'],
  // People
  'person': ['人', 'ひと'],
  'man': ['男', 'おとこ'],
  'woman': ['女', 'おんな'],
  'child': ['子供', 'こども'],
  'friend': ['友達', 'ともだち'],
  'teacher': ['先生', 'せんせい'],
  'student': ['学生', 'がくせい'],
  'mother': ['母', 'はは'],
  'father': ['父', 'ちち']
};

function getPriorityScore(tags: string[]): number {
  let maxScore = 0;
  for (const tag of tags) {
    if (PRIORITY_SCORES[tag]) {
      maxScore = Math.max(maxScore, PRIORITY_SCORES[tag]);
    }
  }
  return maxScore;
}

function getPosScore(pos: string[]): number {
  let score = 0;
  for (const p of pos) {
    for (const [posType, posScore] of Object.entries(POS_SCORES)) {
      if (p.toLowerCase().includes(posType)) {
        score += posScore;
      }
    }
  }
  return score;
}

function getWordLengthScore(word: JMDictWord): number {
  // Prefer shorter, simpler words
  const kanjiLength = word.kanji?.[0]?.text?.length || 0;
  const kanaLength = word.kana?.[0]?.text?.length || 0;
  const minLength = Math.min(kanjiLength || 999, kanaLength || 999);
  
  if (minLength === 1) return 100;
  if (minLength === 2) return 80;
  if (minLength === 3) return 60;
  if (minLength === 4) return 40;
  if (minLength === 5) return 20;
  return 0;
}

function isCompoundWord(word: JMDictWord): boolean {
  // Check if word has multiple kanji that could be separate words
  const kanjiText = word.kanji?.[0]?.text || '';
  const senseText = word.sense?.[0]?.gloss?.map((g) => g.text).join(' ') || '';
  
  // If it contains parentheses in the meaning, it's likely a compound or specific usage
  if (senseText.includes('(') && senseText.includes(')')) return true;
  
  // If kanji is longer than 3 characters, it might be a compound
  if (kanjiText.length > 3) return true;
  
  return false;
}

export interface SearchResult extends JapaneseWord {
  isCommon?: boolean;
  isExactMatch?: boolean;
  matchType?: 'exact' | 'reading' | 'meaning';
}

export async function searchJMdictWords(term: string, limit: number = 30): Promise<SearchResult[]> {
  await loadJMdictData();
  if (!jmdictData) return [];
  
  const lowerTerm = term.toLowerCase().trim();
  const results: { word: JMDictWord; score: number; matchType: 'exact' | 'reading' | 'meaning' }[] = [];
  
  // For very short search terms (1-3 letters), we need to be more strict
  const isShortTerm = lowerTerm.length <= 3;
  
  // Escape special regex characters for safe regex usage
  const escapedTerm = lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Check if this is a common word we know about
  const commonWord = COMMON_WORDS[lowerTerm];
  
  for (const word of jmdictData.words) {
    // Gather tags and part of speech
    const tags = [
      ...(word.kanji?.flatMap((k) => k.tags || []) || []),
      ...(word.kana?.flatMap((k) => k.tags || []) || [])
    ];
    const pos = word.sense?.flatMap((s) => s.partOfSpeech || []) || [];

    // Scoring
    let score = 0;
    let matchType: 'exact' | 'reading' | 'meaning' = 'meaning';
    
    // Check for exact Japanese match
    const kanjiText = word.kanji[0]?.text || '';
    const kanaText = word.kana[0]?.text || '';
    
    // Boost score for known common words
    if (commonWord) {
      if (commonWord.includes(kanjiText) || commonWord.includes(kanaText)) {
        score += 2000; // Huge boost for known common words
      }
    }
    
    // Exact match on Japanese text
    if (kanjiText === term || kanaText === term) {
      score += 1500;
      matchType = 'exact';
    } else if (kanjiText.includes(term) || kanaText.includes(term)) {
      score += 300;
      matchType = 'reading';
    }
    
    // English gloss match
    let glossMatch = false;
    let exactGlossMatch = false;
    let wholeWordMatch = false;
    let substringMatch = false;
    
    for (const sense of word.sense || []) {
      for (const gloss of sense.gloss || []) {
        if (gloss.lang === 'eng') {
          const glossText = gloss.text.toLowerCase();
          
          // Check for exact match of the entire gloss
          if (glossText === lowerTerm) {
            exactGlossMatch = true;
            score += 1000;
            matchType = 'meaning';
            break;
          }
          
          // Check if any part separated by common delimiters matches exactly
          const parts = glossText.split(/[,;\/]/).map(p => p.trim());
          if (parts.some(part => part === lowerTerm)) {
            exactGlossMatch = true;
            score += 900;
            matchType = 'meaning';
            break;
          }
          
          // Check for whole word match using word boundaries
          const wordBoundaryRegex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
          if (wordBoundaryRegex.test(glossText)) {
            wholeWordMatch = true;
            score += 600;
            matchType = 'meaning';
            // Don't break - keep looking for exact matches
          } else if (glossText.includes(lowerTerm)) {
            // Substring match - lowest priority
            // For short terms, skip substring matches unless they're at word start
            if (isShortTerm) {
              // Only allow substring match if it's at the start of a word
              const startsWordRegex = new RegExp(`\\b${escapedTerm}`, 'i');
              if (!startsWordRegex.test(glossText)) {
                continue; // Skip this match for short terms
              }
            }
            substringMatch = true;
            // Calculate penalty based on how much extra content there is
            const lengthRatio = lowerTerm.length / glossText.length;
            score += Math.floor(30 * lengthRatio); // Reduced score 0-30 for substring matches
          }
        }
      }
      if (exactGlossMatch) break;
    }
    
    // Set glossMatch if we found any kind of match
    glossMatch = exactGlossMatch || wholeWordMatch || substringMatch;
    
    if (!glossMatch && matchType === 'meaning') {
      continue; // Skip if no match
    }
    
    // Extra boost for exact matches on short common words
    if (isShortTerm && exactGlossMatch && commonWord) {
      score += 500; // Additional boost to ensure common words appear first
    }
    
    // Priority tag score
    score += getPriorityScore(tags);
    
    // Part of speech score
    score += getPosScore(pos);
    
    // Word length score (prefer simpler words)
    score += getWordLengthScore(word);
    
    // Penalty for compound words (higher penalty for short search terms)
    if (isCompoundWord(word)) {
      score -= isShortTerm ? 400 : 200;
    }
    
    // Penalty for words with too many senses (likely less common)
    if (word.sense?.length > 5) {
      score -= 50 * (word.sense.length - 5);
    }

    results.push({ word, score, matchType });
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  // Convert to JapaneseWord format with extra metadata
  const topResults = results.slice(0, limit).map(({ word, score, matchType }) => {
    const mainKanji = word.kanji?.[0]?.text || word.kana?.[0]?.text || '';
    const mainKana = word.kana?.[0]?.text || '';
    const meaning = word.sense?.[0]?.gloss?.find((g) => g.lang === 'eng')?.text || '';
    const tags = [
      ...(word.kanji?.flatMap((k) => k.tags || []) || []),
      ...(word.kana?.flatMap((k) => k.tags || []) || [])
    ];
    
    const isCommon = tags.some((tag) => 
      ['news1', 'ichi1', 'spec1', 'gai1', 'news2', 'ichi2'].includes(tag)
    );
    
    return {
      id: word.id,
      kanji: mainKanji,
      kana: mainKana,
      romaji: '', // Optionally add romaji conversion
      meaning,
      type: '', // Optionally map partOfSpeech to type
      jlpt: 'N5', // Optionally map to JLPT
      tags: [],
      isCommon,
      isExactMatch: score >= 800,
      matchType
    };
  });
  
  // Add Tatoeba example sentences
  const wordsToSearch = topResults.map(word => word.kanji || word.kana);
  try {
    const examplesMap = await batchSearchTatoebaExamples(wordsToSearch, 3);
    
    // Attach examples to each word
    return topResults.map(word => ({
      ...word,
      exampleSentences: examplesMap.get(word.kanji || word.kana) || []
    }));
  } catch (error) {
    console.error('Failed to fetch Tatoeba examples:', error);
    // Return results without examples if Tatoeba search fails
    return topResults;
  }
}

// Get the most likely "did you mean" suggestion
export function getDidYouMeanSuggestion(term: string): string | null {
  const lowerTerm = term.toLowerCase().trim();
  
  // Check common words mapping
  if (COMMON_WORDS[lowerTerm]) {
    return `${COMMON_WORDS[lowerTerm][0]} (${COMMON_WORDS[lowerTerm][1]})`;
  }
  
  // Check for common misspellings or variations
  const variations: Record<string, string> = {
    'dogs': 'dog',
    'cats': 'cat',
    'pigs': 'pig',
    'fishes': 'fish',
    'birds': 'bird',
    'persons': 'person',
    'people': 'person',
    'men': 'man',
    'women': 'woman',
    'children': 'child',
    'kids': 'child',
    'bike': 'bicycle',
    'mom': 'mother',
    'dad': 'father',
    'mum': 'mother'
  };
  
  if (variations[lowerTerm] && COMMON_WORDS[variations[lowerTerm]]) {
    const base = variations[lowerTerm];
    return `${COMMON_WORDS[base][0]} (${COMMON_WORDS[base][1]})`;
  }
  
  return null;
}
