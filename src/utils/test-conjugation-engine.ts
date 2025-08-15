// Comprehensive Conjugation Engine Test
// This file tests the ExtendedConjugationEngine with various verb and adjective types

import { ExtendedConjugationEngine } from './conjugation-extended';
import { JapaneseWord, WordType } from '@/types';

// Test data structure
interface TestCase {
  name: string;
  word: JapaneseWord;
  expectedForms: { [key: string]: string };
}

// ===== ICHIDAN VERBS =====
const ichidanTests: TestCase[] = [
  {
    name: '食べる (to eat)',
    word: {
      id: 'test-taberu',
      kanji: '食べる',
      kana: 'たべる',
      meaning: 'to eat',
      type: 'Ichidan',
      jlpt: 'N5',
      romaji: 'taberu',
      tags: []
    },
    expectedForms: {
      present: '食べる',
      past: '食べた',
      negative: '食べない',
      pastNegative: '食べなかった',
      polite: '食べます',
      politePast: '食べました',
      teForm: '食べて',
      potential: '食べられる',
      passive: '食べられる',
      causative: '食べさせる',
      volitional: '食べよう',
      conditional: '食べたら',
      provisional: '食べれば',
      imperativePlain: '食べろ',
      taiForm: '食べたい',
      progressive: '食べている'
    }
  },
  {
    name: '見る (to see)',
    word: {
      id: 'test-miru',
      kanji: '見る',
      kana: 'みる',
      meaning: 'to see',
      type: 'Ichidan',
      jlpt: 'N5',
      romaji: 'miru',
      tags: []
    },
    expectedForms: {
      present: '見る',
      past: '見た',
      negative: '見ない',
      polite: '見ます',
      teForm: '見て',
      potential: '見られる',
      causative: '見させる',
      progressive: '見ている'
    }
  },
  {
    name: '起きる (to wake up)',
    word: {
      id: 'test-okiru',
      kanji: '起きる',
      kana: 'おきる',
      meaning: 'to wake up',
      type: 'Ichidan',
      jlpt: 'N4',
      romaji: 'okiru',
      tags: []
    },
    expectedForms: {
      present: '起きる',
      past: '起きた',
      negative: '起きない',
      teForm: '起きて',
      causativePassive: '起きさせられる'
    }
  }
];

// ===== GODAN VERBS =====
const godanTests: TestCase[] = [
  {
    name: '飲む (to drink)',
    word: {
      id: 'test-nomu',
      kanji: '飲む',
      kana: 'のむ',
      meaning: 'to drink',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'nomu',
      tags: []
    },
    expectedForms: {
      present: '飲む',
      past: '飲んだ',
      negative: '飲まない',
      pastNegative: '飲まなかった',
      polite: '飲みます',
      politePast: '飲みました',
      teForm: '飲んで',
      potential: '飲める',
      passive: '飲まれる',
      causative: '飲ませる',
      volitional: '飲もう',
      conditional: '飲んだら',
      provisional: '飲めば',
      imperativePlain: '飲め',
      taiForm: '飲みたい',
      progressive: '飲んでいる'
    }
  },
  {
    name: '行く (to go)',
    word: {
      id: 'test-iku',
      kanji: '行く',
      kana: 'いく',
      meaning: 'to go',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'iku',
      tags: []
    },
    expectedForms: {
      present: '行く',
      past: '行った', // Special case!
      negative: '行かない',
      polite: '行きます',
      teForm: '行って', // Special case!
      potential: '行ける',
      causative: '行かせる',
      volitional: '行こう'
    }
  },
  {
    name: '読む (to read)',
    word: {
      id: 'test-yomu',
      kanji: '読む',
      kana: 'よむ',
      meaning: 'to read',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'yomu',
      tags: []
    },
    expectedForms: {
      present: '読む',
      past: '読んだ',
      negative: '読まない',
      teForm: '読んで',
      potential: '読める',
      passive: '読まれる'
    }
  },
  {
    name: '書く (to write)',
    word: {
      id: 'test-kaku',
      kanji: '書く',
      kana: 'かく',
      meaning: 'to write',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'kaku',
      tags: []
    },
    expectedForms: {
      present: '書く',
      past: '書いた',
      negative: '書かない',
      teForm: '書いて',
      potential: '書ける',
      provisional: '書けば'
    }
  },
  {
    name: '話す (to speak)',
    word: {
      id: 'test-hanasu',
      kanji: '話す',
      kana: 'はなす',
      meaning: 'to speak',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'hanasu',
      tags: []
    },
    expectedForms: {
      present: '話す',
      past: '話した',
      negative: '話さない',
      teForm: '話して',
      potential: '話せる',
      causativePassive: '話させられる'
    }
  },
  {
    name: '泳ぐ (to swim)',
    word: {
      id: 'test-oyogu',
      kanji: '泳ぐ',
      kana: 'およぐ',
      meaning: 'to swim',
      type: 'Godan',
      jlpt: 'N4',
      romaji: 'oyogu',
      tags: []
    },
    expectedForms: {
      present: '泳ぐ',
      past: '泳いだ',
      negative: '泳がない',
      teForm: '泳いで',
      potential: '泳げる'
    }
  },
  {
    name: '待つ (to wait)',
    word: {
      id: 'test-matsu',
      kanji: '待つ',
      kana: 'まつ',
      meaning: 'to wait',
      type: 'Godan',
      jlpt: 'N4',
      romaji: 'matsu',
      tags: []
    },
    expectedForms: {
      present: '待つ',
      past: '待った',
      negative: '待たない',
      teForm: '待って',
      potential: '待てる'
    }
  },
  {
    name: '買う (to buy)',
    word: {
      id: 'test-kau',
      kanji: '買う',
      kana: 'かう',
      meaning: 'to buy',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'kau',
      tags: []
    },
    expectedForms: {
      present: '買う',
      past: '買った',
      negative: '買わない',
      teForm: '買って',
      potential: '買える',
      volitional: '買おう'
    }
  },
  {
    name: '作る (to make)',
    word: {
      id: 'test-tsukuru',
      kanji: '作る',
      kana: 'つくる',
      meaning: 'to make',
      type: 'Godan',
      jlpt: 'N5',
      romaji: 'tsukuru',
      tags: []
    },
    expectedForms: {
      present: '作る',
      past: '作った',
      negative: '作らない',
      teForm: '作って',
      potential: '作れる'
    }
  },
  {
    name: '死ぬ (to die)',
    word: {
      id: 'test-shinu',
      kanji: '死ぬ',
      kana: 'しぬ',
      meaning: 'to die',
      type: 'Godan',
      jlpt: 'N4',
      romaji: 'shinu',
      tags: []
    },
    expectedForms: {
      present: '死ぬ',
      past: '死んだ',
      negative: '死なない',
      teForm: '死んで',
      potential: '死ねる'
    }
  },
  {
    name: '遊ぶ (to play)',
    word: {
      id: 'test-asobu',
      kanji: '遊ぶ',
      kana: 'あそぶ',
      meaning: 'to play',
      type: 'Godan',
      jlpt: 'N4',
      romaji: 'asobu',
      tags: []
    },
    expectedForms: {
      present: '遊ぶ',
      past: '遊んだ',
      negative: '遊ばない',
      teForm: '遊んで',
      potential: '遊べる'
    }
  }
];

// ===== IRREGULAR VERBS =====
const irregularTests: TestCase[] = [
  {
    name: 'する (to do)',
    word: {
      id: 'test-suru',
      kanji: 'する',
      kana: 'する',
      meaning: 'to do',
      type: 'Irregular',
      jlpt: 'N5',
      romaji: 'suru',
      tags: []
    },
    expectedForms: {
      present: 'する',
      past: 'した',
      negative: 'しない',
      polite: 'します',
      teForm: 'して',
      potential: 'できる',
      passive: 'される',
      causative: 'させる',
      volitional: 'しよう',
      provisional: 'すれば'
    }
  },
  {
    name: '勉強する (to study)',
    word: {
      id: 'test-benkyou-suru',
      kanji: '勉強する',
      kana: 'べんきょうする',
      meaning: 'to study',
      type: 'Irregular',
      jlpt: 'N5',
      romaji: 'benkyou suru',
      tags: []
    },
    expectedForms: {
      present: '勉強する',
      past: '勉強した',
      negative: '勉強しない',
      teForm: '勉強して',
      potential: '勉強できる'
    }
  },
  {
    name: '来る (to come)',
    word: {
      id: 'test-kuru',
      kanji: '来る',
      kana: 'くる',
      meaning: 'to come',
      type: 'Irregular',
      jlpt: 'N5',
      romaji: 'kuru',
      tags: []
    },
    expectedForms: {
      present: '来る',
      past: '来た',
      negative: '来ない',
      polite: '来ます',
      teForm: '来て',
      potential: '来られる',
      passive: '来られる',
      causative: '来させる',
      volitional: '来よう',
      provisional: '来れば'
    }
  }
];

// ===== I-ADJECTIVES =====
const iAdjectiveTests: TestCase[] = [
  {
    name: '高い (expensive/tall)',
    word: {
      id: 'test-takai',
      kanji: '高い',
      kana: 'たかい',
      meaning: 'expensive/tall',
      type: 'i-adjective',
      jlpt: 'N5',
      romaji: 'takai',
      tags: []
    },
    expectedForms: {
      present: '高い',
      past: '高かった',
      negative: '高くない',
      pastNegative: '高くなかった',
      teForm: '高くて',
      polite: '高いです',
      politeNegative: '高くないです',
      provisional: '高ければ',
      conditional: '高かったら',
      presumptive: '高いだろう'
    }
  },
  {
    name: '美味しい (delicious)',
    word: {
      id: 'test-oishii',
      kanji: '美味しい',
      kana: 'おいしい',
      meaning: 'delicious',
      type: 'i-adjective',
      jlpt: 'N5',
      romaji: 'oishii',
      tags: []
    },
    expectedForms: {
      present: '美味しい',
      past: '美味しかった',
      negative: '美味しくない',
      teForm: '美味しくて',
      adverbialNegative: '美味しく'
    }
  },
  {
    name: '新しい (new)',
    word: {
      id: 'test-atarashii',
      kanji: '新しい',
      kana: 'あたらしい',
      meaning: 'new',
      type: 'i-adjective',
      jlpt: 'N5',
      romaji: 'atarashii',
      tags: []
    },
    expectedForms: {
      present: '新しい',
      past: '新しかった',
      negative: '新しくない',
      teForm: '新しくて'
    }
  },
  {
    name: '楽しい (fun)',
    word: {
      id: 'test-tanoshii',
      kanji: '楽しい',
      kana: 'たのしい',
      meaning: 'fun',
      type: 'i-adjective',
      jlpt: 'N4',
      romaji: 'tanoshii',
      tags: []
    },
    expectedForms: {
      present: '楽しい',
      past: '楽しかった',
      negative: '楽しくない',
      provisionalNegative: '楽しくなければ'
    }
  }
];

// ===== NA-ADJECTIVES =====
const naAdjectiveTests: TestCase[] = [
  {
    name: '綺麗 (beautiful/clean)',
    word: {
      id: 'test-kirei',
      kanji: '綺麗',
      kana: 'きれい',
      meaning: 'beautiful/clean',
      type: 'na-adjective',
      jlpt: 'N5',
      romaji: 'kirei',
      tags: []
    },
    expectedForms: {
      present: '綺麗だ',
      past: '綺麗だった',
      negative: '綺麗じゃない',
      pastNegative: '綺麗じゃなかった',
      teForm: '綺麗で',
      polite: '綺麗です',
      politeNegative: '綺麗じゃありません',
      provisional: '綺麗なら',
      conditional: '綺麗だったら',
      presumptive: '綺麗だろう'
    }
  },
  {
    name: '元気 (healthy/energetic)',
    word: {
      id: 'test-genki',
      kanji: '元気',
      kana: 'げんき',
      meaning: 'healthy/energetic',
      type: 'na-adjective',
      jlpt: 'N5',
      romaji: 'genki',
      tags: []
    },
    expectedForms: {
      present: '元気だ',
      past: '元気だった',
      negative: '元気じゃない',
      teForm: '元気で',
      polite: '元気です',
      adverbialNegative: '元気に'
    }
  },
  {
    name: '静か (quiet)',
    word: {
      id: 'test-shizuka',
      kanji: '静か',
      kana: 'しずか',
      meaning: 'quiet',
      type: 'na-adjective',
      jlpt: 'N5',
      romaji: 'shizuka',
      tags: []
    },
    expectedForms: {
      present: '静かだ',
      past: '静かだった',
      negative: '静かじゃない',
      teForm: '静かで'
    }
  },
  {
    name: '便利 (convenient)',
    word: {
      id: 'test-benri',
      kanji: '便利',
      kana: 'べんり',
      meaning: 'convenient',
      type: 'na-adjective',
      jlpt: 'N4',
      romaji: 'benri',
      tags: []
    },
    expectedForms: {
      present: '便利だ',
      negative: '便利じゃない',
      conditionalNegative: '便利じゃなかったら'
    }
  }
];

// Test runner function
export function runConjugationTests() {
  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };

  console.log('🧪 Starting Conjugation Engine Tests\n');

  // Helper function to test a single case
  function testCase(testCase: TestCase, category: string) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      const conjugations = ExtendedConjugationEngine.conjugate(testCase.word);
      
      let casePass = true;
      for (const [form, expected] of Object.entries(testCase.expectedForms)) {
        const actual = (conjugations as any)[form];
        if (actual !== expected) {
          results.errors.push(
            `❌ ${category} - ${testCase.name}: ${form} expected "${expected}" but got "${actual}"`
          );
          casePass = false;
        }
      }
      
      if (casePass) {
        console.log(`✅ ${testCase.name} - All forms correct`);
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.errors.push(`🔥 ${category} - ${testCase.name}: ${error}`);
      results.failed++;
    }
  }

  // Test Ichidan verbs
  console.log('\n📘 ICHIDAN VERBS\n');
  ichidanTests.forEach(test => testCase(test, 'Ichidan'));

  // Test Godan verbs
  console.log('\n📗 GODAN VERBS\n');
  godanTests.forEach(test => testCase(test, 'Godan'));

  // Test Irregular verbs
  console.log('\n📙 IRREGULAR VERBS\n');
  irregularTests.forEach(test => testCase(test, 'Irregular'));

  // Test i-adjectives
  console.log('\n📕 I-ADJECTIVES\n');
  iAdjectiveTests.forEach(test => testCase(test, 'i-adjective'));

  // Test na-adjectives
  console.log('\n📓 NA-ADJECTIVES\n');
  naAdjectiveTests.forEach(test => testCase(test, 'na-adjective'));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n🔍 FAILED TEST DETAILS:\n');
    results.errors.forEach(error => console.log(error));
  }

  return results;
}

// Performance test
export function performanceTest() {
  const testWords: JapaneseWord[] = [
    { id: '1', kanji: '食べる', kana: 'たべる', meaning: 'eat', type: 'Ichidan', jlpt: 'N5', romaji: 'taberu', tags: [] },
    { id: '2', kanji: '飲む', kana: 'のむ', meaning: 'drink', type: 'Godan', jlpt: 'N5', romaji: 'nomu', tags: [] },
    { id: '3', kanji: 'する', kana: 'する', meaning: 'do', type: 'Irregular', jlpt: 'N5', romaji: 'suru', tags: [] },
    { id: '4', kanji: '高い', kana: 'たかい', meaning: 'tall', type: 'i-adjective', jlpt: 'N5', romaji: 'takai', tags: [] },
    { id: '5', kanji: '綺麗', kana: 'きれい', meaning: 'beautiful', type: 'na-adjective', jlpt: 'N5', romaji: 'kirei', tags: [] }
  ];

  console.log('\n⚡ PERFORMANCE TEST\n');
  
  const iterations = 1000;
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    testWords.forEach(word => {
      ExtendedConjugationEngine.conjugate(word);
    });
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTimePerWord = totalTime / (iterations * testWords.length);
  
  console.log(`Total conjugations: ${iterations * testWords.length}`);
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per word: ${avgTimePerWord.toFixed(3)}ms`);
  console.log(`Conjugations per second: ${Math.round(1000 / avgTimePerWord)}`);
}

// Export for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).runConjugationTests = runConjugationTests;
  (window as any).performanceTest = performanceTest;
  (window as any).ExtendedConjugationEngine = ExtendedConjugationEngine;
}