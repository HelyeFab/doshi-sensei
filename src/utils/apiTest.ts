import { searchWords, searchJisho } from './api';
import { searchWanikaniVocabulary } from './wanikaniApi';

/**
 * Test script to compare WaniKani and Jisho API responses for the word "moon"
 */
export async function testMoonSearch() {

  try {
    // Test WaniKani API

    const wanikaniResults = await searchWanikaniVocabulary('moon', 5);

    wanikaniResults.forEach((word, index) => {
    });

  } catch (error) {
  }

  try {
    // Test Jisho API

    const jishoResponse = await searchJisho('moon', 1);

    // Show raw Jisho data structure

    // Test processed Jisho results
    const processedJishoResults = await searchWords('moon', 5);

    processedJishoResults.forEach((word, index) => {
    });

  } catch (error) {
  }

  // Test unified search
  try {

    const unifiedResults = await searchWords('moon', 5);

    unifiedResults.forEach((word, index) => {
    });

  } catch (error) {
  }

}

// Export for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).testMoonSearch = testMoonSearch;
}

export default testMoonSearch;
