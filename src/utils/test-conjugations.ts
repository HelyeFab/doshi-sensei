// Test file for Extended Conjugation Engine
// Tests 3 verbs from each type: Godan, Ichidan, and Irregular

import { JapaneseWord } from '@/types';
import { ExtendedConjugationEngine } from './conjugation-extended';
import { ExtendedConjugationForms } from '@/types/conjugation-extended';

// Test verbs
const testVerbs: JapaneseWord[] = [
  // ============= GODAN VERBS =============
  {
    id: '1',
    kanji: '買う',
    kana: 'かう',
    meaning: 'to buy',
    type: 'Godan',
    jlpt: 'N5',
    romaji: 'kau'
  },
  {
    id: '2',
    kanji: '読む',
    kana: 'よむ',
    meaning: 'to read',
    type: 'Godan',
    jlpt: 'N5',
    romaji: 'yomu'
  },
  {
    id: '3',
    kanji: '書く',
    kana: 'かく',
    meaning: 'to write',
    type: 'Godan',
    jlpt: 'N5',
    romaji: 'kaku'
  },
  {
    id: '4',
    kanji: '話す',
    kana: 'はなす',
    meaning: 'to speak',
    type: 'Godan',
    jlpt: 'N5',
    romaji: 'hanasu'
  },
  {
    id: '5',
    kanji: '立つ',
    kana: 'たつ',
    meaning: 'to stand',
    type: 'Godan',
    jlpt: 'N5',
    romaji: 'tatsu'
  },
  
  // ============= ICHIDAN VERBS =============
  {
    id: '6',
    kanji: '食べる',
    kana: 'たべる',
    meaning: 'to eat',
    type: 'Ichidan',
    jlpt: 'N5',
    romaji: 'taberu'
  },
  {
    id: '7',
    kanji: '見る',
    kana: 'みる',
    meaning: 'to see',
    type: 'Ichidan',
    jlpt: 'N5',
    romaji: 'miru'
  },
  {
    id: '8',
    kanji: '起きる',
    kana: 'おきる',
    meaning: 'to wake up',
    type: 'Ichidan',
    jlpt: 'N5',
    romaji: 'okiru'
  },
  
  // ============= IRREGULAR VERBS =============
  {
    id: '9',
    kanji: 'する',
    kana: 'する',
    meaning: 'to do',
    type: 'Irregular',
    jlpt: 'N5',
    romaji: 'suru'
  },
  {
    id: '10',
    kanji: '来る',
    kana: 'くる',
    meaning: 'to come',
    type: 'Irregular',
    jlpt: 'N5',
    romaji: 'kuru'
  },
  {
    id: '11',
    kanji: '勉強する',
    kana: 'べんきょうする',
    meaning: 'to study',
    type: 'Irregular',
    jlpt: 'N5',
    romaji: 'benkyou suru'
  }
];

// Function to test a single verb
function testVerb(verb: JapaneseWord): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${verb.kanji} (${verb.kana}) - ${verb.meaning}`);

  console.log('='.repeat(60));
  
  const conjugations = ExtendedConjugationEngine.conjugate(verb);
  
  // Print selected conjugations for verification

  console.log(`  Provisional (ba): ${conjugations.provisional}`);

  console.log(`  Conditional (tara): ${conjugations.conditional}`);

  console.log('\n💛 TAI FORMS (Want to):');

  console.log(`  Formal Negative (zu): ${conjugations.formalNegative}`);
  console.log(`  Classical Negative (nu): ${conjugations.classicalNegative}`);
  console.log(`  Classical Modifier (zaru): ${conjugations.classicalNegativeModifier}`);

  console.log(`  Alternative Form (tari): ${conjugations.alternativeForm}`);

}

// Function to run all tests
export function runConjugationTests(): void {

  console.log('🌸'.repeat(30));

  console.log('🌸'.repeat(30));
  
  testVerbs.forEach(verb => testVerb(verb));

  console.log('🌸'.repeat(30));

  console.log('🌸'.repeat(30));
}

// Function to test specific form for 買う
export function testKauComprehensive(): void {
  const kau: JapaneseWord = {
    id: 'kau',
    kanji: '買う',
    kana: 'かう',
    meaning: 'to buy',
    type: 'Godan',
    jlpt: 'N5',
    romaji: 'kau'
  };
  
  const conjugations = ExtendedConjugationEngine.conjugate(kau);
  
  console.log('\n🔥 COMPREHENSIVE TEST FOR 買う (kau - to buy) 🔥\n');
  
  // Create a comparison table similar to the user's example
  const expectedForms = [
    { label: 'Masu stem', expected: '買い', actual: conjugations.masuStem },
    { label: 'Negative stem', expected: '買わ', actual: conjugations.negativeStem },
    { label: 'Te-form', expected: '買って', actual: conjugations.teForm },
    { label: 'Negative te-form', expected: '買わなくて', actual: conjugations.negativeTeForm },
    { label: 'Adverbial Negative', expected: '買わなく', actual: conjugations.adverbialNegative },
    { label: 'Plain Present', expected: '買う', actual: conjugations.present },
    { label: 'Plain Negative', expected: '買わない', actual: conjugations.negative },
    { label: 'Plain Past', expected: '買った', actual: conjugations.past },
    { label: 'Plain Past Negative', expected: '買わなかった', actual: conjugations.pastNegative },
    { label: 'Volitional', expected: '買おう', actual: conjugations.volitional },
    { label: 'Polite Present', expected: '買います', actual: conjugations.polite },
    { label: 'Polite Negative', expected: '買いません', actual: conjugations.politeNegative },
    { label: 'Polite Past', expected: '買いました', actual: conjugations.politePast },
    { label: 'Polite Past Negative', expected: '買いませんでした', actual: conjugations.politePastNegative },
    { label: 'Polite Volitional', expected: '買いましょう', actual: conjugations.politeVolitional },
    { label: 'Tai Form', expected: '買いたい', actual: conjugations.taiForm },
    { label: 'Tai Negative', expected: '買いたくない', actual: conjugations.taiFormNegative },
    { label: 'Tai Past', expected: '買いたかった', actual: conjugations.taiFormPast },
    { label: 'Tai Past Negative', expected: '買いたくなかった', actual: conjugations.taiFormPastNegative },
    { label: 'Tai Te-form', expected: '買いたくて', actual: conjugations.taiTeForm },
    { label: 'Tai Adverbial', expected: '買いたく', actual: conjugations.taiAdverbial },
    { label: 'Tai Provisional', expected: '買いたければ', actual: conjugations.taiProvisional },
    { label: 'Tai Provisional Neg', expected: '買いたくなければ', actual: conjugations.taiProvisionalNegative },
    { label: 'Tai Conditional', expected: '買いたかったら', actual: conjugations.taiConditional },
    { label: 'Tai Conditional Neg', expected: '買いたくなかったら', actual: conjugations.taiConditionalNegative },
    { label: 'Tai Objective', expected: '買いたさ', actual: conjugations.taiObjective },
    { label: 'Imperative', expected: '買え', actual: conjugations.imperativePlain },
    { label: 'Imperative Polite', expected: '買いなさい', actual: conjugations.imperativePolite },
    { label: 'Provisional', expected: '買えば', actual: conjugations.provisional },
    { label: 'Provisional Negative', expected: '買わなければ', actual: conjugations.provisionalNegative },
    { label: 'Colloquial Provisional', expected: '買わなきゃ', actual: conjugations.provisionalNegativeColloquial },
    { label: 'Conditional', expected: '買ったら', actual: conjugations.conditional },
    { label: 'Conditional Negative', expected: '買わなかったら', actual: conjugations.conditionalNegative },
    { label: 'Alternative (tari)', expected: '買ったり', actual: conjugations.alternativeForm },
    { label: 'Potential', expected: '買える', actual: conjugations.potential },
    { label: 'Potential Negative', expected: '買えない', actual: conjugations.potentialNegative },
    { label: 'Potential Past', expected: '買えた', actual: conjugations.potentialPast },
    { label: 'Potential Past Neg', expected: '買えなかった', actual: conjugations.potentialPastNegative },
    { label: 'Potential Masu Stem', expected: '買え', actual: conjugations.potentialMasuStem },
    { label: 'Potential Te-form', expected: '買えて', actual: conjugations.potentialTeForm },
    { label: 'Potential Polite', expected: '買えます', actual: conjugations.potentialPolite },
    { label: 'Passive', expected: '買われる', actual: conjugations.passive },
    { label: 'Passive Negative', expected: '買われない', actual: conjugations.passiveNegative },
    { label: 'Passive Past', expected: '買われた', actual: conjugations.passivePast },
    { label: 'Passive Masu Stem', expected: '買われ', actual: conjugations.passiveMasuStem },
    { label: 'Passive Te-form', expected: '買われて', actual: conjugations.passiveTeForm },
    { label: 'Causative', expected: '買わせる', actual: conjugations.causative },
    { label: 'Causative Negative', expected: '買わせない', actual: conjugations.causativeNegative },
    { label: 'Causative Past', expected: '買わせた', actual: conjugations.causativePast },
    { label: 'Causative Masu Stem', expected: '買わせ', actual: conjugations.causativeMasuStem },
    { label: 'Causative Te-form', expected: '買わせて', actual: conjugations.causativeTeForm },
    { label: 'Causative-Passive', expected: '買わされる', actual: conjugations.causativePassive },
    { label: 'Causative-Passive Neg', expected: '買わされない', actual: conjugations.causativePassiveNegative },
    { label: 'Causative-Passive Past', expected: '買わされた', actual: conjugations.causativePassivePast },
    { label: 'Colloquial Negative', expected: '買わん', actual: conjugations.colloquialNegative },
    { label: 'Formal Negative (zu)', expected: '買わず', actual: conjugations.formalNegative },
    { label: 'Classical Negative (nu)', expected: '買わぬ', actual: conjugations.classicalNegative },
    { label: 'Classical Modifier', expected: '買わざる', actual: conjugations.classicalNegativeModifier },
  ];
  
  // Print comparison table
  console.log('Form'.padEnd(30) + 'Expected'.padEnd(20) + 'Actual'.padEnd(20) + 'Status');
  console.log('-'.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  
  expectedForms.forEach(form => {
    const status = form.expected === form.actual ? '✅ PASS' : '❌ FAIL';
    if (form.expected === form.actual) {
      passCount++;
    } else {
      failCount++;
    }
    console.log(
      form.label.padEnd(30) +
      form.expected.padEnd(20) +
      form.actual.padEnd(20) +
      status
    );
  });
  
  console.log('\n' + '='.repeat(80));

  console.log(`Success Rate: ${((passCount / expectedForms.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
}

// Export for testing
export { testVerb, testVerbs };