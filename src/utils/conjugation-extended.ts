// Extended Conjugation Engine with Comprehensive Forms
// Supports Godan, Ichidan, and Irregular verbs with 100+ conjugation forms

import { JapaneseWord } from '@/types';
import { ExtendedConjugationForms } from '@/types/conjugation-extended';

export class ExtendedConjugationEngine {
  
  // Main conjugation function
  static conjugate(word: JapaneseWord): ExtendedConjugationForms {
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

  // ============= GODAN VERB CONJUGATION =============
  private static conjugateGodan(word: JapaneseWord): ExtendedConjugationForms {
    const kanji = word.kanji || '';
    const kana = word.kana || word.kanji || '';
    const lastChar = kana.slice(-1);
    const kanjiStem = kanji.slice(0, -1);
    
    // Get the conjugation mappings for the last character
    const mappings = this.getGodanMappings(lastChar, word);
    
    if (!mappings) {
      return this.getEmptyConjugations();
    }

    // Generate potential conjugations (Godan becomes Ichidan)
    const potentialBase = kanjiStem + mappings.potential + 'る';
    const potentialConjugations = this.conjugateAsIchidan(potentialBase);
    
    // Generate passive conjugations (Godan becomes Ichidan)
    const passiveBase = kanjiStem + mappings.passive + 'れる';
    const passiveConjugations = this.conjugateAsIchidan(passiveBase);
    
    // Generate causative conjugations (Godan becomes Ichidan)
    const causativeBase = kanjiStem + mappings.causative + 'せる';
    const causativeConjugations = this.conjugateAsIchidan(causativeBase);
    
    // Generate causative-passive conjugations
    const causativePassiveBase = kanjiStem + mappings.causative + 'される';
    const causativePassiveConjugations = this.conjugateAsIchidan(causativePassiveBase);

    return {
      // ============= BASIC FORMS =============
      present: kanji,
      masuStem: kanjiStem + mappings.polite,
      negativeStem: kanjiStem + mappings.negative,
      
      past: kanjiStem + mappings.past,
      negative: kanjiStem + mappings.negative + 'ない',
      pastNegative: kanjiStem + mappings.negative + 'なかった',
      
      // ============= POLITE FORMS =============
      polite: kanjiStem + mappings.polite + 'ます',
      politePast: kanjiStem + mappings.polite + 'ました',
      politeNegative: kanjiStem + mappings.polite + 'ません',
      politePastNegative: kanjiStem + mappings.polite + 'ませんでした',
      politeVolitional: kanjiStem + mappings.polite + 'ましょう',
      
      // ============= TE FORMS =============
      teForm: kanjiStem + mappings.teForm,
      negativeTeForm: kanjiStem + mappings.negative + 'なくて',
      naiDeForm: kanjiStem + mappings.negative + 'ないで',
      adverbialNegative: kanjiStem + mappings.negative + 'なく',
      
      // ============= VOLITIONAL =============
      volitional: kanjiStem + mappings.volitional,
      volitionalNegative: kanji + 'まい',
      
      // ============= IMPERATIVE =============
      imperativePlain: kanjiStem + mappings.imperative,
      imperativePolite: kanjiStem + mappings.polite + 'なさい',
      imperativeNegative: kanji + 'な',
      
      // ============= CONDITIONAL FORMS =============
      provisional: kanjiStem + mappings.conditional + 'ば',
      provisionalNegative: kanjiStem + mappings.negative + 'なければ',
      provisionalNegativeColloquial: kanjiStem + mappings.negative + 'なきゃ',
      
      conditional: kanjiStem + mappings.past.replace(/[だた]$/, match => match === 'だ' ? 'だら' : 'たら'),
      conditionalNegative: kanjiStem + mappings.negative + 'なかったら',
      
      alternativeForm: kanjiStem + mappings.past + 'り',
      alternativeNegative: kanjiStem + mappings.negative + 'なかったり',
      
      // ============= POTENTIAL FORMS =============
      potential: potentialBase,
      potentialNegative: potentialConjugations.negative,
      potentialPast: potentialConjugations.past,
      potentialPastNegative: potentialConjugations.pastNegative,
      
      potentialMasuStem: potentialConjugations.masuStem,
      potentialTeForm: potentialConjugations.teForm,
      potentialNegativeTeForm: potentialConjugations.negativeTeForm,
      
      potentialPolite: potentialConjugations.polite,
      potentialPoliteNegative: potentialConjugations.politeNegative,
      potentialPolitePast: potentialConjugations.politePast,
      potentialPolitePastNegative: potentialConjugations.politePastNegative,
      
      // ============= PASSIVE FORMS =============
      passive: passiveBase,
      passiveNegative: passiveConjugations.negative,
      passivePast: passiveConjugations.past,
      passivePastNegative: passiveConjugations.pastNegative,
      
      passiveMasuStem: passiveConjugations.masuStem,
      passiveTeForm: passiveConjugations.teForm,
      passiveNegativeTeForm: passiveConjugations.negativeTeForm,
      
      passivePolite: passiveConjugations.polite,
      passivePoliteNegative: passiveConjugations.politeNegative,
      passivePolitePast: passiveConjugations.politePast,
      passivePolitePastNegative: passiveConjugations.politePastNegative,
      
      // ============= CAUSATIVE FORMS =============
      causative: causativeBase,
      causativeNegative: causativeConjugations.negative,
      causativePast: causativeConjugations.past,
      causativePastNegative: causativeConjugations.pastNegative,
      
      causativeMasuStem: causativeConjugations.masuStem,
      causativeTeForm: causativeConjugations.teForm,
      causativeNegativeTeForm: causativeConjugations.negativeTeForm,
      
      causativePolite: causativeConjugations.polite,
      causativePoliteNegative: causativeConjugations.politeNegative,
      causativePolitePast: causativeConjugations.politePast,
      causativePolitePastNegative: causativeConjugations.politePastNegative,
      
      // ============= CAUSATIVE-PASSIVE =============
      causativePassive: causativePassiveBase,
      causativePassiveNegative: causativePassiveConjugations.negative,
      causativePassivePast: causativePassiveConjugations.past,
      causativePassivePastNegative: causativePassiveConjugations.pastNegative,
      
      causativePassiveMasuStem: causativePassiveConjugations.masuStem,
      causativePassiveTeForm: causativePassiveConjugations.teForm,
      causativePassiveNegativeTeForm: causativePassiveConjugations.negativeTeForm,
      
      causativePassivePolite: causativePassiveConjugations.polite,
      causativePassivePoliteNegative: causativePassiveConjugations.politeNegative,
      causativePassivePolitePast: causativePassiveConjugations.politePast,
      causativePassivePolitePastNegative: causativePassiveConjugations.politePastNegative,
      
      // ============= TAI FORMS =============
      ...this.generateTaiForms(kanjiStem + mappings.polite),
      
      // ============= PROGRESSIVE FORMS =============
      progressive: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ている',
      progressiveNegative: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ていない',
      progressivePast: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ていた',
      progressivePastNegative: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ていなかった',
      progressivePolite: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ています',
      progressivePoliteNegative: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ていません',
      progressivePolitePast: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ていました',
      progressivePolitePastNegative: kanjiStem + mappings.teForm.replace(/[てで]$/, '') + 'ていませんでした',
      
      // ============= REQUEST FORMS =============
      request: kanjiStem + mappings.teForm + 'ください',
      requestNegative: kanjiStem + mappings.negative + 'ないでください',
      
      // ============= COLLOQUIAL FORMS =============
      colloquialNegative: kanjiStem + mappings.negative + 'ん',
      
      // ============= CLASSICAL FORMS =============
      formalNegative: kanjiStem + mappings.negative + 'ず',
      classicalNegative: kanjiStem + mappings.negative + 'ぬ',
      classicalNegativeModifier: kanjiStem + mappings.negative + 'ざる',
      
      // ============= PRESUMPTIVE FORMS =============
      presumptive: kanji + 'だろう',
      presumptiveNegative: kanjiStem + mappings.negative + 'ないだろう',
      presumptivePolite: kanji + 'でしょう',
      presumptivePoliteNegative: kanjiStem + mappings.negative + 'ないでしょう',
    };
  }

  // ============= ICHIDAN VERB CONJUGATION =============
  private static conjugateIchidan(word: JapaneseWord): ExtendedConjugationForms {
    const kanji = word.kanji || '';
    const kanjiStem = kanji.slice(0, -1); // Remove る
    
    return {
      // ============= BASIC FORMS =============
      present: kanji,
      masuStem: kanjiStem,
      negativeStem: kanjiStem,
      
      past: kanjiStem + 'た',
      negative: kanjiStem + 'ない',
      pastNegative: kanjiStem + 'なかった',
      
      // ============= POLITE FORMS =============
      polite: kanjiStem + 'ます',
      politePast: kanjiStem + 'ました',
      politeNegative: kanjiStem + 'ません',
      politePastNegative: kanjiStem + 'ませんでした',
      politeVolitional: kanjiStem + 'ましょう',
      
      // ============= TE FORMS =============
      teForm: kanjiStem + 'て',
      negativeTeForm: kanjiStem + 'なくて',
      naiDeForm: kanjiStem + 'ないで',
      adverbialNegative: kanjiStem + 'なく',
      
      // ============= VOLITIONAL =============
      volitional: kanjiStem + 'よう',
      volitionalNegative: kanji + 'まい',
      
      // ============= IMPERATIVE =============
      imperativePlain: kanjiStem + 'ろ',
      imperativePolite: kanjiStem + 'なさい',
      imperativeNegative: kanji + 'な',
      
      // ============= CONDITIONAL FORMS =============
      provisional: kanjiStem + 'れば',
      provisionalNegative: kanjiStem + 'なければ',
      provisionalNegativeColloquial: kanjiStem + 'なきゃ',
      
      conditional: kanjiStem + 'たら',
      conditionalNegative: kanjiStem + 'なかったら',
      
      alternativeForm: kanjiStem + 'たり',
      alternativeNegative: kanjiStem + 'なかったり',
      
      // ============= POTENTIAL FORMS =============
      potential: kanjiStem + 'られる',
      potentialNegative: kanjiStem + 'られない',
      potentialPast: kanjiStem + 'られた',
      potentialPastNegative: kanjiStem + 'られなかった',
      
      potentialMasuStem: kanjiStem + 'られ',
      potentialTeForm: kanjiStem + 'られて',
      potentialNegativeTeForm: kanjiStem + 'られなくて',
      
      potentialPolite: kanjiStem + 'られます',
      potentialPoliteNegative: kanjiStem + 'られません',
      potentialPolitePast: kanjiStem + 'られました',
      potentialPolitePastNegative: kanjiStem + 'られませんでした',
      
      // ============= PASSIVE FORMS =============
      passive: kanjiStem + 'られる',
      passiveNegative: kanjiStem + 'られない',
      passivePast: kanjiStem + 'られた',
      passivePastNegative: kanjiStem + 'られなかった',
      
      passiveMasuStem: kanjiStem + 'られ',
      passiveTeForm: kanjiStem + 'られて',
      passiveNegativeTeForm: kanjiStem + 'られなくて',
      
      passivePolite: kanjiStem + 'られます',
      passivePoliteNegative: kanjiStem + 'られません',
      passivePolitePast: kanjiStem + 'られました',
      passivePolitePastNegative: kanjiStem + 'られませんでした',
      
      // ============= CAUSATIVE FORMS =============
      causative: kanjiStem + 'させる',
      causativeNegative: kanjiStem + 'させない',
      causativePast: kanjiStem + 'させた',
      causativePastNegative: kanjiStem + 'させなかった',
      
      causativeMasuStem: kanjiStem + 'させ',
      causativeTeForm: kanjiStem + 'させて',
      causativeNegativeTeForm: kanjiStem + 'させなくて',
      
      causativePolite: kanjiStem + 'させます',
      causativePoliteNegative: kanjiStem + 'させません',
      causativePolitePast: kanjiStem + 'させました',
      causativePolitePastNegative: kanjiStem + 'させませんでした',
      
      // ============= CAUSATIVE-PASSIVE =============
      causativePassive: kanjiStem + 'させられる',
      causativePassiveNegative: kanjiStem + 'させられない',
      causativePassivePast: kanjiStem + 'させられた',
      causativePassivePastNegative: kanjiStem + 'させられなかった',
      
      causativePassiveMasuStem: kanjiStem + 'させられ',
      causativePassiveTeForm: kanjiStem + 'させられて',
      causativePassiveNegativeTeForm: kanjiStem + 'させられなくて',
      
      causativePassivePolite: kanjiStem + 'させられます',
      causativePassivePoliteNegative: kanjiStem + 'させられません',
      causativePassivePolitePast: kanjiStem + 'させられました',
      causativePassivePolitePastNegative: kanjiStem + 'させられませんでした',
      
      // ============= TAI FORMS =============
      ...this.generateTaiForms(kanjiStem),
      
      // ============= PROGRESSIVE FORMS =============
      progressive: kanjiStem + 'ている',
      progressiveNegative: kanjiStem + 'ていない',
      progressivePast: kanjiStem + 'ていた',
      progressivePastNegative: kanjiStem + 'ていなかった',
      progressivePolite: kanjiStem + 'ています',
      progressivePoliteNegative: kanjiStem + 'ていません',
      progressivePolitePast: kanjiStem + 'ていました',
      progressivePolitePastNegative: kanjiStem + 'ていませんでした',
      
      // ============= REQUEST FORMS =============
      request: kanjiStem + 'てください',
      requestNegative: kanjiStem + 'ないでください',
      
      // ============= COLLOQUIAL FORMS =============
      colloquialNegative: kanjiStem + 'ん',
      
      // ============= CLASSICAL FORMS =============
      formalNegative: kanjiStem + 'ず',
      classicalNegative: kanjiStem + 'ぬ',
      classicalNegativeModifier: kanjiStem + 'ざる',
      
      // ============= PRESUMPTIVE FORMS =============
      presumptive: kanji + 'だろう',
      presumptiveNegative: kanjiStem + 'ないだろう',
      presumptivePolite: kanji + 'でしょう',
      presumptivePoliteNegative: kanjiStem + 'ないでしょう',
    };
  }

  // ============= IRREGULAR VERB CONJUGATION =============
  private static conjugateIrregular(word: JapaneseWord): ExtendedConjugationForms {
    const kanji = word.kanji || '';
    const kana = word.kana || word.kanji || '';
    
    // Handle する verbs
    if (kana === 'する' || kana.endsWith('する')) {
      return this.conjugateSuru(word);
    }
    
    // Handle 来る
    if (kanji === '来る' || kana === 'くる') {
      return this.conjugateKuru(word);
    }
    
    return this.getEmptyConjugations();
  }

  // Helper: Conjugate する verbs
  private static conjugateSuru(word: JapaneseWord): ExtendedConjugationForms {
    const kanji = word.kanji || '';
    const kanjiPrefix = kanji.slice(0, -2);
    
    return {
      // ============= BASIC FORMS =============
      present: kanji,
      masuStem: kanjiPrefix + 'し',
      negativeStem: kanjiPrefix + 'し',
      
      past: kanjiPrefix + 'した',
      negative: kanjiPrefix + 'しない',
      pastNegative: kanjiPrefix + 'しなかった',
      
      // ============= POLITE FORMS =============
      polite: kanjiPrefix + 'します',
      politePast: kanjiPrefix + 'しました',
      politeNegative: kanjiPrefix + 'しません',
      politePastNegative: kanjiPrefix + 'しませんでした',
      politeVolitional: kanjiPrefix + 'しましょう',
      
      // ============= TE FORMS =============
      teForm: kanjiPrefix + 'して',
      negativeTeForm: kanjiPrefix + 'しなくて',
      naiDeForm: kanjiPrefix + 'しないで',
      adverbialNegative: kanjiPrefix + 'しなく',
      
      // ============= VOLITIONAL =============
      volitional: kanjiPrefix + 'しよう',
      volitionalNegative: kanjiPrefix + 'すまい',
      
      // ============= IMPERATIVE =============
      imperativePlain: kanjiPrefix + 'しろ',
      imperativePolite: kanjiPrefix + 'しなさい',
      imperativeNegative: kanjiPrefix + 'するな',
      
      // ============= CONDITIONAL FORMS =============
      provisional: kanjiPrefix + 'すれば',
      provisionalNegative: kanjiPrefix + 'しなければ',
      provisionalNegativeColloquial: kanjiPrefix + 'しなきゃ',
      
      conditional: kanjiPrefix + 'したら',
      conditionalNegative: kanjiPrefix + 'しなかったら',
      
      alternativeForm: kanjiPrefix + 'したり',
      alternativeNegative: kanjiPrefix + 'しなかったり',
      
      // ============= POTENTIAL FORMS =============
      potential: kanjiPrefix + 'できる',
      potentialNegative: kanjiPrefix + 'できない',
      potentialPast: kanjiPrefix + 'できた',
      potentialPastNegative: kanjiPrefix + 'できなかった',
      
      potentialMasuStem: kanjiPrefix + 'でき',
      potentialTeForm: kanjiPrefix + 'できて',
      potentialNegativeTeForm: kanjiPrefix + 'できなくて',
      
      potentialPolite: kanjiPrefix + 'できます',
      potentialPoliteNegative: kanjiPrefix + 'できません',
      potentialPolitePast: kanjiPrefix + 'できました',
      potentialPolitePastNegative: kanjiPrefix + 'できませんでした',
      
      // ============= PASSIVE FORMS =============
      passive: kanjiPrefix + 'される',
      passiveNegative: kanjiPrefix + 'されない',
      passivePast: kanjiPrefix + 'された',
      passivePastNegative: kanjiPrefix + 'されなかった',
      
      passiveMasuStem: kanjiPrefix + 'され',
      passiveTeForm: kanjiPrefix + 'されて',
      passiveNegativeTeForm: kanjiPrefix + 'されなくて',
      
      passivePolite: kanjiPrefix + 'されます',
      passivePoliteNegative: kanjiPrefix + 'されません',
      passivePolitePast: kanjiPrefix + 'されました',
      passivePolitePastNegative: kanjiPrefix + 'されませんでした',
      
      // ============= CAUSATIVE FORMS =============
      causative: kanjiPrefix + 'させる',
      causativeNegative: kanjiPrefix + 'させない',
      causativePast: kanjiPrefix + 'させた',
      causativePastNegative: kanjiPrefix + 'させなかった',
      
      causativeMasuStem: kanjiPrefix + 'させ',
      causativeTeForm: kanjiPrefix + 'させて',
      causativeNegativeTeForm: kanjiPrefix + 'させなくて',
      
      causativePolite: kanjiPrefix + 'させます',
      causativePoliteNegative: kanjiPrefix + 'させません',
      causativePolitePast: kanjiPrefix + 'させました',
      causativePolitePastNegative: kanjiPrefix + 'させませんでした',
      
      // ============= CAUSATIVE-PASSIVE =============
      causativePassive: kanjiPrefix + 'させられる',
      causativePassiveNegative: kanjiPrefix + 'させられない',
      causativePassivePast: kanjiPrefix + 'させられた',
      causativePassivePastNegative: kanjiPrefix + 'させられなかった',
      
      causativePassiveMasuStem: kanjiPrefix + 'させられ',
      causativePassiveTeForm: kanjiPrefix + 'させられて',
      causativePassiveNegativeTeForm: kanjiPrefix + 'させられなくて',
      
      causativePassivePolite: kanjiPrefix + 'させられます',
      causativePassivePoliteNegative: kanjiPrefix + 'させられません',
      causativePassivePolitePast: kanjiPrefix + 'させられました',
      causativePassivePolitePastNegative: kanjiPrefix + 'させられませんでした',
      
      // ============= TAI FORMS =============
      ...this.generateTaiForms(kanjiPrefix + 'し'),
      
      // ============= PROGRESSIVE FORMS =============
      progressive: kanjiPrefix + 'している',
      progressiveNegative: kanjiPrefix + 'していない',
      progressivePast: kanjiPrefix + 'していた',
      progressivePastNegative: kanjiPrefix + 'していなかった',
      progressivePolite: kanjiPrefix + 'しています',
      progressivePoliteNegative: kanjiPrefix + 'していません',
      progressivePolitePast: kanjiPrefix + 'していました',
      progressivePolitePastNegative: kanjiPrefix + 'していませんでした',
      
      // ============= REQUEST FORMS =============
      request: kanjiPrefix + 'してください',
      requestNegative: kanjiPrefix + 'しないでください',
      
      // ============= COLLOQUIAL FORMS =============
      colloquialNegative: kanjiPrefix + 'しん',
      
      // ============= CLASSICAL FORMS =============
      formalNegative: kanjiPrefix + 'せず',
      classicalNegative: kanjiPrefix + 'せぬ',
      classicalNegativeModifier: kanjiPrefix + 'せざる',
      
      // ============= PRESUMPTIVE FORMS =============
      presumptive: kanjiPrefix + 'するだろう',
      presumptiveNegative: kanjiPrefix + 'しないだろう',
      presumptivePolite: kanjiPrefix + 'するでしょう',
      presumptivePoliteNegative: kanjiPrefix + 'しないでしょう',
    };
  }

  // Helper: Conjugate 来る
  private static conjugateKuru(word: JapaneseWord): ExtendedConjugationForms {
    return {
      // ============= BASIC FORMS =============
      present: '来る',
      masuStem: '来',
      negativeStem: '来',
      
      past: '来た',
      negative: '来ない',
      pastNegative: '来なかった',
      
      // ============= POLITE FORMS =============
      polite: '来ます',
      politePast: '来ました',
      politeNegative: '来ません',
      politePastNegative: '来ませんでした',
      politeVolitional: '来ましょう',
      
      // ============= TE FORMS =============
      teForm: '来て',
      negativeTeForm: '来なくて',
      naiDeForm: '来ないで',
      adverbialNegative: '来なく',
      
      // ============= VOLITIONAL =============
      volitional: '来よう',
      volitionalNegative: '来まい',
      
      // ============= IMPERATIVE =============
      imperativePlain: '来い',
      imperativePolite: '来なさい',
      imperativeNegative: '来るな',
      
      // ============= CONDITIONAL FORMS =============
      provisional: '来れば',
      provisionalNegative: '来なければ',
      provisionalNegativeColloquial: '来なきゃ',
      
      conditional: '来たら',
      conditionalNegative: '来なかったら',
      
      alternativeForm: '来たり',
      alternativeNegative: '来なかったり',
      
      // ============= POTENTIAL FORMS =============
      potential: '来られる',
      potentialNegative: '来られない',
      potentialPast: '来られた',
      potentialPastNegative: '来られなかった',
      
      potentialMasuStem: '来られ',
      potentialTeForm: '来られて',
      potentialNegativeTeForm: '来られなくて',
      
      potentialPolite: '来られます',
      potentialPoliteNegative: '来られません',
      potentialPolitePast: '来られました',
      potentialPolitePastNegative: '来られませんでした',
      
      // ============= PASSIVE FORMS =============
      passive: '来られる',
      passiveNegative: '来られない',
      passivePast: '来られた',
      passivePastNegative: '来られなかった',
      
      passiveMasuStem: '来られ',
      passiveTeForm: '来られて',
      passiveNegativeTeForm: '来られなくて',
      
      passivePolite: '来られます',
      passivePoliteNegative: '来られません',
      passivePolitePast: '来られました',
      passivePolitePastNegative: '来られませんでした',
      
      // ============= CAUSATIVE FORMS =============
      causative: '来させる',
      causativeNegative: '来させない',
      causativePast: '来させた',
      causativePastNegative: '来させなかった',
      
      causativeMasuStem: '来させ',
      causativeTeForm: '来させて',
      causativeNegativeTeForm: '来させなくて',
      
      causativePolite: '来させます',
      causativePoliteNegative: '来させません',
      causativePolitePast: '来させました',
      causativePolitePastNegative: '来させませんでした',
      
      // ============= CAUSATIVE-PASSIVE =============
      causativePassive: '来させられる',
      causativePassiveNegative: '来させられない',
      causativePassivePast: '来させられた',
      causativePassivePastNegative: '来させられなかった',
      
      causativePassiveMasuStem: '来させられ',
      causativePassiveTeForm: '来させられて',
      causativePassiveNegativeTeForm: '来させられなくて',
      
      causativePassivePolite: '来させられます',
      causativePassivePoliteNegative: '来させられません',
      causativePassivePolitePast: '来させられました',
      causativePassivePolitePastNegative: '来させられませんでした',
      
      // ============= TAI FORMS =============
      ...this.generateTaiForms('来'),
      
      // ============= PROGRESSIVE FORMS =============
      progressive: '来ている',
      progressiveNegative: '来ていない',
      progressivePast: '来ていた',
      progressivePastNegative: '来ていなかった',
      progressivePolite: '来ています',
      progressivePoliteNegative: '来ていません',
      progressivePolitePast: '来ていました',
      progressivePolitePastNegative: '来ていませんでした',
      
      // ============= REQUEST FORMS =============
      request: '来てください',
      requestNegative: '来ないでください',
      
      // ============= COLLOQUIAL FORMS =============
      colloquialNegative: '来ん',
      
      // ============= CLASSICAL FORMS =============
      formalNegative: '来ず',
      classicalNegative: '来ぬ',
      classicalNegativeModifier: '来ざる',
      
      // ============= PRESUMPTIVE FORMS =============
      presumptive: '来るだろう',
      presumptiveNegative: '来ないだろう',
      presumptivePolite: '来るでしょう',
      presumptivePoliteNegative: '来ないでしょう',
    };
  }

  // Helper: Generate TAI forms (treating as i-adjective)
  private static generateTaiForms(stem: string): Partial<ExtendedConjugationForms> {
    const taiBase = stem + 'たい';
    
    return {
      taiForm: taiBase,
      taiFormNegative: stem + 'たくない',
      taiFormPast: stem + 'たかった',
      taiFormPastNegative: stem + 'たくなかった',
      
      taiAdjectiveStem: stem + 'た',
      taiTeForm: stem + 'たくて',
      taiNegativeTeForm: stem + 'たくなくて',
      taiAdverbial: stem + 'たく',
      
      taiProvisional: stem + 'たければ',
      taiProvisionalNegative: stem + 'たくなければ',
      taiConditional: stem + 'たかったら',
      taiConditionalNegative: stem + 'たくなかったら',
      
      taiObjective: stem + 'たさ',
    };
  }

  // Helper: Conjugate as Ichidan (for potential/passive/causative forms)
  private static conjugateAsIchidan(base: string): ExtendedConjugationForms {
    const stem = base.slice(0, -1);
    const word: JapaneseWord = {
      id: 'temp',
      kanji: base,
      kana: base,
      meaning: '',
      type: 'Ichidan',
      jlpt: '',
      romaji: ''
    };
    
    return this.conjugateIchidan(word);
  }

  // ============= I-ADJECTIVE CONJUGATION =============
  private static conjugateIAdjective(word: JapaneseWord): ExtendedConjugationForms {
    const kanji = word.kanji || word.kana || '';
    if (!kanji.endsWith('い')) {
      return this.getEmptyConjugations();
    }
    
    const stem = kanji.slice(0, -1);
    
    return {
      // Basic forms
      present: kanji,
      negative: stem + 'くない',
      past: stem + 'かった',
      pastNegative: stem + 'くなかった',
      
      // Te-forms
      teForm: stem + 'くて',
      negativeTeForm: stem + 'くなくて',
      
      // Polite forms (with です)
      polite: kanji + 'です',
      politeNegative: stem + 'くないです',
      politePast: stem + 'かったです',
      politePastNegative: stem + 'くなかったです',
      
      // Adverbial
      adverbialNegative: stem + 'く',
      
      // Conditional
      provisional: stem + 'ければ',
      provisionalNegative: stem + 'くなければ',
      conditional: stem + 'かったら',
      conditionalNegative: stem + 'くなかったら',
      
      // Alternative
      alternativeForm: stem + 'かったり',
      alternativeNegative: stem + 'くなかったり',
      
      // Presumptive
      presumptive: kanji + 'だろう',
      presumptiveNegative: stem + 'くないだろう',
      presumptivePolite: kanji + 'でしょう',
      presumptivePoliteNegative: stem + 'くないでしょう',
      
      // Fill other forms with empty to avoid undefined
      masuStem: '',
      negativeStem: '',
      naideForm: '',
      volitional: '',
      volitionalNegative: '',
      imperativePlain: '',
      imperativePolite: '',
      imperativeNegative: '',
      provisionalNegativeColloquial: '',
      potential: '',
      potentialNegative: '',
      potentialPast: '',
      potentialPastNegative: '',
      potentialMasuStem: '',
      potentialTeForm: '',
      potentialNegativeTeForm: '',
      potentialPolite: '',
      potentialPoliteNegative: '',
      potentialPolitePast: '',
      potentialPolitePastNegative: '',
      passive: '',
      passiveNegative: '',
      passivePast: '',
      passivePastNegative: '',
      passiveMasuStem: '',
      passiveTeForm: '',
      passiveNegativeTeForm: '',
      passivePolite: '',
      passivePoliteNegative: '',
      passivePolitePast: '',
      passivePolitePastNegative: '',
      causative: '',
      causativeNegative: '',
      causativePast: '',
      causativePastNegative: '',
      causativeMasuStem: '',
      causativeTeForm: '',
      causativeNegativeTeForm: '',
      causativePolite: '',
      causativePoliteNegative: '',
      causativePolitePast: '',
      causativePolitePastNegative: '',
      causativePassive: '',
      causativePassiveNegative: '',
      causativePassivePast: '',
      causativePassivePastNegative: '',
      causativePassiveMasuStem: '',
      causativePassiveTeForm: '',
      causativePassiveNegativeTeForm: '',
      causativePassivePolite: '',
      causativePassivePoliteNegative: '',
      causativePassivePolitePast: '',
      causativePassivePolitePastNegative: '',
      taiForm: '',
      taiFormNegative: '',
      taiFormPast: '',
      taiFormPastNegative: '',
      taiAdjectiveStem: '',
      taiTeForm: '',
      taiNegativeTeForm: '',
      taiAdverbial: '',
      taiProvisional: '',
      taiProvisionalNegative: '',
      taiConditional: '',
      taiConditionalNegative: '',
      taiObjective: '',
      progressive: '',
      progressiveNegative: '',
      progressivePast: '',
      progressivePastNegative: '',
      progressivePolite: '',
      progressivePoliteNegative: '',
      progressivePolitePast: '',
      progressivePolitePastNegative: '',
      request: '',
      requestNegative: '',
      colloquialNegative: '',
      formalNegative: '',
      classicalNegative: '',
      classicalNegativeModifier: '',
      politeVolitional: '',
    };
  }

  // ============= NA-ADJECTIVE CONJUGATION =============
  private static conjugateNaAdjective(word: JapaneseWord): ExtendedConjugationForms {
    const kanji = word.kanji || word.kana || '';
    
    return {
      // Basic forms
      present: kanji + 'だ',
      negative: kanji + 'じゃない',
      past: kanji + 'だった',
      pastNegative: kanji + 'じゃなかった',
      
      // Te-forms
      teForm: kanji + 'で',
      negativeTeForm: kanji + 'じゃなくて',
      
      // Polite forms
      polite: kanji + 'です',
      politeNegative: kanji + 'じゃありません',
      politePast: kanji + 'でした',
      politePastNegative: kanji + 'じゃありませんでした',
      
      // Adverbial
      adverbialNegative: kanji + 'に',
      
      // Conditional
      provisional: kanji + 'なら',
      provisionalNegative: kanji + 'じゃなければ',
      conditional: kanji + 'だったら',
      conditionalNegative: kanji + 'じゃなかったら',
      
      // Alternative
      alternativeForm: kanji + 'だったり',
      alternativeNegative: kanji + 'じゃなかったり',
      
      // Presumptive
      presumptive: kanji + 'だろう',
      presumptiveNegative: kanji + 'じゃないだろう',
      presumptivePolite: kanji + 'でしょう',
      presumptivePoliteNegative: kanji + 'じゃないでしょう',
      
      // Fill other forms with empty to avoid undefined
      masuStem: '',
      negativeStem: '',
      naideForm: '',
      volitional: '',
      volitionalNegative: '',
      imperativePlain: '',
      imperativePolite: '',
      imperativeNegative: '',
      provisionalNegativeColloquial: '',
      potential: '',
      potentialNegative: '',
      potentialPast: '',
      potentialPastNegative: '',
      potentialMasuStem: '',
      potentialTeForm: '',
      potentialNegativeTeForm: '',
      potentialPolite: '',
      potentialPoliteNegative: '',
      potentialPolitePast: '',
      potentialPolitePastNegative: '',
      passive: '',
      passiveNegative: '',
      passivePast: '',
      passivePastNegative: '',
      passiveMasuStem: '',
      passiveTeForm: '',
      passiveNegativeTeForm: '',
      passivePolite: '',
      passivePoliteNegative: '',
      passivePolitePast: '',
      passivePolitePastNegative: '',
      causative: '',
      causativeNegative: '',
      causativePast: '',
      causativePastNegative: '',
      causativeMasuStem: '',
      causativeTeForm: '',
      causativeNegativeTeForm: '',
      causativePolite: '',
      causativePoliteNegative: '',
      causativePolitePast: '',
      causativePolitePastNegative: '',
      causativePassive: '',
      causativePassiveNegative: '',
      causativePassivePast: '',
      causativePassivePastNegative: '',
      causativePassiveMasuStem: '',
      causativePassiveTeForm: '',
      causativePassiveNegativeTeForm: '',
      causativePassivePolite: '',
      causativePassivePoliteNegative: '',
      causativePassivePolitePast: '',
      causativePassivePolitePastNegative: '',
      taiForm: '',
      taiFormNegative: '',
      taiFormPast: '',
      taiFormPastNegative: '',
      taiAdjectiveStem: '',
      taiTeForm: '',
      taiNegativeTeForm: '',
      taiAdverbial: '',
      taiProvisional: '',
      taiProvisionalNegative: '',
      taiConditional: '',
      taiConditionalNegative: '',
      taiObjective: '',
      progressive: '',
      progressiveNegative: '',
      progressivePast: '',
      progressivePastNegative: '',
      progressivePolite: '',
      progressivePoliteNegative: '',
      progressivePolitePast: '',
      progressivePolitePastNegative: '',
      request: '',
      requestNegative: '',
      colloquialNegative: '',
      formalNegative: '',
      classicalNegative: '',
      classicalNegativeModifier: '',
      politeVolitional: '',
    };
  }

  // Get Godan conjugation mappings
  private static getGodanMappings(ending: string, word?: JapaneseWord) {
    // Special case for 行く
    if (word && (word.kanji === '行く' || word.kana === 'いく')) {
      return {
        past: 'った',
        negative: 'か',
        polite: 'き',
        teForm: 'って',
        potential: 'け',
        passive: 'か',
        causative: 'か',
        conditional: 'け',
        volitional: 'こう',
        imperative: 'け'
      };
    }

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

  // Placeholder for i-adjectives
  private static conjugateIAdjective(word: JapaneseWord): ExtendedConjugationForms {
    return this.getEmptyConjugations();
  }

  // Placeholder for na-adjectives
  private static conjugateNaAdjective(word: JapaneseWord): ExtendedConjugationForms {
    return this.getEmptyConjugations();
  }

  // Return empty conjugations
  private static getEmptyConjugations(): ExtendedConjugationForms {
    const empty = '';
    return {
      present: empty,
      masuStem: empty,
      negativeStem: empty,
      past: empty,
      negative: empty,
      pastNegative: empty,
      polite: empty,
      politePast: empty,
      politeNegative: empty,
      politePastNegative: empty,
      politeVolitional: empty,
      teForm: empty,
      negativeTeForm: empty,
      naiDeForm: empty,
      adverbialNegative: empty,
      volitional: empty,
      volitionalNegative: empty,
      imperativePlain: empty,
      imperativePolite: empty,
      imperativeNegative: empty,
      provisional: empty,
      provisionalNegative: empty,
      provisionalNegativeColloquial: empty,
      conditional: empty,
      conditionalNegative: empty,
      alternativeForm: empty,
      alternativeNegative: empty,
      potential: empty,
      potentialNegative: empty,
      potentialPast: empty,
      potentialPastNegative: empty,
      potentialMasuStem: empty,
      potentialTeForm: empty,
      potentialNegativeTeForm: empty,
      potentialPolite: empty,
      potentialPoliteNegative: empty,
      potentialPolitePast: empty,
      potentialPolitePastNegative: empty,
      passive: empty,
      passiveNegative: empty,
      passivePast: empty,
      passivePastNegative: empty,
      passiveMasuStem: empty,
      passiveTeForm: empty,
      passiveNegativeTeForm: empty,
      passivePolite: empty,
      passivePoliteNegative: empty,
      passivePolitePast: empty,
      passivePolitePastNegative: empty,
      causative: empty,
      causativeNegative: empty,
      causativePast: empty,
      causativePastNegative: empty,
      causativeMasuStem: empty,
      causativeTeForm: empty,
      causativeNegativeTeForm: empty,
      causativePolite: empty,
      causativePoliteNegative: empty,
      causativePolitePast: empty,
      causativePolitePastNegative: empty,
      causativePassive: empty,
      causativePassiveNegative: empty,
      causativePassivePast: empty,
      causativePassivePastNegative: empty,
      causativePassiveMasuStem: empty,
      causativePassiveTeForm: empty,
      causativePassiveNegativeTeForm: empty,
      causativePassivePolite: empty,
      causativePassivePoliteNegative: empty,
      causativePassivePolitePast: empty,
      causativePassivePolitePastNegative: empty,
      taiForm: empty,
      taiFormNegative: empty,
      taiFormPast: empty,
      taiFormPastNegative: empty,
      taiAdjectiveStem: empty,
      taiTeForm: empty,
      taiNegativeTeForm: empty,
      taiAdverbial: empty,
      taiProvisional: empty,
      taiProvisionalNegative: empty,
      taiConditional: empty,
      taiConditionalNegative: empty,
      taiObjective: empty,
      progressive: empty,
      progressiveNegative: empty,
      progressivePast: empty,
      progressivePastNegative: empty,
      progressivePolite: empty,
      progressivePoliteNegative: empty,
      progressivePolitePast: empty,
      progressivePolitePastNegative: empty,
      request: empty,
      requestNegative: empty,
      colloquialNegative: empty,
      formalNegative: empty,
      classicalNegative: empty,
      classicalNegativeModifier: empty,
      presumptive: empty,
      presumptiveNegative: empty,
      presumptivePolite: empty,
      presumptivePoliteNegative: empty,
    };
  }
}