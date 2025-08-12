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
    console.log('Source:', source);
    console.log('Word Object:', {
      kanji: word.kanji,
      kana: word.kana,
      type: word.type,
      meaning: word.meaning
    });
    
    if (rawPartsOfSpeech) {
      console.log('Raw Parts of Speech:', rawPartsOfSpeech);
      console.log('Joined POS:', rawPartsOfSpeech.join(' ').toLowerCase());
    }
    
    console.log('Determined Type:', word.type);
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
    console.log('Input Word:', word);
    console.log('Word Type:', word.type);
    
    if (result) {
      const nonEmptyForms = Object.entries(result)
        .filter(([_, value]) => value && value !== '')
        .slice(0, 5); // Show first 5 non-empty forms
      
      console.log('Sample Conjugations:', Object.fromEntries(nonEmptyForms));
      console.log('Total Forms Generated:', Object.values(result).filter(v => v && v !== '').length);
    } else {
      console.log('❌ No conjugations generated');
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
    console.log('Data Source:', source);
    console.log('Expected Type:', expectedType);
    console.log('Actual Type:', actualType);
    console.log('Word:', word);
    
    // Suggest fixes
    if (actualType === 'other' && expectedType !== 'other') {
      console.log('💡 Suggestion: Word may not have proper part-of-speech data');
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
    
    console.log('Test Word:', testWord);
    
    // Import and test with ConjugationEngine
    import('./conjugation').then(({ ConjugationEngine }) => {
      const result = ConjugationEngine.conjugate(testWord);
      this.logConjugationAttempt(testWord, result);
    });
    
    console.groupEnd();
  }
}

// Export debug flag that can be toggled
export const CONJUGATION_DEBUG = process.env.NODE_ENV === 'development';