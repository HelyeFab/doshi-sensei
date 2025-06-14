import { ConjugationEngine, getRandomConjugationForm, generateQuestionStem } from '../conjugation';
import { JapaneseWord, WordType, ConjugationForms } from '@/types';

// Test data for different word types - available globally
const testWords: Record<WordType, JapaneseWord> = {
  Ichidan: {
    id: 'taberu-1',
    kanji: '食べる',
    kana: 'たべる',
    romaji: 'taberu',
    meaning: 'to eat',
    type: 'Ichidan',
    jlpt: 'N5'
  },
  Godan: {
    id: 'nomu-1',
    kanji: '飲む',
    kana: 'のむ',
    romaji: 'nomu',
    meaning: 'to drink',
    type: 'Godan',
    jlpt: 'N5'
  },
  Irregular: {
    id: 'suru-1',
    kanji: 'する',
    kana: 'する',
    romaji: 'suru',
    meaning: 'to do',
    type: 'Irregular',
    jlpt: 'N5'
  },
  'i-adjective': {
    id: 'takai-1',
    kanji: '高い',
    kana: 'たかい',
    romaji: 'takai',
    meaning: 'expensive, high',
    type: 'i-adjective',
    jlpt: 'N5'
  },
  'na-adjective': {
    id: 'kirei-1',
    kanji: '綺麗',
    kana: 'きれい',
    romaji: 'kirei',
    meaning: 'beautiful, clean',
    type: 'na-adjective',
    jlpt: 'N5'
  },
  noun: {
    id: 'hon-1',
    kanji: '本',
    kana: 'ほん',
    romaji: 'hon',
    meaning: 'book',
    type: 'noun',
    jlpt: 'N5'
  },
  adverb: {
    id: 'totemo-1',
    kanji: 'とても',
    kana: 'とても',
    romaji: 'totemo',
    meaning: 'very',
    type: 'adverb',
    jlpt: 'N5'
  },
  particle: {
    id: 'wa-1',
    kanji: 'は',
    kana: 'は',
    romaji: 'wa',
    meaning: 'topic particle',
    type: 'particle',
    jlpt: 'N5'
  },
  other: {
    id: 'other-1',
    kanji: 'その他',
    kana: 'そのた',
    romaji: 'sonota',
    meaning: 'other',
    type: 'other',
    jlpt: 'N5'
  }
};

describe('ConjugationEngine', () => {

  describe('Ichidan Verb Conjugations', () => {
    const word = testWords.Ichidan;
    let conjugations: ConjugationForms;

    beforeAll(() => {
      conjugations = ConjugationEngine.conjugate(word);
    });

    test('should conjugate basic plain forms correctly', () => {
      expect(conjugations.present).toBe('食べる');
      expect(conjugations.past).toBe('食べた');
      expect(conjugations.negative).toBe('食べない');
      expect(conjugations.pastNegative).toBe('食べなかった');
      expect(conjugations.volitional).toBe('食べよう');
    });

    test('should conjugate polite forms correctly', () => {
      expect(conjugations.polite).toBe('食べます');
      expect(conjugations.politePast).toBe('食べました');
      expect(conjugations.politeNegative).toBe('食べません');
      expect(conjugations.politePastNegative).toBe('食べませんでした');
      expect(conjugations.politeVolitional).toBe('食べましょう');
    });

    test('should conjugate te-forms correctly', () => {
      expect(conjugations.teForm).toBe('食べて');
      expect(conjugations.negativeTeForm).toBe('食べなくて');
    });

    test('should conjugate potential forms correctly', () => {
      expect(conjugations.potential).toBe('食べられる');
      expect(conjugations.potentialNegative).toBe('食べられない');
      expect(conjugations.potentialPast).toBe('食べられた');
      expect(conjugations.potentialPastNegative).toBe('食べられなかった');
    });

    test('should conjugate passive forms correctly', () => {
      expect(conjugations.passive).toBe('食べられる');
      expect(conjugations.passiveNegative).toBe('食べられない');
      expect(conjugations.passivePast).toBe('食べられた');
      expect(conjugations.passivePastNegative).toBe('食べられなかった');
    });

    test('should conjugate causative forms correctly', () => {
      expect(conjugations.causative).toBe('食べさせる');
      expect(conjugations.causativeNegative).toBe('食べさせない');
      expect(conjugations.causativePast).toBe('食べさせた');
      expect(conjugations.causativePastNegative).toBe('食べさせなかった');
    });

    test('should conjugate conditional forms correctly', () => {
      expect(conjugations.provisional).toBe('食べれば');
      expect(conjugations.provisionalNegative).toBe('食べなければ');
      expect(conjugations.conditional).toBe('食べたら');
      expect(conjugations.conditionalNegative).toBe('食べなかったら');
    });

    test('should conjugate tai forms correctly', () => {
      expect(conjugations.taiForm).toBe('食べたい');
      expect(conjugations.taiFormNegative).toBe('食べたくない');
      expect(conjugations.taiFormPast).toBe('食べたかった');
      expect(conjugations.taiFormPastNegative).toBe('食べたくなかった');
    });
  });

  describe('Godan Verb Conjugations', () => {
    const word = testWords.Godan;
    let conjugations: ConjugationForms;

    beforeAll(() => {
      conjugations = ConjugationEngine.conjugate(word);
    });

    test('should conjugate basic plain forms correctly', () => {
      expect(conjugations.present).toBe('飲む');
      expect(conjugations.past).toBe('飲んだ');
      expect(conjugations.negative).toBe('飲まない');
      expect(conjugations.pastNegative).toBe('飲まなかった');
      expect(conjugations.volitional).toBe('飲もう');
    });

    test('should conjugate polite forms correctly', () => {
      expect(conjugations.polite).toBe('飲みます');
      expect(conjugations.politePast).toBe('飲みました');
      expect(conjugations.politeNegative).toBe('飲みません');
      expect(conjugations.politePastNegative).toBe('飲みませんでした');
      expect(conjugations.politeVolitional).toBe('飲みましょう');
    });

    test('should conjugate te-forms correctly', () => {
      expect(conjugations.teForm).toBe('飲んで');
      expect(conjugations.negativeTeForm).toBe('飲まなくて');
    });

    test('should conjugate potential forms correctly', () => {
      expect(conjugations.potential).toBe('飲める');
      expect(conjugations.potentialNegative).toBe('飲めない');
      expect(conjugations.potentialPast).toBe('飲めた');
      expect(conjugations.potentialPastNegative).toBe('飲めなかった');
    });

    test('should conjugate passive forms correctly', () => {
      expect(conjugations.passive).toBe('飲まれる');
      expect(conjugations.passiveNegative).toBe('飲まれない');
      expect(conjugations.passivePast).toBe('飲まれた');
      expect(conjugations.passivePastNegative).toBe('飲まれなかった');
    });
  });

  describe('Godan Verb Conjugations - Different Endings', () => {
    test('should conjugate う-ending verbs correctly', () => {
      const kauWord: JapaneseWord = {
        id: 'kau-1',
        kanji: '買う',
        kana: 'かう',
        romaji: 'kau',
        meaning: 'to buy',
        type: 'Godan',
        jlpt: 'N5'
      };
      const conjugations = ConjugationEngine.conjugate(kauWord);

      expect(conjugations.past).toBe('買った');
      expect(conjugations.negative).toBe('買わない');
      expect(conjugations.polite).toBe('買います');
      expect(conjugations.teForm).toBe('買って');
      expect(conjugations.potential).toBe('買える');
    });

    test('should conjugate く-ending verbs correctly', () => {
      const kakuWord: JapaneseWord = {
        id: 'kaku-1',
        kanji: '書く',
        kana: 'かく',
        romaji: 'kaku',
        meaning: 'to write',
        type: 'Godan',
        jlpt: 'N5'
      };
      const conjugations = ConjugationEngine.conjugate(kakuWord);

      expect(conjugations.past).toBe('書いた');
      expect(conjugations.negative).toBe('書かない');
      expect(conjugations.polite).toBe('書きます');
      expect(conjugations.teForm).toBe('書いて');
      expect(conjugations.potential).toBe('書ける');
    });

    test('should conjugate ぐ-ending verbs correctly', () => {
      const oyoguWord: JapaneseWord = {
        id: 'oyogu-1',
        kanji: '泳ぐ',
        kana: 'およぐ',
        romaji: 'oyogu',
        meaning: 'to swim',
        type: 'Godan',
        jlpt: 'N4'
      };
      const conjugations = ConjugationEngine.conjugate(oyoguWord);

      expect(conjugations.past).toBe('泳いだ');
      expect(conjugations.negative).toBe('泳がない');
      expect(conjugations.polite).toBe('泳ぎます');
      expect(conjugations.teForm).toBe('泳いで');
      expect(conjugations.potential).toBe('泳げる');
    });

    test('should conjugate す-ending verbs correctly', () => {
      const hanasruWord: JapaneseWord = {
        id: 'hanasu-1',
        kanji: '話す',
        kana: 'はなす',
        romaji: 'hanasu',
        meaning: 'to speak',
        type: 'Godan',
        jlpt: 'N5'
      };
      const conjugations = ConjugationEngine.conjugate(hanasruWord);

      expect(conjugations.past).toBe('話した');
      expect(conjugations.negative).toBe('話さない');
      expect(conjugations.polite).toBe('話します');
      expect(conjugations.teForm).toBe('話して');
      expect(conjugations.potential).toBe('話せる');
    });
  });

  describe('Irregular Verb Conjugations', () => {
    test('should conjugate する correctly', () => {
      const word = testWords.Irregular;
      const conjugations = ConjugationEngine.conjugate(word);

      expect(conjugations.present).toBe('する');
      expect(conjugations.past).toBe('した');
      expect(conjugations.negative).toBe('しない');
      expect(conjugations.pastNegative).toBe('しなかった');
      expect(conjugations.polite).toBe('します');
      expect(conjugations.teForm).toBe('して');
      expect(conjugations.potential).toBe('できる');
    });

    test('should conjugate compound する verbs correctly', () => {
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
      expect(conjugations.teForm).toBe('勉強して');
      expect(conjugations.potential).toBe('勉強できる');
    });

    test('should conjugate 来る correctly', () => {
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
      expect(conjugations.pastNegative).toBe('来なかった');
      expect(conjugations.polite).toBe('来ます');
      expect(conjugations.teForm).toBe('来て');
      expect(conjugations.potential).toBe('来られる');
    });
  });

  describe('i-Adjective Conjugations', () => {
    const word = testWords['i-adjective'];
    let conjugations: ConjugationForms;

    beforeAll(() => {
      conjugations = ConjugationEngine.conjugate(word);
    });

    test('should conjugate basic forms correctly', () => {
      expect(conjugations.present).toBe('高い');
      expect(conjugations.past).toBe('高かった');
      expect(conjugations.negative).toBe('高くない');
      expect(conjugations.pastNegative).toBe('高くなかった');
    });

    test('should conjugate polite forms correctly', () => {
      expect(conjugations.polite).toBe('高いです');
      expect(conjugations.politePast).toBe('高かったです');
      expect(conjugations.politeNegative).toBe('高くないです');
      expect(conjugations.politePastNegative).toBe('高くなかったです');
    });

    test('should conjugate conditional forms correctly', () => {
      expect(conjugations.provisional).toBe('高ければ');
      expect(conjugations.provisionalNegative).toBe('高くなければ');
      expect(conjugations.conditional).toBe('高かったら');
      expect(conjugations.conditionalNegative).toBe('高くなかったら');
    });

    test('should conjugate te-form correctly', () => {
      expect(conjugations.teForm).toBe('高くて');
      expect(conjugations.negativeTeForm).toBe('高くなくて');
    });

    test('should not have verb-specific forms', () => {
      expect(conjugations.potential).toBe('');
      expect(conjugations.passive).toBe('');
      expect(conjugations.causative).toBe('');
      expect(conjugations.taiForm).toBe('');
    });
  });

  describe('na-Adjective Conjugations', () => {
    const word = testWords['na-adjective'];
    let conjugations: ConjugationForms;

    beforeAll(() => {
      conjugations = ConjugationEngine.conjugate(word);
    });

    test('should conjugate basic forms correctly', () => {
      expect(conjugations.present).toBe('綺麗だ');
      expect(conjugations.past).toBe('綺麗だった');
      expect(conjugations.negative).toBe('綺麗じゃない');
      expect(conjugations.pastNegative).toBe('綺麗じゃなかった');
    });

    test('should conjugate polite forms correctly', () => {
      expect(conjugations.polite).toBe('綺麗です');
      expect(conjugations.politePast).toBe('綺麗でした');
      expect(conjugations.politeNegative).toBe('綺麗じゃないです');
      expect(conjugations.politePastNegative).toBe('綺麗じゃなかったです');
    });

    test('should conjugate conditional forms correctly', () => {
      expect(conjugations.provisional).toBe('綺麗なら');
      expect(conjugations.provisionalNegative).toBe('綺麗じゃなければ');
      expect(conjugations.conditional).toBe('綺麗だったら');
      expect(conjugations.conditionalNegative).toBe('綺麗じゃなかったら');
    });

    test('should conjugate te-form correctly', () => {
      expect(conjugations.teForm).toBe('綺麗で');
      expect(conjugations.negativeTeForm).toBe('綺麗じゃなくて');
    });
  });

  describe('Non-conjugating word types', () => {
    test('should return empty conjugations for nouns', () => {
      const conjugations = ConjugationEngine.conjugate(testWords.noun);
      expect(conjugations.present).toBe('');
      expect(conjugations.past).toBe('');
      expect(conjugations.negative).toBe('');
    });

    test('should return empty conjugations for adverbs', () => {
      const conjugations = ConjugationEngine.conjugate(testWords.adverb);
      expect(conjugations.present).toBe('');
      expect(conjugations.past).toBe('');
      expect(conjugations.negative).toBe('');
    });

    test('should return empty conjugations for particles', () => {
      const conjugations = ConjugationEngine.conjugate(testWords.particle);
      expect(conjugations.present).toBe('');
      expect(conjugations.past).toBe('');
      expect(conjugations.negative).toBe('');
    });

    test('should return empty conjugations for other types', () => {
      const conjugations = ConjugationEngine.conjugate(testWords.other);
      expect(conjugations.present).toBe('');
      expect(conjugations.past).toBe('');
      expect(conjugations.negative).toBe('');
    });
  });

  describe('getConjugationRule', () => {
    test('should return correct rules for Ichidan verbs', () => {
      const rule = ConjugationEngine.getConjugationRule('Ichidan', 'past');
      expect(rule).toBe('Remove る, add た');
    });

    test('should return correct rules for Godan verbs', () => {
      const rule = ConjugationEngine.getConjugationRule('Godan', 'past');
      expect(rule).toBe('Change ending to う-column, add た/だ');
    });

    test('should return correct rules for i-adjectives', () => {
      const rule = ConjugationEngine.getConjugationRule('i-adjective', 'past');
      expect(rule).toBe('Remove い, add かった');
    });

    test('should return default for unknown combinations', () => {
      const rule = ConjugationEngine.getConjugationRule('noun', 'past');
      expect(rule).toBe('No rule available for this combination');
    });
  });
});

describe('Helper Functions', () => {
  describe('getRandomConjugationForm', () => {
    test('should return valid form for verbs', () => {
      const form = getRandomConjugationForm('Ichidan');
      expect(['present', 'past', 'negative', 'pastNegative', 'polite', 'politePast', 'teForm', 'potential', 'conditional']).toContain(form);
    });

    test('should return valid form for adjectives', () => {
      const form = getRandomConjugationForm('i-adjective');
      expect(['present', 'past', 'negative', 'pastNegative', 'polite', 'politePast', 'teForm']).toContain(form);
    });

    test('should be consistent with multiple calls', () => {
      // Test that it always returns a valid form
      for (let i = 0; i < 10; i++) {
        const form = getRandomConjugationForm('Godan');
        expect(typeof form).toBe('string');
        expect(form.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateQuestionStem', () => {
    test('should generate stem for Ichidan verbs', () => {
      const word = testWords.Ichidan;
      const stem = generateQuestionStem(word, 'past');
      expect(stem).toBe('たべ？');
    });

    test('should generate stem for Godan verbs', () => {
      const word = testWords.Godan;
      const stem = generateQuestionStem(word, 'past');
      expect(stem).toBe('のむ？');
    });

    test('should generate stem for i-adjectives', () => {
      const word = testWords['i-adjective'];
      const stem = generateQuestionStem(word, 'past');
      expect(stem).toBe('たか？');
    });

    test('should generate stem for na-adjectives', () => {
      const word = testWords['na-adjective'];
      const stem = generateQuestionStem(word, 'past');
      expect(stem).toBe('きれい？');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle words with missing kanji gracefully', () => {
    const word: JapaneseWord = {
      id: 'test-1',
      kanji: '',
      kana: 'たべる',
      romaji: 'taberu',
      meaning: 'to eat',
      type: 'Ichidan',
      jlpt: 'N5'
    };

    expect(() => ConjugationEngine.conjugate(word)).not.toThrow();
  });

  test('should handle unknown irregular verbs', () => {
    const word: JapaneseWord = {
      id: 'unknown-1',
      kanji: '未知る',
      kana: 'みちる',
      romaji: 'michiru',
      meaning: 'unknown verb',
      type: 'Irregular',
      jlpt: 'N1'
    };

    const conjugations = ConjugationEngine.conjugate(word);
    expect(conjugations.present).toBe('');
    expect(conjugations.past).toBe('');
  });

  test('should handle empty strings gracefully', () => {
    const word: JapaneseWord = {
      id: 'empty-1',
      kanji: '',
      kana: '',
      romaji: '',
      meaning: '',
      type: 'Ichidan',
      jlpt: 'N5'
    };

    expect(() => ConjugationEngine.conjugate(word)).not.toThrow();
  });
});
