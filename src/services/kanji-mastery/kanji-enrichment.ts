/**
 * Kanji enrichment service that fetches real examples and sentences
 * from Tatoeba and JMDict for a richer learning experience
 */

import { searchTatoebaExamples } from '@/utils/tatoebaSearch';
import { getVocabularyForKanji } from '@/utils/jmdictVocabulary';

export interface EnrichedKanji {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt?: string;
  grade?: number;
  strokes?: number;
  examples?: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
  sentences?: Array<{
    japanese: string;
    english: string;
  }>;
}

/**
 * Enrich a kanji with real vocabulary examples from JMDict
 */
async function enrichWithVocabulary(kanji: EnrichedKanji): Promise<void> {
  try {
    // Get vocabulary words containing this kanji
    const vocabulary = await getVocabularyForKanji(kanji.kanji, 5);
    
    if (vocabulary && vocabulary.length > 0) {
      kanji.examples = vocabulary.map(v => ({
        word: v.word,
        reading: v.reading,
        meaning: v.meaning
      }));
    }
  } catch (error) {

  }
}

/**
 * Enrich a kanji with real example sentences from Tatoeba
 */
async function enrichWithSentences(kanji: EnrichedKanji): Promise<void> {
  try {
    // Search for sentences containing the kanji
    const sentences = await searchTatoebaExamples(kanji.kanji, 3);
    
    if (sentences && sentences.length > 0) {
      kanji.sentences = sentences.map(s => ({
        japanese: s.japanese,
        english: s.english || 'Translation not available'
      }));
    } else {
      // If no direct matches, try searching with the kanji's main meaning
      // This can help find relevant sentences
      const meaningBasedSentences = await searchTatoebaExamples(kanji.meaning, 2);
      
      if (meaningBasedSentences && meaningBasedSentences.length > 0) {
        kanji.sentences = meaningBasedSentences.map(s => ({
          japanese: s.japanese,
          english: s.english || 'Translation not available'
        }));
      }
    }
  } catch (error) {

  }
}

/**
 * Enrich a single kanji with examples and sentences
 */
export async function enrichKanji(kanji: EnrichedKanji): Promise<EnrichedKanji> {
  // Create a copy to avoid mutations
  const enriched = { ...kanji };
  
  // Fetch real data in parallel
  await Promise.all([
    enrichWithVocabulary(enriched),
    enrichWithSentences(enriched)
  ]);
  
  // Provide fallbacks if no data was found
  if (!enriched.examples || enriched.examples.length === 0) {
    enriched.examples = [{
      word: enriched.kanji,
      reading: enriched.kunyomi[0] || enriched.onyomi[0] || '',
      meaning: `Example with ${enriched.meaning}`
    }];
  }
  
  if (!enriched.sentences || enriched.sentences.length === 0) {
    // Only provide a basic fallback if absolutely necessary
    enriched.sentences = [{
      japanese: `この${enriched.kanji}は大切です。`,
      english: `This ${enriched.meaning} is important.`
    }];
  }
  
  return enriched;
}

/**
 * Enrich multiple kanji in batches for better performance
 */
export async function enrichKanjiList(
  kanjiList: EnrichedKanji[],
  options?: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<EnrichedKanji[]> {
  const { batchSize = 5, onProgress } = options || {};
  const enrichedList: EnrichedKanji[] = [];
  
  // Process in batches to avoid overwhelming the APIs
  for (let i = 0; i < kanjiList.length; i += batchSize) {
    const batch = kanjiList.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map(kanji => enrichKanji(kanji))
    );
    
    enrichedList.push(...enrichedBatch);
    
    if (onProgress) {
      onProgress(enrichedList.length, kanjiList.length);
    }
  }
  
  return enrichedList;
}

/**
 * Get context-appropriate TTS options for sentences
 */
export function getTTSOptionsForSentence(sentence: string): { context: string; provider?: string } {
  // Sentences should use ElevenLabs for more natural speech
  return {
    context: 'kanji-sentence',
    provider: 'elevenlabs'
  };
}

/**
 * Get context-appropriate TTS options for vocabulary
 */
export function getTTSOptionsForVocabulary(word: string): { context: string } {
  // Short vocabulary words use Google TTS
  return {
    context: 'vocabulary'
  };
}