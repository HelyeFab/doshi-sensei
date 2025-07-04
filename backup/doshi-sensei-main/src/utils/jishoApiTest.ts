import { searchJisho, searchWords } from './api';

/**
 * Test utility to verify Jisho API integration works with CORS proxy
 */
export class JishoApiTest {

  /**
   * Test basic Jisho API functionality
   */
  static async testBasicSearch(query: string = 'hello'): Promise<void> {
    console.log(`🧪 Testing Jisho API search for: "${query}"`);

    try {
      // Test direct Jisho API call
      const response = await searchJisho(query);
      console.log('✅ Jisho API call successful');
      console.log('📊 Response data:', {
        found: response.data.length,
        firstResult: response.data[0] ? {
          slug: response.data[0].slug,
          japanese: response.data[0].japanese[0],
          meanings: response.data[0].senses[0].english_definitions.slice(0, 3)
        } : null
      });

      return;
    } catch (error) {
      console.error('❌ Jisho API search failed:', error);
      throw error;
    }
  }

  /**
   * Test the integrated search function
   */
  static async testIntegratedSearch(query: string = 'arigatou'): Promise<void> {
    console.log(`🧪 Testing integrated search for: "${query}"`);

    try {
      const results = await searchWords(query, 5);
      console.log('✅ Integrated search successful');
      console.log('📊 Search results:', {
        found: results.length,
        results: results.map(r => ({
          kanji: r.kanji,
          kana: r.kana,
          meaning: r.meaning,
          type: r.type
        }))
      });

      return;
    } catch (error) {
      console.error('❌ Integrated search failed:', error);
      throw error;
    }
  }

  /**
   * Test multiple queries to verify proxy stability
   */
  static async testMultipleQueries(): Promise<void> {
    console.log('🧪 Testing multiple queries');

    const queries = ['hello', 'thank you', 'water', 'food', 'study'];
    const results = [];

    for (const query of queries) {
      try {
        console.log(`Testing: ${query}`);
        const result = await searchWords(query, 3);
        results.push({
          query,
          success: true,
          count: result.length,
          sample: result[0] || null
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('📊 Multiple queries test results:', results);

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ ${successCount}/${queries.length} queries successful`);
  }

  /**
   * Test search with tags (JLPT levels, common words)
   */
  static async testTaggedSearch(): Promise<void> {
    console.log('🧪 Testing tagged search');

    try {
      // Test JLPT tagged search
      const jlptResponse = await searchJisho('', 1, ['jlpt-n5']);
      console.log('✅ JLPT N5 tagged search successful');
      console.log('📊 JLPT N5 sample:', jlptResponse.data[0] ? {
        slug: jlptResponse.data[0].slug,
        japanese: jlptResponse.data[0].japanese[0],
        jlpt: jlptResponse.data[0].jlpt
      } : 'No results');

      // Test common words search
      const commonResponse = await searchJisho('', 1, ['common']);
      console.log('✅ Common words tagged search successful');
      console.log('📊 Common words sample:', commonResponse.data[0] ? {
        slug: commonResponse.data[0].slug,
        japanese: commonResponse.data[0].japanese[0],
        isCommon: commonResponse.data[0].is_common
      } : 'No results');

    } catch (error) {
      console.error('❌ Tagged search failed:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive test suite
   */
  static async runFullTestSuite(): Promise<void> {
    console.log('🚀 Starting Jisho API CORS Test Suite');
    console.log('=====================================');

    const tests = [
      { name: 'Basic Search', fn: () => this.testBasicSearch() },
      { name: 'Integrated Search', fn: () => this.testIntegratedSearch() },
      { name: 'Multiple Queries', fn: () => this.testMultipleQueries() },
      { name: 'Tagged Search', fn: () => this.testTaggedSearch() }
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`\n🧪 Running: ${test.name}`);
        await test.fn();
        results.push({ name: test.name, success: true });
        console.log(`✅ ${test.name} passed`);
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`❌ ${test.name} failed:`, error);
      }
    }

    console.log('\n📊 Test Suite Results:');
    console.log('======================');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.name}${result.error ? ` - ${result.error}` : ''}`);
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`\n🏆 Overall: ${successCount}/${results.length} tests passed`);

    if (successCount === results.length) {
      console.log('🎉 All tests passed! CORS implementation is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
  }
}

// Export functions for easy browser console access
export const {
  testBasicSearch,
  testIntegratedSearch,
  testMultipleQueries,
  testTaggedSearch,
  runFullTestSuite
} = JishoApiTest;

// Global window access for browser console testing
if (typeof window !== 'undefined') {
  (window as any).JishoApiTest = JishoApiTest;
}

export default JishoApiTest;
