import { searchWords, searchJisho } from './api';
import { searchWanikaniVocabulary } from './wanikaniApi';

/**
 * Test script to compare WaniKani and Jisho API responses for the word "moon"
 */
export async function testMoonSearch() {
  console.log('🌙 Testing API responses for "moon"\n');
  console.log('='.repeat(80));

  try {
    // Test WaniKani API
    console.log('\n📚 WaniKani API Response:');
    console.log('-'.repeat(40));

    const wanikaniResults = await searchWanikaniVocabulary('moon', 5);
    console.log(`Found ${wanikaniResults.length} results from WaniKani:`);

    wanikaniResults.forEach((word, index) => {
      console.log(`\n[${index + 1}] WaniKani Word:`);
      console.log(`  ID: ${word.id}`);
      console.log(`  Kanji: ${word.kanji}`);
      console.log(`  Kana: ${word.kana}`);
      console.log(`  Romaji: ${word.romaji}`);
      console.log(`  Meaning: ${word.meaning}`);
      console.log(`  Type: ${word.type}`);
      console.log(`  JLPT: ${word.jlpt}`);
      if (word.frequency) console.log(`  Frequency: ${word.frequency}`);
      if (word.priority) console.log(`  Priority: ${word.priority}`);
      if (word.allReadings) console.log(`  All Readings: ${word.allReadings.join(', ')}`);
      if (word.tags && word.tags.length > 0) console.log(`  Tags: ${word.tags.join(', ')}`);
    });

  } catch (error) {
    console.log(`❌ WaniKani Error: ${error}`);
  }

  try {
    // Test Jisho API
    console.log('\n\n🔍 Jisho API Response:');
    console.log('-'.repeat(40));

    const jishoResponse = await searchJisho('moon', 1);
    console.log(`Found ${jishoResponse.data.length} results from Jisho API:`);

    // Show raw Jisho data structure
    console.log('\nRaw Jisho API Response Structure:');
    console.log(JSON.stringify(jishoResponse, null, 2));

    // Test processed Jisho results
    const processedJishoResults = await searchWords('moon', 5, 'jisho');
    console.log(`\n🔄 Processed Jisho Results (${processedJishoResults.length} words):`);

    processedJishoResults.forEach((word, index) => {
      console.log(`\n[${index + 1}] Processed Jisho Word:`);
      console.log(`  ID: ${word.id}`);
      console.log(`  Kanji: ${word.kanji}`);
      console.log(`  Kana: ${word.kana}`);
      console.log(`  Romaji: ${word.romaji}`);
      console.log(`  Meaning: ${word.meaning}`);
      console.log(`  Type: ${word.type}`);
      console.log(`  JLPT: ${word.jlpt}`);
      if (word.frequency) console.log(`  Frequency: ${word.frequency}`);
      if (word.priority) console.log(`  Priority: ${word.priority}`);
      if (word.allReadings) console.log(`  All Readings: ${word.allReadings.join(', ')}`);
      if (word.tags && word.tags.length > 0) console.log(`  Tags: ${word.tags.join(', ')}`);
    });

  } catch (error) {
    console.log(`❌ Jisho Error: ${error}`);
  }

  // Test unified search
  try {
    console.log('\n\n🔄 Unified Search Results (WaniKani preferred):');
    console.log('-'.repeat(50));

    const unifiedResults = await searchWords('moon', 5, 'wanikani');
    console.log(`Unified search returned ${unifiedResults.length} results:`);

    unifiedResults.forEach((word, index) => {
      console.log(`\n[${index + 1}] Unified Result:`);
      console.log(`  Source: ${word.id.includes('jisho') ? 'Jisho' : 'WaniKani'}`);
      console.log(`  Kanji: ${word.kanji}`);
      console.log(`  Kana: ${word.kana}`);
      console.log(`  Meaning: ${word.meaning}`);
      console.log(`  Type: ${word.type}`);
    });

  } catch (error) {
    console.log(`❌ Unified Search Error: ${error}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🌙 Moon search test completed!\n');
}

// Export for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).testMoonSearch = testMoonSearch;
}

export default testMoonSearch;
