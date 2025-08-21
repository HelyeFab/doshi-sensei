import { searchTatoebaExamples } from '@/utils/tatoebaSearch';
import { KanjiItem } from '@/types/moodBoard';

export interface TatoebaGameContext {
  sentence: string;
  kanjiPosition: number;
  kanjiChar: string;
}

/**
 * Search for sentences containing the target kanji
 * and filter to avoid ambiguous cases
 */
export async function findSuitableSentences(
  kanji: KanjiItem,
  limit: number = 5
): Promise<TatoebaGameContext[]> {
  try {
    // Search for sentences containing this kanji
    const examples = await searchTatoebaExamples(kanji.char, limit * 3); // Get extra to filter
    
    const suitableContexts: TatoebaGameContext[] = [];
    
    for (const example of examples) {
      const sentence = example.japanese;
      
      // Count occurrences of the kanji
      const matches = sentence.match(new RegExp(kanji.char, 'g')) || [];
      
      // Skip if kanji appears multiple times (ambiguous)
      if (matches.length !== 1) continue;
      
      // Find position of the kanji
      const position = sentence.indexOf(kanji.char);
      if (position === -1) continue;
      
      // Skip very long sentences (harder to parse)
      if (sentence.length > 50) continue;
      
      // Skip sentences with too many kanji (overwhelming)
      const kanjiCount = (sentence.match(/[\u4e00-\u9faf]/g) || []).length;
      if (kanjiCount > 10) continue;
      
      suitableContexts.push({
        sentence,
        kanjiPosition: position,
        kanjiChar: kanji.char
      });
      
      if (suitableContexts.length >= limit) break;
    }
    
    return suitableContexts;
  } catch (error) {
    console.error('Error fetching Tatoeba sentences:', error);
    return [];
  }
}

/**
 * Get compound words containing the kanji
 * These are useful for on'yomi readings
 */
export function getCompoundWords(kanji: KanjiItem): string[] {
  // This would ideally come from a dictionary, but for now
  // we'll use common patterns
  const compounds: string[] = [];
  
  // Common compound patterns
  const commonSuffixes = ['学', '人', '語', '国', '的', '性', '化', '度', '力', '者'];
  const commonPrefixes = ['大', '小', '新', '古', '高', '低', '長', '短', '多', '少'];
  
  // Generate some compound possibilities
  commonSuffixes.forEach(suffix => {
    if (suffix !== kanji.char) {
      compounds.push(kanji.char + suffix);
    }
  });
  
  commonPrefixes.forEach(prefix => {
    if (prefix !== kanji.char) {
      compounds.push(prefix + kanji.char);
    }
  });
  
  return compounds.slice(0, 3); // Limit to avoid too many options
}

/**
 * Determine the likely reading type based on context
 */
export function determineReadingType(
  kanji: KanjiItem,
  context: string,
  position: number
): 'on' | 'kun' {
  // If it's a single kanji word, usually kun'yomi
  if (context === kanji.char) {
    return 'kun';
  }
  
  // Check if it's part of a compound
  const before = position > 0 ? context[position - 1] : null;
  const after = position < context.length - 1 ? context[position + 1] : null;
  
  const isKanjiBefore = before && /[\u4e00-\u9faf]/.test(before);
  const isKanjiAfter = after && /[\u4e00-\u9faf]/.test(after);
  
  // If surrounded by other kanji, likely on'yomi
  if (isKanjiBefore || isKanjiAfter) {
    return 'on';
  }
  
  // Default to kun'yomi for standalone usage
  return 'kun';
}