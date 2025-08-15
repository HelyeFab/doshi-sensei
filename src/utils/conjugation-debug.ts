/**
 * Debug utility to help diagnose conjugation issues
 * This will log detailed information about word classification
 */

import { JapaneseWord, WordType } from '@/types';

export class ConjugationDebugger {
  private static debugMode = true; // Set to false in production
  
  /**
   * Log word classification details
   */
  static logWordClassification(
    word: JapaneseWord, 
    source: 'wanikani' | 'jisho' | 'jmdict' | 'unknown',
    rawPartsOfSpeech?: string[]
  ) {
    if (!this.debugMode) return;
    
    console.group(`🔍 Word Classification Debug: ${word.kanji || word.kana}`);

    if (rawPartsOfSpeech) {

      console.log('Joined POS:', rawPartsOfSpeech.join(' ').toLowerCase());
    }

    console.log('Is Valid for Conjugation:', this.isValidForConjugation(word.type));
    console.groupEnd();
  }
  
  /**
   * Check if a word type is valid for conjugation
   */
  static isValidForConjugation(type: WordType): boolean {
    const conjugatableTypes: WordType[] = [
      'Ichidan', 'Godan', 'Irregular', 
      'i-adjective', 'na-adjective'
    ];
    return conjugatableTypes.includes(type);
  }
  
  /**
   * Log conjugation attempt
   */
  static logConjugationAttempt(word: JapaneseWord, result: any) {
    if (!this.debugMode) return;
    
    console.group(`⚙️ Conjugation Attempt: ${word.kanji || word.kana}`);

    if (result) {
      const nonEmptyForms = Object.entries(result)
        .filter(([_, value]) => value && value !== '')
        .slice(0, 5); // Show first 5 non-empty forms
      
      console.log('Sample Conjugations:', Object.fromEntries(nonEmptyForms));
      console.log('Total Forms Generated:', Object.values(result).filter(v => v && v !== '').length);
    } else {

    }
    
    console.groupEnd();
  }
  
  /**
   * Analyze discrepancy between expected and actual conjugation
   */
  static analyzeDiscrepancy(
    word: JapaneseWord,
    expectedType: WordType,
    actualType: WordType,
    source: string
  ) {
    console.group(`⚠️ Type Mismatch Detected: ${word.kanji || word.kana}`);

    // Suggest fixes
    if (actualType === 'other' && expectedType !== 'other') {

    }
    
    console.groupEnd();
  }
  
  /**
   * Test conjugation with a specific word
   */
  static testWord(kanji: string, kana: string, expectedType: WordType) {
    console.group(`🧪 Testing Word: ${kanji} (${kana})`);
    
    const testWord: JapaneseWord = {
      id: 'test',
      kanji,
      kana,
      romaji: '',
      meaning: 'test',
      type: expectedType,
      jlpt: 'N5'
    };

    // Import and test with ExtendedConjugationEngine
    import('./conjugation-extended').then(({ ExtendedConjugationEngine }) => {
      const result = ExtendedConjugationEngine.conjugate(testWord);
      this.logConjugationAttempt(testWord, result);
    });
    
    console.groupEnd();
  }
}

// Export debug flag that can be toggled
export const CONJUGATION_DEBUG = process.env.NODE_ENV === 'development';