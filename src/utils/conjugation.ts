import { JapaneseWord, ConjugationForms, WordType } from '@/types';

// Comprehensive conjugation utility functions
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

  // Comprehensive Ichidan verb conjugations (る-verbs)
  private static conjugateIchidan(word: JapaneseWord): ConjugationForms {
    const kanjiStem = word.kanji.slice(0, -1); // Remove る from kanji
    const kanaStem = word.kana.slice(0, -1); // Remove る from kana

    return {
      // Basic Plain Forms
      present: word.kanji,
      past: kanjiStem + 'た',
      negative: kanjiStem + 'ない',
      pastNegative: kanjiStem + 'なかった',
      volitional: kanjiStem + 'よう',

      // Polite Forms
      polite: kanjiStem + 'ます',
      politePast: kanjiStem + 'ました',
      politeNegative: kanjiStem + 'ません',
      politePastNegative: kanjiStem + 'ませんでした',
      politeVolitional: kanjiStem + 'ましょう',

      // Te-Forms
      teForm: kanjiStem + 'て',
      negativeTeForm: kanjiStem + 'なくて',

      // Stems
      masuStem: kanjiStem,
      negativeStem: kanjiStem,

      // Imperative Forms
      imperativePlain: kanjiStem + 'ろ',
      imperativePolite: kanjiStem + 'なさい',

      // Conditional Forms
      provisional: kanjiStem + 'れば',
      provisionalNegative: kanjiStem + 'なければ',
      conditional: kanjiStem + 'たら',
      conditionalNegative: kanjiStem + 'なかったら',

      // Potential Forms
      potential: kanjiStem + 'られる',
      potentialNegative: kanjiStem + 'られない',
      potentialPast: kanjiStem + 'られた',
      potentialPastNegative: kanjiStem + 'られなかった',
      potentialPolite: kanjiStem + 'られます',
      potentialPoliteNegative: kanjiStem + 'られません',
      potentialPolitePast: kanjiStem + 'られました',
      potentialPolitePastNegative: kanjiStem + 'られませんでした',

      // Passive Forms
      passive: kanjiStem + 'られる',
      passiveNegative: kanjiStem + 'られない',
      passivePast: kanjiStem + 'られた',
      passivePastNegative: kanjiStem + 'られなかった',
      passivePolite: kanjiStem + 'られます',
      passivePoliteNegative: kanjiStem + 'られません',
      passivePolitePast: kanjiStem + 'られました',
      passivePolitePastNegative: kanjiStem + 'られませんでした',

      // Causative Forms
      causative: kanjiStem + 'させる',
      causativeNegative: kanjiStem + 'させない',
      causativePast: kanjiStem + 'させた',
      causativePastNegative: kanjiStem + 'させなかった',
      causativePolite: kanjiStem + 'させます',
      causativePoliteNegative: kanjiStem + 'させません',
      causativePolitePast: kanjiStem + 'させました',
      causativePolitePastNegative: kanjiStem + 'させませんでした',

      // Causative Passive Forms
      causativePassive: kanjiStem + 'させられる',
      causativePassiveNegative: kanjiStem + 'させられない',
      causativePassivePast: kanjiStem + 'させられた',
      causativePassivePastNegative: kanjiStem + 'させられなかった',
      causativePassivePolite: kanjiStem + 'させられます',
      causativePassivePoliteNegative: kanjiStem + 'させられません',
      causativePassivePolitePast: kanjiStem + 'させられました',
      causativePassivePolitePastNegative: kanjiStem + 'させられませんでした',

      // Tai Forms (want to do)
      taiForm: kanjiStem + 'たい',
      taiFormNegative: kanjiStem + 'たくない',
      taiFormPast: kanjiStem + 'たかった',
      taiFormPastNegative: kanjiStem + 'たくなかった',

      // Alternative and other forms
      alternativeForm: kanjiStem + 'たり',
      adverbialNegative: kanjiStem + 'なく',

      // Progressive forms
      progressive: kanjiStem + 'ている',
      progressivePolite: kanjiStem + 'ています',
      progressiveNegative: kanjiStem + 'ていない',
      progressivePoliteNegative: kanjiStem + 'ていません',

      // Request forms
      request: kanjiStem + 'てください',
      requestNegative: kanjiStem + 'ないでください',

      // Negative volitional
      volitionalNegative: kanjiStem + 'まい',

      // Colloquial and Classical Forms
      colloquialNegative: kanjiStem + 'ん',
      formalNegative: kanjiStem + 'ず',
      classicalNegative: kanjiStem + 'ぬ'
    };
  }

  // Comprehensive Godan verb conjugations (う-verbs)
  private static conjugateGodan(word: JapaneseWord): ConjugationForms {
    const kana = word.kana;
    const kanji = word.kanji;
    const lastChar = kana.slice(-1);
    const kanaStem = kana.slice(0, -1);
    const kanjiStem = kanji.slice(0, -1);

    // Get the conjugation mappings for the last character
    const mappings = this.getGodanMappings(lastChar);

    if (!mappings) {
      return this.getEmptyConjugations();
    }

    return {
      // Basic Plain Forms
      present: kanji,
      past: kanjiStem + mappings.past,
      negative: kanjiStem + mappings.negative + 'ない',
      pastNegative: kanjiStem + mappings.negative + 'なかった',
      volitional: kanjiStem + mappings.volitional,

      // Polite Forms
      polite: kanjiStem + mappings.polite + 'ます',
      politePast: kanjiStem + mappings.polite + 'ました',
      politeNegative: kanjiStem + mappings.polite + 'ません',
      politePastNegative: kanjiStem + mappings.polite + 'ませんでした',
      politeVolitional: kanjiStem + mappings.polite + 'ましょう',

      // Te-Forms
      teForm: kanjiStem + mappings.teForm,
      negativeTeForm: kanjiStem + mappings.negative + 'なくて',

      // Stems
      masuStem: kanjiStem + mappings.polite,
      negativeStem: kanjiStem + mappings.negative,

      // Imperative Forms
      imperativePlain: kanjiStem + mappings.imperative,
      imperativePolite: kanjiStem + mappings.polite + 'なさい',

      // Conditional Forms
      provisional: kanjiStem + mappings.conditional + 'ば',
      provisionalNegative: kanjiStem + mappings.negative + 'なければ',
      conditional: kanjiStem + mappings.past.replace(/[っん]?[だた]$/, 'たら'),
      conditionalNegative: kanjiStem + mappings.negative + 'なかったら',

      // Potential Forms
      potential: kanjiStem + mappings.potential + 'る',
      potentialNegative: kanjiStem + mappings.potential + 'ない',
      potentialPast: kanjiStem + mappings.potential + 'た',
      potentialPastNegative: kanjiStem + mappings.potential + 'なかった',
      potentialPolite: kanjiStem + mappings.potential + 'ます',
      potentialPoliteNegative: kanjiStem + mappings.potential + 'ません',
      potentialPolitePast: kanjiStem + mappings.potential + 'ました',
      potentialPolitePastNegative: kanjiStem + mappings.potential + 'ませんでした',

      // Passive Forms
      passive: kanjiStem + mappings.passive + 'れる',
      passiveNegative: kanjiStem + mappings.passive + 'れない',
      passivePast: kanjiStem + mappings.passive + 'れた',
      passivePastNegative: kanjiStem + mappings.passive + 'れなかった',
      passivePolite: kanjiStem + mappings.passive + 'れます',
      passivePoliteNegative: kanjiStem + mappings.passive + 'れません',
      passivePolitePast: kanjiStem + mappings.passive + 'れました',
      passivePolitePastNegative: kanjiStem + mappings.passive + 'れませんでした',

      // Causative Forms
      causative: kanjiStem + mappings.causative + 'せる',
      causativeNegative: kanjiStem + mappings.causative + 'せない',
      causativePast: kanjiStem + mappings.causative + 'せた',
      causativePastNegative: kanjiStem + mappings.causative + 'せなかった',
      causativePolite: kanjiStem + mappings.causative + 'せます',
      causativePoliteNegative: kanjiStem + mappings.causative + 'せません',
      causativePolitePast: kanjiStem + mappings.causative + 'せました',
      causativePolitePastNegative: kanjiStem + mappings.causative + 'せませんでした',

      // Causative Passive Forms
      causativePassive: kanjiStem + mappings.causative + 'される',
      causativePassiveNegative: kanjiStem + mappings.causative + 'されない',
      causativePassivePast: kanjiStem + mappings.causative + 'された',
      causativePassivePastNegative: kanjiStem + mappings.causative + 'されなかった',
      causativePassivePolite: kanjiStem + mappings.causative + 'されます',
      causativePassivePoliteNegative: kanjiStem + mappings.causative + 'されません',
      causativePassivePolitePast: kanjiStem + mappings.causative + 'されました',
      causativePassivePolitePastNegative: kanjiStem + mappings.causative + 'されませんでした',

      // Tai Forms (want to do)
      taiForm: kanjiStem + mappings.polite + 'たい',
      taiFormNegative: kanjiStem + mappings.polite + 'たくない',
      taiFormPast: kanjiStem + mappings.polite + 'たかった',
      taiFormPastNegative: kanjiStem + mappings.polite + 'たくなかった',

      // Alternative and other forms
      alternativeForm: kanjiStem + mappings.past.replace(/[っん]?[だた]$/, 'たり'),
      adverbialNegative: kanjiStem + mappings.negative + 'なく',

      // Progressive forms
      progressive: kanjiStem + mappings.teForm.replace(/て$/, '') + 'ている',
      progressivePolite: kanjiStem + mappings.teForm.replace(/て$/, '') + 'ています',
      progressiveNegative: kanjiStem + mappings.teForm.replace(/て$/, '') + 'ていない',
      progressivePoliteNegative: kanjiStem + mappings.teForm.replace(/て$/, '') + 'ていません',

      // Request forms
      request: kanjiStem + mappings.teForm + 'ください',
      requestNegative: kanjiStem + mappings.negative + 'ないでください',

      // Negative volitional
      volitionalNegative: kanjiStem + mappings.negative + 'まい',

      // Colloquial and Classical Forms
      colloquialNegative: kanjiStem + mappings.negative + 'ん',
      formalNegative: kanjiStem + mappings.negative + 'ず',
      classicalNegative: kanjiStem + mappings.negative + 'ぬ'
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

  // Comprehensive irregular verb conjugations
  private static conjugateIrregular(word: JapaneseWord): ConjugationForms {
    const kana = word.kana;
    const kanji = word.kanji;

    // Handle suru verbs
    if (kana === 'する' || kana.endsWith('する')) {
      const kanaPrefix = kana.slice(0, -2);
      const kanjiPrefix = kanji.slice(0, -2);

      return {
        // Basic Plain Forms
        present: kanji,
        past: kanjiPrefix + 'した',
        negative: kanjiPrefix + 'しない',
        pastNegative: kanjiPrefix + 'しなかった',
        volitional: kanjiPrefix + 'しよう',

        // Polite Forms
        polite: kanjiPrefix + 'します',
        politePast: kanjiPrefix + 'しました',
        politeNegative: kanjiPrefix + 'しません',
        politePastNegative: kanjiPrefix + 'しませんでした',
        politeVolitional: kanjiPrefix + 'しましょう',

        // Te-Forms
        teForm: kanjiPrefix + 'して',
        negativeTeForm: kanjiPrefix + 'しなくて',

        // Stems
        masuStem: kanjiPrefix + 'し',
        negativeStem: kanjiPrefix + 'し',

        // Imperative Forms
        imperativePlain: kanjiPrefix + 'しろ',
        imperativePolite: kanjiPrefix + 'しなさい',

        // Conditional Forms
        provisional: kanjiPrefix + 'すれば',
        provisionalNegative: kanjiPrefix + 'しなければ',
        conditional: kanjiPrefix + 'したら',
        conditionalNegative: kanjiPrefix + 'しなかったら',

        // Potential Forms
        potential: kanjiPrefix + 'できる',
        potentialNegative: kanjiPrefix + 'できない',
        potentialPast: kanjiPrefix + 'できた',
        potentialPastNegative: kanjiPrefix + 'できなかった',
        potentialPolite: kanjiPrefix + 'できます',
        potentialPoliteNegative: kanjiPrefix + 'できません',
        potentialPolitePast: kanjiPrefix + 'できました',
        potentialPolitePastNegative: kanjiPrefix + 'できませんでした',

        // Passive Forms
        passive: kanjiPrefix + 'される',
        passiveNegative: kanjiPrefix + 'されない',
        passivePast: kanjiPrefix + 'された',
        passivePastNegative: kanjiPrefix + 'されなかった',
        passivePolite: kanjiPrefix + 'されます',
        passivePoliteNegative: kanjiPrefix + 'されません',
        passivePolitePast: kanjiPrefix + 'されました',
        passivePolitePastNegative: kanjiPrefix + 'されませんでした',

        // Causative Forms
        causative: kanjiPrefix + 'させる',
        causativeNegative: kanjiPrefix + 'させない',
        causativePast: kanjiPrefix + 'させた',
        causativePastNegative: kanjiPrefix + 'させなかった',
        causativePolite: kanjiPrefix + 'させます',
        causativePoliteNegative: kanjiPrefix + 'させません',
        causativePolitePast: kanjiPrefix + 'させました',
        causativePolitePastNegative: kanjiPrefix + 'させませんでした',

        // Causative Passive Forms
        causativePassive: kanjiPrefix + 'させられる',
        causativePassiveNegative: kanjiPrefix + 'させられない',
        causativePassivePast: kanjiPrefix + 'させられた',
        causativePassivePastNegative: kanjiPrefix + 'させられなかった',
        causativePassivePolite: kanjiPrefix + 'させられます',
        causativePassivePoliteNegative: kanjiPrefix + 'させられません',
        causativePassivePolitePast: kanjiPrefix + 'させられました',
        causativePassivePolitePastNegative: kanjiPrefix + 'させられませんでした',

        // Tai Forms
        taiForm: kanjiPrefix + 'したい',
        taiFormNegative: kanjiPrefix + 'したくない',
        taiFormPast: kanjiPrefix + 'したかった',
        taiFormPastNegative: kanjiPrefix + 'したくなかった',

        // Alternative and other forms
        alternativeForm: kanjiPrefix + 'したり',
        adverbialNegative: kanjiPrefix + 'しなく',

        // Progressive forms
        progressive: kanjiPrefix + 'している',
        progressivePolite: kanjiPrefix + 'しています',
        progressiveNegative: kanjiPrefix + 'していない',
        progressivePoliteNegative: kanjiPrefix + 'していません',

        // Request forms
        request: kanjiPrefix + 'してください',
        requestNegative: kanjiPrefix + 'しないでください',

        // Negative volitional
        volitionalNegative: kanjiPrefix + 'すまい',

        // Colloquial and Classical Forms
        colloquialNegative: kanjiPrefix + 'しん',
        formalNegative: kanjiPrefix + 'せず',
        classicalNegative: kanjiPrefix + 'せぬ'
      };
    }

    // Handle kuru verb
    if (kana === 'くる' || kanji === '来る') {
      const useKanji = kanji.includes('来');

      return {
        // Basic Plain Forms
        present: useKanji ? '来る' : 'くる',
        past: useKanji ? '来た' : 'きた',
        negative: useKanji ? '来ない' : 'こない',
        pastNegative: useKanji ? '来なかった' : 'こなかった',
        volitional: useKanji ? '来よう' : 'こよう',

        // Polite Forms
        polite: useKanji ? '来ます' : 'きます',
        politePast: useKanji ? '来ました' : 'きました',
        politeNegative: useKanji ? '来ません' : 'きません',
        politePastNegative: useKanji ? '来ませんでした' : 'きませんでした',
        politeVolitional: useKanji ? '来ましょう' : 'きましょう',

        // Te-Forms
        teForm: useKanji ? '来て' : 'きて',
        negativeTeForm: useKanji ? '来なくて' : 'こなくて',

        // Stems
        masuStem: useKanji ? '来' : 'き',
        negativeStem: useKanji ? '来' : 'こ',

        // Imperative Forms
        imperativePlain: useKanji ? '来い' : 'こい',
        imperativePolite: useKanji ? '来なさい' : 'きなさい',

        // Conditional Forms
        provisional: useKanji ? '来れば' : 'くれば',
        provisionalNegative: useKanji ? '来なければ' : 'こなければ',
        conditional: useKanji ? '来たら' : 'きたら',
        conditionalNegative: useKanji ? '来なかったら' : 'こなかったら',

        // Potential Forms
        potential: useKanji ? '来られる' : 'こられる',
        potentialNegative: useKanji ? '来られない' : 'こられない',
        potentialPast: useKanji ? '来られた' : 'こられた',
        potentialPastNegative: useKanji ? '来られなかった' : 'こられなかった',
        potentialPolite: useKanji ? '来られます' : 'こられます',
        potentialPoliteNegative: useKanji ? '来られません' : 'こられません',
        potentialPolitePast: useKanji ? '来られました' : 'こられました',
        potentialPolitePastNegative: useKanji ? '来られませんでした' : 'こられませんでした',

        // Passive Forms
        passive: useKanji ? '来られる' : 'こられる',
        passiveNegative: useKanji ? '来られない' : 'こられない',
        passivePast: useKanji ? '来られた' : 'こられた',
        passivePastNegative: useKanji ? '来られなかった' : 'こられなかった',
        passivePolite: useKanji ? '来られます' : 'こられます',
        passivePoliteNegative: useKanji ? '来られません' : 'こられません',
        passivePolitePast: useKanji ? '来られました' : 'こられました',
        passivePolitePastNegative: useKanji ? '来られませんでした' : 'こられませんでした',

        // Causative Forms
        causative: useKanji ? '来させる' : 'こさせる',
        causativeNegative: useKanji ? '来させない' : 'こさせない',
        causativePast: useKanji ? '来させた' : 'こさせた',
        causativePastNegative: useKanji ? '来させなかった' : 'こさせなかった',
        causativePolite: useKanji ? '来させます' : 'こさせます',
        causativePoliteNegative: useKanji ? '来させません' : 'こさせません',
        causativePolitePast: useKanji ? '来させました' : 'こさせました',
        causativePolitePastNegative: useKanji ? '来させませんでした' : 'こさせませんでした',

        // Causative Passive Forms
        causativePassive: useKanji ? '来させられる' : 'こさせられる',
        causativePassiveNegative: useKanji ? '来させられない' : 'こさせられない',
        causativePassivePast: useKanji ? '来させられた' : 'こさせられた',
        causativePassivePastNegative: useKanji ? '来させられなかった' : 'こさせられなかった',
        causativePassivePolite: useKanji ? '来させられます' : 'こさせられます',
        causativePassivePoliteNegative: useKanji ? '来させられません' : 'こさせられません',
        causativePassivePolitePast: useKanji ? '来させられました' : 'こさせられました',
        causativePassivePolitePastNegative: useKanji ? '来させられませんでした' : 'こさせられませんでした',

        // Tai Forms
        taiForm: useKanji ? '来たい' : 'きたい',
        taiFormNegative: useKanji ? '来たくない' : 'きたくない',
        taiFormPast: useKanji ? '来たかった' : 'きたかった',
        taiFormPastNegative: useKanji ? '来たくなかった' : 'きたくなかった',

        // Alternative and other forms
        alternativeForm: useKanji ? '来たり' : 'きたり',
        adverbialNegative: useKanji ? '来なく' : 'こなく',

        // Progressive forms
        progressive: useKanji ? '来ている' : 'きている',
        progressivePolite: useKanji ? '来ています' : 'きています',
        progressiveNegative: useKanji ? '来ていない' : 'きていない',
        progressivePoliteNegative: useKanji ? '来ていません' : 'きていません',

        // Request forms
        request: useKanji ? '来てください' : 'きてください',
        requestNegative: useKanji ? '来ないでください' : 'こないでください',

        // Negative volitional
        volitionalNegative: useKanji ? '来まい' : 'くまい',

        // Colloquial and Classical Forms
        colloquialNegative: useKanji ? '来ん' : 'こん',
        formalNegative: useKanji ? '来ず' : 'こず',
        classicalNegative: useKanji ? '来ぬ' : 'こぬ'
      };
    }

    // Default for unknown irregular verbs
    return this.getEmptyConjugations();
  }

  // i-adjective conjugations
  private static conjugateIAdjective(word: JapaneseWord): ConjugationForms {
    const stem = word.kanji.slice(0, -1); // Remove い

    return {
      // Basic Forms
      present: word.kanji,
      past: stem + 'かった',
      negative: stem + 'くない',
      pastNegative: stem + 'くなかった',
      volitional: '',

      // Polite Forms
      polite: word.kanji + 'です',
      politePast: stem + 'かったです',
      politeNegative: stem + 'くないです',
      politePastNegative: stem + 'くなかったです',
      politeVolitional: '',

      // Te-Forms
      teForm: stem + 'くて',
      negativeTeForm: stem + 'くなくて',

      // Stems
      masuStem: stem,
      negativeStem: stem + 'く',

      // Imperative Forms (not applicable for adjectives)
      imperativePlain: '',
      imperativePolite: '',

      // Conditional Forms
      provisional: stem + 'ければ',
      provisionalNegative: stem + 'くなければ',
      conditional: stem + 'かったら',
      conditionalNegative: stem + 'くなかったら',

      // All verb forms don't apply to adjectives
      potential: '', potentialNegative: '', potentialPast: '', potentialPastNegative: '',
      potentialPolite: '', potentialPoliteNegative: '', potentialPolitePast: '', potentialPolitePastNegative: '',
      passive: '', passiveNegative: '', passivePast: '', passivePastNegative: '',
      passivePolite: '', passivePoliteNegative: '', passivePolitePast: '', passivePolitePastNegative: '',
      causative: '', causativeNegative: '', causativePast: '', causativePastNegative: '',
      causativePolite: '', causativePoliteNegative: '', causativePolitePast: '', causativePolitePastNegative: '',
      causativePassive: '', causativePassiveNegative: '', causativePassivePast: '', causativePassivePastNegative: '',
      causativePassivePolite: '', causativePassivePoliteNegative: '', causativePassivePolitePast: '', causativePassivePolitePastNegative: '',
      taiForm: '', taiFormNegative: '', taiFormPast: '', taiFormPastNegative: '',
      alternativeForm: '', adverbialNegative: stem + 'くなく',
      progressive: '', progressivePolite: '', progressiveNegative: '', progressivePoliteNegative: '',
      request: '', requestNegative: '',
      colloquialNegative: '', formalNegative: '', classicalNegative: ''
    };
  }

  // na-adjective conjugations
  private static conjugateNaAdjective(word: JapaneseWord): ConjugationForms {
    const stem = word.kanji;

    return {
      // Basic Forms
      present: stem + 'だ',
      past: stem + 'だった',
      negative: stem + 'じゃない',
      pastNegative: stem + 'じゃなかった',
      volitional: '',

      // Polite Forms
      polite: stem + 'です',
      politePast: stem + 'でした',
      politeNegative: stem + 'じゃないです',
      politePastNegative: stem + 'じゃなかったです',
      politeVolitional: '',

      // Te-Forms
      teForm: stem + 'で',
      negativeTeForm: stem + 'じゃなくて',

      // Stems
      masuStem: stem,
      negativeStem: stem + 'じゃな',

      // Imperative Forms (not applicable for adjectives)
      imperativePlain: '',
      imperativePolite: '',

      // Conditional Forms
      provisional: stem + 'なら',
      provisionalNegative: stem + 'じゃなければ',
      conditional: stem + 'だったら',
      conditionalNegative: stem + 'じゃなかったら',

      // All verb forms don't apply to adjectives
      potential: '', potentialNegative: '', potentialPast: '', potentialPastNegative: '',
      potentialPolite: '', potentialPoliteNegative: '', potentialPolitePast: '', potentialPolitePastNegative: '',
      passive: '', passiveNegative: '', passivePast: '', passivePastNegative: '',
      passivePolite: '', passivePoliteNegative: '', passivePolitePast: '', passivePolitePastNegative: '',
      causative: '', causativeNegative: '', causativePast: '', causativePastNegative: '',
      causativePolite: '', causativePoliteNegative: '', causativePolitePast: '', causativePolitePastNegative: '',
      causativePassive: '', causativePassiveNegative: '', causativePassivePast: '', causativePassivePastNegative: '',
      causativePassivePolite: '', causativePassivePoliteNegative: '', causativePassivePolitePast: '', causativePassivePolitePastNegative: '',
      taiForm: '', taiFormNegative: '', taiFormPast: '', taiFormPastNegative: '',
      alternativeForm: '', adverbialNegative: stem + 'じゃなく',
      progressive: '', progressivePolite: '', progressiveNegative: '', progressivePoliteNegative: '',
      request: '', requestNegative: '',
      colloquialNegative: '', formalNegative: '', classicalNegative: ''
    };
  }

  // Get empty conjugations structure
  private static getEmptyConjugations(): ConjugationForms {
    return {
      present: '', past: '', negative: '', pastNegative: '', volitional: '',
      polite: '', politePast: '', politeNegative: '', politePastNegative: '', politeVolitional: '',
      teForm: '', negativeTeForm: '', masuStem: '', negativeStem: '',
      imperativePlain: '', imperativePolite: '',
      provisional: '', provisionalNegative: '', conditional: '', conditionalNegative: '',
      potential: '', potentialNegative: '', potentialPast: '', potentialPastNegative: '',
      potentialPolite: '', potentialPoliteNegative: '', potentialPolitePast: '', potentialPolitePastNegative: '',
      passive: '', passiveNegative: '', passivePast: '', passivePastNegative: '',
      passivePolite: '', passivePoliteNegative: '', passivePolitePast: '', passivePolitePastNegative: '',
      causative: '', causativeNegative: '', causativePast: '', causativePastNegative: '',
      causativePolite: '', causativePoliteNegative: '', causativePolitePast: '', causativePolitePastNegative: '',
      causativePassive: '', causativePassiveNegative: '', causativePassivePast: '', causativePassivePastNegative: '',
      causativePassivePolite: '', causativePassivePoliteNegative: '', causativePassivePolitePast: '', causativePassivePolitePastNegative: '',
      taiForm: '', taiFormNegative: '', taiFormPast: '', taiFormPastNegative: '',
      alternativeForm: '', adverbialNegative: '',
      progressive: '', progressivePolite: '', progressiveNegative: '', progressivePoliteNegative: '',
      request: '', requestNegative: '',
      volitionalNegative: '',
      colloquialNegative: '', formalNegative: '', classicalNegative: ''
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
      },
      'noun': {
        present: 'Nouns do not conjugate'
      },
      'adverb': {
        present: 'Adverbs do not conjugate'
      },
      'particle': {
        present: 'Particles do not conjugate'
      },
      'other': {
        present: 'This word type does not conjugate'
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
      return stem + '？';
    case 'i-adjective':
      return word.kana.slice(0, -1) + '？';
    case 'na-adjective':
      return word.kana + '？';
    default:
      return word.kana + '？';
  }
}
