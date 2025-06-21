// Enhanced Vocabulary Analyzer with WaniKani Integration
import { ExtractedVocabulary, ExtractedKanji } from '@/types/news';
import { JLPTLevel } from '@/types';
import { searchWanikaniVocabulary, setWanikaniApiToken } from './wanikaniApi';

// Initialize WaniKani API token from environment
const initializeWaniKaniToken = () => {
  // Check for token in multiple places
  const token =
    process.env.NEXT_PUBLIC_WANIKANI_API_TOKEN ||
    process.env.WANIKANI_API_TOKEN ||
    (typeof window !== 'undefined' && localStorage.getItem('wanikani_api_token'));

  if (token) {
    setWanikaniApiToken(token);
    console.log('✅ WaniKani API token initialized');
    return true;
  } else {
    console.warn('⚠️ WaniKani API token not found');
    return false;
  }
};

// Initialize token on module load
const hasToken = initializeWaniKaniToken();

// Japanese text processing utilities
class JapaneseTextProcessor {
  // Extract potential vocabulary words from Japanese text
  static extractWords(text: string): { word: string; position: number; length: number }[] {
    const words: { word: string; position: number; length: number }[] = [];

    // Pattern to match Japanese words (kanji + hiragana combinations, standalone kanji, standalone hiragana)
    const japaneseWordPattern = /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]+/g;

    let match;
    while ((match = japaneseWordPattern.exec(text)) !== null) {
      const word = match[0];
      const position = match.index;

      // Skip very short words (less than 2 characters) unless they're common particles/words
      if (word.length < 2 && !this.isCommonShortWord(word)) {
        continue;
      }

      // Skip very long sequences (likely not single words)
      if (word.length > 8) {
        // Try to break down long sequences
        const subWords = this.breakDownLongSequence(word, position);
        words.push(...subWords);
        continue;
      }

      words.push({
        word,
        position,
        length: word.length
      });
    }

    return words;
  }

  // Check if a short word is commonly used
  private static isCommonShortWord(word: string): boolean {
    const commonShorts = ['は', 'が', 'を', 'に', 'で', 'と', 'も', 'や', 'か', 'の', 'だ', 'で'];
    return commonShorts.includes(word);
  }

  // Break down long sequences into potential words
  private static breakDownLongSequence(sequence: string, basePosition: number): { word: string; position: number; length: number }[] {
    const words: { word: string; position: number; length: number }[] = [];

    // Try to identify word boundaries by looking for kanji-hiragana patterns
    let currentPosition = 0;
    let currentWord = '';

    for (let i = 0; i < sequence.length; i++) {
      const char = sequence[i];
      const isKanji = /[\u4e00-\u9faf]/.test(char);
      const isHiragana = /[\u3040-\u309f]/.test(char);

      currentWord += char;

      // If we hit a boundary (kanji->hiragana transition followed by kanji)
      // or if we have a reasonably sized word (3-6 chars)
      if (currentWord.length >= 2 &&
          (currentWord.length >= 6 ||
           (i < sequence.length - 1 && isHiragana && /[\u4e00-\u9faf]/.test(sequence[i + 1])))) {
        words.push({
          word: currentWord,
          position: basePosition + currentPosition,
          length: currentWord.length
        });

        currentPosition += currentWord.length;
        currentWord = '';
      }
    }

    // Add remaining word if any
    if (currentWord.length >= 2) {
      words.push({
        word: currentWord,
        position: basePosition + currentPosition,
        length: currentWord.length
      });
    }

    return words;
  }

  // Extract individual kanji from text
  static extractKanji(text: string): { kanji: string; position: number }[] {
    const kanjiList: { kanji: string; position: number }[] = [];
    const kanjiPattern = /[\u4e00-\u9faf]/g;

    let match;
    while ((match = kanjiPattern.exec(text)) !== null) {
      kanjiList.push({
        kanji: match[0],
        position: match.index
      });
    }

    return kanjiList;
  }

  // Estimate difficulty based on text characteristics
  static estimateTextDifficulty(text: string): JLPTLevel {
    const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
    const hiraganaCount = (text.match(/[\u3040-\u309f]/g) || []).length;
    const katakanaCount = (text.match(/[\u30a0-\u30ff]/g) || []).length;
    const totalJapanese = kanjiCount + hiraganaCount + katakanaCount;

    if (totalJapanese === 0) return 'N5';

    const kanjiRatio = kanjiCount / totalJapanese;
    const textLength = text.length;

    // Simple heuristic based on kanji density and text length
    if (textLength < 50 && kanjiRatio < 0.2) return 'N5';
    if (textLength < 100 && kanjiRatio < 0.3) return 'N4';
    if (textLength < 200 && kanjiRatio < 0.4) return 'N3';
    if (textLength < 400 && kanjiRatio < 0.5) return 'N2';
    return 'N1';
  }
}

// Enhanced vocabulary analyzer
export class VocabularyAnalyzer {
  // Analyze vocabulary in Japanese text using WaniKani API
  static async analyzeVocabulary(text: string): Promise<ExtractedVocabulary[]> {
    if (!hasToken) {
      console.warn('🔄 WaniKani API not available, using basic analysis');
      return this.fallbackVocabularyAnalysis(text);
    }

    try {
      console.log('🔍 Analyzing vocabulary with WaniKani API...');

      // Extract potential words from text
      const potentialWords = JapaneseTextProcessor.extractWords(text);
      console.log(`Found ${potentialWords.length} potential words to analyze`);

      // Analyze each word with WaniKani
      const vocabularyResults: ExtractedVocabulary[] = [];

      for (const { word, position, length } of potentialWords) {
        try {
          // Search WaniKani for this word
          const wanikaniResults = await searchWanikaniVocabulary(word, 3);

          if (wanikaniResults.length > 0) {
            // Use the best match (first result is most relevant)
            const bestMatch = wanikaniResults[0];

            vocabularyResults.push({
              word: bestMatch.kanji,
              reading: bestMatch.kana,
              position,
              length,
              isKnown: this.determineIfKnown(bestMatch.jlpt),
              definition: bestMatch.meaning,
              jlptLevel: bestMatch.jlpt,
              frequency: this.estimateFrequency(bestMatch.jlpt)
            });
          } else {
            // Word not found in WaniKani, add basic info
            vocabularyResults.push({
              word,
              reading: this.guessReading(word),
              position,
              length,
              isKnown: false,
              jlptLevel: JapaneseTextProcessor.estimateTextDifficulty(word),
              frequency: 1
            });
          }
        } catch (error) {
          console.warn(`Error analyzing word "${word}":`, error);
          // Continue with next word
        }
      }

      console.log(`✅ Analyzed ${vocabularyResults.length} vocabulary items`);
      return vocabularyResults;

    } catch (error) {
      console.error('Error in vocabulary analysis:', error);
      return this.fallbackVocabularyAnalysis(text);
    }
  }

  // Analyze kanji in Japanese text
  static async analyzeKanji(text: string): Promise<ExtractedKanji[]> {
    try {
      const kanjiList = JapaneseTextProcessor.extractKanji(text);
      const kanjiResults: ExtractedKanji[] = [];

      // For now, use basic analysis (could be enhanced with kanji-specific API)
      for (const { kanji, position } of kanjiList) {
        kanjiResults.push({
          kanji,
          position,
          meaning: this.getBasicKanjiMeaning(kanji),
          readings: this.getBasicKanjiReadings(kanji),
          jlptLevel: this.estimateKanjiLevel(kanji),
          isKnown: false // Could be enhanced with user progress tracking
        });
      }

      return kanjiResults;
    } catch (error) {
      console.error('Error in kanji analysis:', error);
      return [];
    }
  }

  // Fallback vocabulary analysis when WaniKani is not available
  private static fallbackVocabularyAnalysis(text: string): ExtractedVocabulary[] {
    const words = JapaneseTextProcessor.extractWords(text);

    return words.map(({ word, position, length }) => ({
      word,
      reading: this.guessReading(word),
      position,
      length,
      isKnown: Math.random() > 0.3, // Random for demo
      jlptLevel: JapaneseTextProcessor.estimateTextDifficulty(word),
      frequency: Math.floor(Math.random() * 10) + 1
    }));
  }

  // Helper methods
  private static determineIfKnown(jlptLevel: JLPTLevel): boolean {
    // Simple heuristic: assume N5/N4 words are more likely to be known
    switch (jlptLevel) {
      case 'N5': return Math.random() > 0.2; // 80% likely known
      case 'N4': return Math.random() > 0.4; // 60% likely known
      case 'N3': return Math.random() > 0.6; // 40% likely known
      case 'N2': return Math.random() > 0.8; // 20% likely known
      case 'N1': return Math.random() > 0.9; // 10% likely known
      default: return false;
    }
  }

  private static estimateFrequency(jlptLevel: JLPTLevel): number {
    switch (jlptLevel) {
      case 'N5': return 9 + Math.floor(Math.random() * 2); // 9-10
      case 'N4': return 7 + Math.floor(Math.random() * 2); // 7-8
      case 'N3': return 5 + Math.floor(Math.random() * 2); // 5-6
      case 'N2': return 3 + Math.floor(Math.random() * 2); // 3-4
      case 'N1': return 1 + Math.floor(Math.random() * 2); // 1-2
      default: return 1;
    }
  }

  private static guessReading(word: string): string {
    // Very basic reading guess (in real implementation, you'd use a proper library)
    // For now, just return the word if it's already in hiragana/katakana
    if (/^[\u3040-\u309f\u30a0-\u30ff]+$/.test(word)) {
      return word;
    }
    // For kanji words, this is just a placeholder
    return '???';
  }

  private static getBasicKanjiMeaning(kanji: string): string {
    // Basic kanji meanings (could be expanded with a proper database)
    const basicMeanings: { [key: string]: string } = {
      '人': 'person',
      '日': 'day, sun',
      '本': 'book, origin',
      '国': 'country',
      '大': 'big',
      '小': 'small',
      '今': 'now',
      '時': 'time',
      '年': 'year',
      '月': 'month',
      '学': 'study',
      '生': 'life, student',
      '会': 'meeting',
      '社': 'company',
      '新': 'new',
      '出': 'exit, come out',
      '行': 'go',
      '来': 'come',
      '見': 'see',
      '言': 'say',
      '食': 'eat',
      '飲': 'drink'
    };

    return basicMeanings[kanji] || 'unknown';
  }

  private static getBasicKanjiReadings(kanji: string): string[] {
    // Basic kanji readings (very simplified)
    const basicReadings: { [key: string]: string[] } = {
      '人': ['じん', 'にん', 'ひと'],
      '日': ['にち', 'ひ'],
      '本': ['ほん', 'もと'],
      '国': ['こく', 'くに'],
      '大': ['だい', 'おお'],
      '小': ['しょう', 'ちい'],
      '今': ['こん', 'いま'],
      '時': ['じ', 'とき'],
      '年': ['ねん', 'とし'],
      '月': ['げつ', 'つき'],
      '学': ['がく', 'まな'],
      '生': ['せい', 'い'],
      '会': ['かい', 'あ'],
      '社': ['しゃ', 'やしろ'],
      '新': ['しん', 'あたら'],
      '出': ['しゅつ', 'で'],
      '行': ['こう', 'い'],
      '来': ['らい', 'く'],
      '見': ['けん', 'み'],
      '言': ['げん', 'い'],
      '食': ['しょく', 'た'],
      '飲': ['いん', 'の']
    };

    return basicReadings[kanji] || ['unknown'];
  }

  private static estimateKanjiLevel(kanji: string): JLPTLevel {
    // Basic kanji level estimation (simplified)
    const n5Kanji = ['人', '日', '本', '国', '大', '小', '今', '時', '年', '月'];
    const n4Kanji = ['学', '生', '会', '社', '新', '出', '行', '来'];
    const n3Kanji = ['見', '言', '食', '飲', '話', '読', '書', '作'];

    if (n5Kanji.includes(kanji)) return 'N5';
    if (n4Kanji.includes(kanji)) return 'N4';
    if (n3Kanji.includes(kanji)) return 'N3';
    return 'N2'; // Default for unknown kanji
  }
}

// Export utility function to set WaniKani token dynamically
export function setWaniKaniToken(token: string): void {
  setWanikaniApiToken(token);
  console.log('✅ WaniKani API token updated');
}

// Export function to check if WaniKani is available
export function isWaniKaniAvailable(): boolean {
  return hasToken;
}
