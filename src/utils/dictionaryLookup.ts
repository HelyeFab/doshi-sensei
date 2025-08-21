/**
 * Dictionary lookup utilities for Japanese words
 */

export interface DictionaryEntry {
  word: string;
  reading?: string;
  meanings: string[];
  partOfSpeech?: string[];
}

/**
 * Look up a Japanese word in the dictionary
 */
export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  try {
    // Try to find the word in the vocabulary database
    const response = await fetch(`/api/vocabulary/lookup?word=${encodeURIComponent(word)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data || !data.meanings || data.meanings.length === 0) {
      return null;
    }
    
    return {
      word: data.word || word,
      reading: data.reading || data.kana,
      meanings: Array.isArray(data.meanings) ? data.meanings : [data.meaning || 'No definition found'],
      partOfSpeech: data.partOfSpeech
    };
  } catch (error) {
    console.error('Error looking up word:', error);
    return null;
  }
}