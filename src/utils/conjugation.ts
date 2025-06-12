import { JapaneseWord, ConjugationForms, WordType } from '@/types';

// Conjugation utility functions
export class ConjugationEngine {

  // Main conjugation function
  static conjugate(word: JapaneseWord): ConjugationForms {
    switch (word.type) {
      case 'Ichidan':
        return this.conjugateIchidan(word);
      case 'Godan':
        return this.conjugateGodan(word);
      case 'Irregular':
        return this.conjugateIrregular(word);
      case 'i-adjective':
        return this.conjugateIAdjective(word);
      case 'na-adjective':
        return this.conjugateNaAdjective(word);
      default:
        return this.getEmptyConjugations();
    }
  }

  // Ichidan verb conjugations (る-verbs)
  private static conjugateIchidan(word: JapaneseWord): ConjugationForms {
    const stem = word.kana.slice(0, -1); // Remove る

    return {
      present: word.kana,
      past: stem + 'た',
      negative: stem + 'ない',
      pastNegative: stem + 'なかった',
      polite: stem + 'ます',
      politePast: stem + 'ました',
      politeNegative: stem + 'ません',
      politePastNegative: stem + 'ませんでした',
      teForm: stem + 'て',
      potential: stem + 'られる',
      passive: stem + 'られる',
      causative: stem + 'させる',
      conditional: stem + 'れば',
      volitional: stem + 'よう',
      imperative: stem + 'ろ'
    };
  }

  // Godan verb conjugations (う-verbs)
  private static conjugateGodan(word: JapaneseWord): ConjugationForms {
    const kana = word.kana;
    const lastChar = kana.slice(-1);
    const stem = kana.slice(0, -1);

    // Get the conjugation mappings for the last character
    const mappings = this.getGodanMappings(lastChar);

    if (!mappings) {
      return this.getEmptyConjugations();
    }

    return {
      present: kana,
      past: stem + mappings.past,
      negative: stem + mappings.negative + 'ない',
      pastNegative: stem + mappings.negative + 'なかった',
      polite: stem + mappings.polite + 'ます',
      politePast: stem + mappings.polite + 'ました',
      politeNegative: stem + mappings.polite + 'ません',
      politePastNegative: stem + mappings.polite + 'ませんでした',
      teForm: stem + mappings.teForm,
      potential: stem + mappings.potential + 'る',
      passive: stem + mappings.passive + 'れる',
      causative: stem + mappings.causative + 'せる',
      conditional: stem + mappings.conditional + 'ば',
      volitional: stem + mappings.volitional,
      imperative: stem + mappings.imperative
    };
  }

  // Get Godan conjugation mappings based on ending
  private static getGodanMappings(ending: string) {
    const mappings: { [key: string]: any } = {
      'う': {
        past: 'った',
        negative: 'わ',
        polite: 'い',
        teForm: 'って',
        potential: 'え',
        passive: 'わ',
        causative: 'わ',
        conditional: 'え',
        volitional: 'おう',
        imperative: 'え'
      },
      'く': {
        past: 'いた',
        negative: 'か',
        polite: 'き',
        teForm: 'いて',
        potential: 'け',
        passive: 'か',
        causative: 'か',
        conditional: 'け',
        volitional: 'こう',
        imperative: 'け'
      },
      'ぐ': {
        past: 'いだ',
        negative: 'が',
        polite: 'ぎ',
        teForm: 'いで',
        potential: 'げ',
        passive: 'が',
        causative: 'が',
        conditional: 'げ',
        volitional: 'ごう',
        imperative: 'げ'
      },
      'す': {
        past: 'した',
        negative: 'さ',
        polite: 'し',
        teForm: 'して',
        potential: 'せ',
        passive: 'さ',
        causative: 'さ',
        conditional: 'せ',
        volitional: 'そう',
        imperative: 'せ'
      },
      'つ': {
        past: 'った',
        negative: 'た',
        polite: 'ち',
        teForm: 'って',
        potential: 'て',
        passive: 'た',
        causative: 'た',
        conditional: 'て',
        volitional: 'とう',
        imperative: 'て'
      },
      'ぬ': {
        past: 'んだ',
        negative: 'な',
        polite: 'に',
        teForm: 'んで',
        potential: 'ね',
        passive: 'な',
        causative: 'な',
        conditional: 'ね',
        volitional: 'のう',
        imperative: 'ね'
      },
      'ぶ': {
        past: 'んだ',
        negative: 'ば',
        polite: 'び',
        teForm: 'んで',
        potential: 'べ',
        passive: 'ば',
        causative: 'ば',
        conditional: 'べ',
        volitional: 'ぼう',
        imperative: 'べ'
      },
      'む': {
        past: 'んだ',
        negative: 'ま',
        polite: 'み',
        teForm: 'んで',
        potential: 'め',
        passive: 'ま',
        causative: 'ま',
        conditional: 'め',
        volitional: 'もう',
        imperative: 'め'
      },
      'る': {
        past: 'った',
        negative: 'ら',
        polite: 'り',
        teForm: 'って',
        potential: 'れ',
        passive: 'ら',
        causative: 'ら',
        conditional: 'れ',
        volitional: 'ろう',
        imperative: 'れ'
      }
    };

    return mappings[ending] || null;
  }

  // Irregular verb conjugations
  private static conjugateIrregular(word: JapaneseWord): ConjugationForms {
    const kana = word.kana;

    // Handle common irregular verbs
    if (kana === 'する' || kana.endsWith('する')) {
      const prefix = kana.slice(0, -2);
      return {
        present: kana,
        past: prefix + 'した',
        negative: prefix + 'しない',
        pastNegative: prefix + 'しなかった',
        polite: prefix + 'します',
        politePast: prefix + 'しました',
        politeNegative: prefix + 'しません',
        politePastNegative: prefix + 'しませんでした',
        teForm: prefix + 'して',
        potential: prefix + 'できる',
        passive: prefix + 'される',
        causative: prefix + 'させる',
        conditional: prefix + 'すれば',
        volitional: prefix + 'しよう',
        imperative: prefix + 'しろ'
      };
    }

    if (kana === 'くる' || kana === '来る') {
      return {
        present: 'くる',
        past: 'きた',
        negative: 'こない',
        pastNegative: 'こなかった',
        polite: 'きます',
        politePast: 'きました',
        politeNegative: 'きません',
        politePastNegative: 'きませんでした',
        teForm: 'きて',
        potential: 'こられる',
        passive: 'こられる',
        causative: 'こさせる',
        conditional: 'くれば',
        volitional: 'こよう',
        imperative: 'こい'
      };
    }

    // Default for unknown irregular verbs
    return this.getEmptyConjugations();
  }

  // i-adjective conjugations
  private static conjugateIAdjective(word: JapaneseWord): ConjugationForms {
    const stem = word.kana.slice(0, -1); // Remove い

    return {
      present: word.kana,
      past: stem + 'かった',
      negative: stem + 'くない',
      pastNegative: stem + 'くなかった',
      polite: word.kana + 'です',
      politePast: stem + 'かったです',
      politeNegative: stem + 'くないです',
      politePastNegative: stem + 'くなかったです',
      teForm: stem + 'くて',
      potential: undefined,
      passive: undefined,
      causative: undefined,
      conditional: stem + 'ければ',
      volitional: undefined,
      imperative: undefined
    };
  }

  // na-adjective conjugations
  private static conjugateNaAdjective(word: JapaneseWord): ConjugationForms {
    const stem = word.kana;

    return {
      present: stem + 'だ',
      past: stem + 'だった',
      negative: stem + 'じゃない',
      pastNegative: stem + 'じゃなかった',
      polite: stem + 'です',
      politePast: stem + 'でした',
      politeNegative: stem + 'じゃないです',
      politePastNegative: stem + 'じゃなかったです',
      teForm: stem + 'で',
      potential: undefined,
      passive: undefined,
      causative: undefined,
      conditional: stem + 'なら',
      volitional: undefined,
      imperative: undefined
    };
  }

  // Get empty conjugations structure
  private static getEmptyConjugations(): ConjugationForms {
    return {
      present: '',
      past: '',
      negative: '',
      pastNegative: '',
      polite: '',
      politePast: '',
      politeNegative: '',
      politePastNegative: '',
      teForm: undefined,
      potential: undefined,
      passive: undefined,
      causative: undefined,
      conditional: undefined,
      volitional: undefined,
      imperative: undefined
    };
  }

  // Get conjugation rule explanation
  static getConjugationRule(wordType: WordType, form: keyof ConjugationForms): string {
    const rules: { [key in WordType]: { [key: string]: string } } = {
      'Ichidan': {
        present: 'Dictionary form - no change',
        past: 'Remove る, add た',
        negative: 'Remove る, add ない',
        pastNegative: 'Remove る, add なかった',
        polite: 'Remove る, add ます',
        politePast: 'Remove る, add ました',
        teForm: 'Remove る, add て',
        potential: 'Remove る, add られる',
        conditional: 'Remove る, add れば'
      },
      'Godan': {
        present: 'Dictionary form - no change',
        past: 'Change ending to う-column, add た/だ',
        negative: 'Change ending to あ-column, add ない',
        polite: 'Change ending to い-column, add ます',
        teForm: 'Change ending according to て-form rules',
        potential: 'Change ending to え-column, add る',
        conditional: 'Change ending to え-column, add ば'
      },
      'Irregular': {
        present: 'Irregular - memorize the form',
        past: 'Irregular - memorize the form',
        negative: 'Irregular - memorize the form',
        polite: 'Irregular - memorize the form',
        teForm: 'Irregular - memorize the form'
      },
      'i-adjective': {
        present: 'Dictionary form - no change',
        past: 'Remove い, add かった',
        negative: 'Remove い, add くない',
        pastNegative: 'Remove い, add くなかった',
        polite: 'Add です to dictionary form',
        conditional: 'Remove い, add ければ'
      },
      'na-adjective': {
        present: 'Add だ to stem',
        past: 'Add だった to stem',
        negative: 'Add じゃない to stem',
        pastNegative: 'Add じゃなかった to stem',
        polite: 'Add です to stem',
        conditional: 'Add なら to stem'
      }
    };

    return rules[wordType]?.[form] || 'No rule available for this combination';
  }
}

// Helper function to get random conjugation form for drill
export function getRandomConjugationForm(wordType: WordType): keyof ConjugationForms {
  const commonForms: (keyof ConjugationForms)[] = [
    'present', 'past', 'negative', 'pastNegative',
    'polite', 'politePast', 'teForm'
  ];

  if (wordType === 'Ichidan' || wordType === 'Godan' || wordType === 'Irregular') {
    commonForms.push('potential', 'conditional');
  }

  return commonForms[Math.floor(Math.random() * commonForms.length)];
}

// Generate drill question stem
export function generateQuestionStem(word: JapaneseWord, targetForm: keyof ConjugationForms): string {
  // Create a partial conjugation to show the stem
  switch (word.type) {
    case 'Ichidan':
      return word.kana.slice(0, -1) + '？';
    case 'Godan':
      const lastChar = word.kana.slice(-1);
      const stem = word.kana.slice(0, -1);
      const mappings = ConjugationEngine['getGodanMappings'](lastChar);
      if (mappings && targetForm in mappings) {
        return stem + '？';
      }
      return word.kana + '？';
    case 'i-adjective':
      return word.kana.slice(0, -1) + '？';
    case 'na-adjective':
      return word.kana + '？';
    default:
      return word.kana + '？';
  }
}
