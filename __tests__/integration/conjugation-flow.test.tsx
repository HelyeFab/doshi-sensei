import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConjugationEngine } from '@/utils/conjugation';
import { JapaneseWord } from '@/types';

describe('Conjugation Flow Integration Tests', () => {
  const testWord: JapaneseWord = {
    id: 'test-1',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: 'to eat',
    type: 'Ichidan',
    jlpt: 'N5'
  };

  describe('Ichidan Verb Conjugation Flow', () => {
    test('should correctly conjugate through all forms', () => {
      const conjugations = ConjugationEngine.conjugate(testWord);

      // Test basic forms
      expect(conjugations.present).toBe('食べる');
      expect(conjugations.past).toBe('食べた');
      expect(conjugations.negative).toBe('食べない');
      expect(conjugations.pastNegative).toBe('食べなかった');

      // Test polite forms
      expect(conjugations.polite).toBe('食べます');
      expect(conjugations.politePast).toBe('食べました');
      expect(conjugations.politeNegative).toBe('食べません');
      expect(conjugations.politePastNegative).toBe('食べませんでした');

      // Test potential forms
      expect(conjugations.potential).toBe('食べられる');
      expect(conjugations.potentialNegative).toBe('食べられない');

      // Test passive forms
      expect(conjugations.passive).toBe('食べられる');
      expect(conjugations.passiveNegative).toBe('食べられない');

      // Test causative forms
      expect(conjugations.causative).toBe('食べさせる');
      expect(conjugations.causativeNegative).toBe('食べさせない');
    });

    test('should provide consistent conjugation rules', () => {
      const presentRule = ConjugationEngine.getConjugationRule('Ichidan', 'present');
      const pastRule = ConjugationEngine.getConjugationRule('Ichidan', 'past');
      const negativeRule = ConjugationEngine.getConjugationRule('Ichidan', 'negative');

      expect(presentRule).toBe('Dictionary form - no change');
      expect(pastRule).toBe('Remove る, add た');
      expect(negativeRule).toBe('Remove る, add ない');
    });
  });

  describe('Godan Verb Conjugation Flow', () => {
    const godanWord: JapaneseWord = {
      id: 'test-2',
      kanji: '飲む',
      kana: 'のむ',
      romaji: 'nomu',
      meaning: 'to drink',
      type: 'Godan',
      jlpt: 'N5'
    };

    test('should correctly conjugate む-ending Godan verbs', () => {
      const conjugations = ConjugationEngine.conjugate(godanWord);

      expect(conjugations.present).toBe('飲む');
      expect(conjugations.past).toBe('飲んだ');
      expect(conjugations.negative).toBe('飲まない');
      expect(conjugations.pastNegative).toBe('飲まなかった');
      expect(conjugations.polite).toBe('飲みます');
      expect(conjugations.teForm).toBe('飲んで');
      expect(conjugations.potential).toBe('飲める');
    });

    test('should handle different Godan endings consistently', () => {
      const testWords = [
        { word: '買う', ending: 'う', expectedPast: '買った', expectedNegative: '買わない' },
        { word: '書く', ending: 'く', expectedPast: '書いた', expectedNegative: '書かない' },
        { word: '話す', ending: 'す', expectedPast: '話した', expectedNegative: '話さない' },
      ];

      testWords.forEach(({ word, expectedPast, expectedNegative }) => {
        const testWord: JapaneseWord = {
          id: `test-${word}`,
          kanji: word,
          kana: word,
          romaji: word,
          meaning: 'test',
          type: 'Godan',
          jlpt: 'N5'
        };

        const conjugations = ConjugationEngine.conjugate(testWord);
        expect(conjugations.past).toBe(expectedPast);
        expect(conjugations.negative).toBe(expectedNegative);
      });
    });
  });

  describe('Irregular Verb Conjugation Flow', () => {
    test('should handle する verb correctly', () => {
      const suruWord: JapaneseWord = {
        id: 'suru-1',
        kanji: 'する',
        kana: 'する',
        romaji: 'suru',
        meaning: 'to do',
        type: 'Irregular',
        jlpt: 'N5'
      };

      const conjugations = ConjugationEngine.conjugate(suruWord);

      expect(conjugations.present).toBe('する');
      expect(conjugations.past).toBe('した');
      expect(conjugations.negative).toBe('しない');
      expect(conjugations.polite).toBe('します');
      expect(conjugations.teForm).toBe('して');
      expect(conjugations.potential).toBe('できる');
    });

    test('should handle compound する verbs correctly', () => {
      const benkyouWord: JapaneseWord = {
        id: 'benkyou-1',
        kanji: '勉強する',
        kana: 'べんきょうする',
        romaji: 'benkyou suru',
        meaning: 'to study',
        type: 'Irregular',
        jlpt: 'N5'
      };

      const conjugations = ConjugationEngine.conjugate(benkyouWord);

      expect(conjugations.present).toBe('勉強する');
      expect(conjugations.past).toBe('勉強した');
      expect(conjugations.negative).toBe('勉強しない');
      expect(conjugations.polite).toBe('勉強します');
      expect(conjugations.potential).toBe('勉強できる');
    });

    test('should handle 来る verb correctly', () => {
      const kuruWord: JapaneseWord = {
        id: 'kuru-1',
        kanji: '来る',
        kana: 'くる',
        romaji: 'kuru',
        meaning: 'to come',
        type: 'Irregular',
        jlpt: 'N5'
      };

      const conjugations = ConjugationEngine.conjugate(kuruWord);

      expect(conjugations.present).toBe('来る');
      expect(conjugations.past).toBe('来た');
      expect(conjugations.negative).toBe('来ない');
      expect(conjugations.polite).toBe('来ます');
      expect(conjugations.teForm).toBe('来て');
      expect(conjugations.potential).toBe('来られる');
    });
  });

  describe('Adjective Conjugation Flow', () => {
    test('should handle i-adjectives correctly', () => {
      const iAdjectiveWord: JapaneseWord = {
        id: 'takai-1',
        kanji: '高い',
        kana: 'たかい',
        romaji: 'takai',
        meaning: 'expensive',
        type: 'i-adjective',
        jlpt: 'N5'
      };

      const conjugations = ConjugationEngine.conjugate(iAdjectiveWord);

      expect(conjugations.present).toBe('高い');
      expect(conjugations.past).toBe('高かった');
      expect(conjugations.negative).toBe('高くない');
      expect(conjugations.pastNegative).toBe('高くなかった');
      expect(conjugations.polite).toBe('高いです');
      expect(conjugations.teForm).toBe('高くて');

      // Should not have verb-specific forms
      expect(conjugations.potential).toBe('');
      expect(conjugations.passive).toBe('');
      expect(conjugations.causative).toBe('');
    });

    test('should handle na-adjectives correctly', () => {
      const naAdjectiveWord: JapaneseWord = {
        id: 'kirei-1',
        kanji: '綺麗',
        kana: 'きれい',
        romaji: 'kirei',
        meaning: 'beautiful',
        type: 'na-adjective',
        jlpt: 'N5'
      };

      const conjugations = ConjugationEngine.conjugate(naAdjectiveWord);

      expect(conjugations.present).toBe('綺麗だ');
      expect(conjugations.past).toBe('綺麗だった');
      expect(conjugations.negative).toBe('綺麗じゃない');
      expect(conjugations.pastNegative).toBe('綺麗じゃなかった');
      expect(conjugations.polite).toBe('綺麗です');
      expect(conjugations.teForm).toBe('綺麗で');

      // Should not have verb-specific forms
      expect(conjugations.potential).toBe('');
      expect(conjugations.passive).toBe('');
      expect(conjugations.causative).toBe('');
    });
  });

  describe('Cross-Type Consistency', () => {
    test('should maintain consistency across similar forms', () => {
      const words = [
        { kanji: '食べる', type: 'Ichidan' as const },
        { kanji: '飲む', type: 'Godan' as const },
        { kanji: 'する', type: 'Irregular' as const }
      ];

      words.forEach(({ kanji, type }) => {
        const word: JapaneseWord = {
          id: `test-${kanji}`,
          kanji,
          kana: kanji,
          romaji: kanji,
          meaning: 'test',
          type,
          jlpt: 'N5'
        };

        const conjugations = ConjugationEngine.conjugate(word);

        // All verbs should have these basic forms
        expect(conjugations.present).toBeTruthy();
        expect(conjugations.past).toBeTruthy();
        expect(conjugations.negative).toBeTruthy();
        expect(conjugations.polite).toBeTruthy();
        expect(conjugations.teForm).toBeTruthy();

        // Present form should match the original kanji for all verbs
        expect(conjugations.present).toBe(kanji);
      });
    });

    test('should handle empty or null inputs gracefully', () => {
      const emptyWord: JapaneseWord = {
        id: 'empty-1',
        kanji: '',
        kana: '',
        romaji: '',
        meaning: '',
        type: 'Ichidan',
        jlpt: 'N5'
      };

      expect(() => ConjugationEngine.conjugate(emptyWord)).not.toThrow();

      const conjugations = ConjugationEngine.conjugate(emptyWord);
      // Should return some result, even if empty
      expect(typeof conjugations).toBe('object');
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large numbers of conjugations efficiently', () => {
      const words: JapaneseWord[] = [];
      for (let i = 0; i < 1000; i++) {
        words.push({
          id: `word-${i}`,
          kanji: i % 2 === 0 ? '食べる' : '飲む',
          kana: i % 2 === 0 ? 'たべる' : 'のむ',
          romaji: i % 2 === 0 ? 'taberu' : 'nomu',
          meaning: 'test',
          type: i % 2 === 0 ? 'Ichidan' : 'Godan',
          jlpt: 'N5'
        });
      }

      const startTime = performance.now();
      words.forEach(word => {
        ConjugationEngine.conjugate(word);
      });
      const endTime = performance.now();

      // Should complete within reasonable time (less than 1 second for 1000 conjugations)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should not cause memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        const word: JapaneseWord = {
          id: `test-${i}`,
          kanji: '食べる',
          kana: 'たべる',
          romaji: 'taberu',
          meaning: 'to eat',
          type: 'Ichidan',
          jlpt: 'N5'
        };
        ConjugationEngine.conjugate(word);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
