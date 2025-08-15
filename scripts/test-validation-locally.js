#!/usr/bin/env node

/**
 * Local test script for article validation
 * Tests the validation logic without hitting any APIs
 */

const path = require('path');

// Import the validation module
const { isLikelyJapanese, quickValidate, filterArticles } = require('../netlify/functions/article-quick-validation');

// Test cases with various content types
const testArticles = [
  {
    title: "Japan's Economy Shows Signs of Recovery",
    content: "The Japanese economy has shown remarkable resilience in recent months, with GDP growth exceeding expectations. Analysts point to strong domestic consumption and increased exports as key drivers of this recovery.",
    source: "test",
    expected: false,
    description: "English-only article"
  },
  {
    title: "日本経済が回復の兆し",
    content: "日本経済は最近数ヶ月で著しい回復力を示しており、GDP成長率は予想を上回っています。アナリストは、強い国内消費と輸出の増加がこの回復の主要な推進力であると指摘しています。",
    source: "test",
    expected: true,
    description: "Pure Japanese article"
  },
  {
    title: "Tokyo Olympics Legacy",
    content: "東京オリンピックのレガシーは、スポーツ施設の改善だけでなく、日本の国際的なイメージの向上にも貢献しました。The Tokyo Olympics left a lasting impact on Japan's infrastructure and international reputation.",
    source: "test",
    expected: true,
    description: "Mixed Japanese/English (majority Japanese)"
  },
  {
    title: "Breaking News from Japan",
    content: "This is breaking news from Tokyo. The government announced new policies today. これは短い日本語です。",
    source: "test",
    expected: false,
    description: "Mostly English with small Japanese"
  },
  {
    title: "エラーページ",
    content: "404 Error - Page not found. Please enable JavaScript to continue.",
    source: "test",
    expected: false,
    description: "Error page content"
  },
  {
    title: "短いコンテンツ",
    content: "これは短い。",
    source: "test",
    expected: false,
    description: "Too short content"
  },
  {
    title: "New Technology Trends 2024",
    content: "Artificial Intelligence and Machine Learning continue to dominate the technology landscape in 2024. Companies are investing heavily in AI research and development to stay competitive in the global market. The rise of generative AI has particularly captured public attention.",
    source: "test",
    expected: false,
    description: "Tech article in English"
  },
  {
    title: "春の訪れと日本の桜",
    content: "春が訪れると、日本中で桜が咲き始めます。この美しい季節は、多くの人々にとって特別な意味を持っています。花見という伝統的な習慣では、家族や友人が桜の木の下に集まり、食事を楽しみながら花を愛でます。桜の花は短命ですが、その儚い美しさが日本人の心に深く響きます。各地の桜の名所では、ライトアップされた夜桜も楽しむことができ、昼間とは違った幻想的な雰囲気を味わえます。",
    source: "test",
    expected: true,
    description: "Japanese article about cherry blossoms"
  }
];

console.log('🧪 Testing Article Validation Logic\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

// Test each article
testArticles.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log('-'.repeat(40));
  console.log(`Title: "${testCase.title}"`);
  console.log(`Content: "${testCase.content.substring(0, 80)}..."`);
  
  // Test validation
  const result = quickValidate(testCase.content, testCase.title);
  const isJapanese = isLikelyJapanese(testCase.content);
  
  console.log(`\nResults:`);
  console.log(`  - Is Japanese: ${isJapanese ? '✓ Yes' : '✗ No'}`);
  console.log(`  - Validation passed: ${result.passed ? '✓ Yes' : '✗ No'}`);
  console.log(`  - Reason: ${result.reason}`);
  console.log(`  - Should save: ${result.shouldSave ? 'Yes' : 'No'}`);
  
  // Check if result matches expectation
  const testPassed = result.shouldSave === testCase.expected;
  console.log(`\n  Expected to save: ${testCase.expected ? 'Yes' : 'No'}`);
  console.log(`  Test result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (testPassed) {
    passed++;
  } else {
    failed++;
    console.log(`  ⚠️ MISMATCH: Expected ${testCase.expected} but got ${result.shouldSave}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary:');
console.log(`  ✅ Passed: ${passed}/${testArticles.length}`);
console.log(`  ❌ Failed: ${failed}/${testArticles.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Validation logic is working correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Please review the validation logic.');
}

// Test batch filtering
console.log('\n' + '='.repeat(60));
console.log('🧪 Testing Batch Filtering\n');

const mixedArticles = [
  { title: "English News", content: "This is an English article about Japan. It contains information about recent developments in Tokyo and other major cities.", url: "test1" },
  { title: "日本のニュース", content: "これは日本語の記事です。内容は十分に長く、日本語学習者にとって有益な情報が含まれています。さらに詳しい情報を追加して、五十文字以上にします。", url: "test2" },
  { title: "Mixed Content", content: "This is mostly English content with just a tiny bit of 日本語 mixed in.", url: "test3" },
  { title: "エラー", content: "404 Page not found. Please enable JavaScript to continue browsing this website.", url: "test4" },
  { title: "良い記事", content: "日本の文化について詳しく説明します。茶道は日本の伝統的な芸術の一つで、長い歴史があります。この記事では、茶道の基本的な作法と精神について解説します。", url: "test5" }
];

console.log(`Input: ${mixedArticles.length} articles`);
const filtered = filterArticles(mixedArticles);
console.log(`Output: ${filtered.length} valid articles\n`);

filtered.forEach(article => {
  console.log(`✅ Kept: "${article.title}"`);
  if (article.quickValidation) {
    console.log(`   Reason: ${article.quickValidation.reason}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ Validation testing complete!');