import { ExtendedConjugationForms } from '@/types/conjugation-extended';

export interface ConjugationDisplayGroup {
  title: string;
  forms: ConjugationDisplayItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface ConjugationDisplayItem {
  label: string;
  key: keyof ExtendedConjugationForms;
  subLabel?: string;
  highlight?: boolean;
}

// Comprehensive conjugation display structure matching the exact format requested
export const COMPREHENSIVE_CONJUGATION_STRUCTURE: ConjugationDisplayGroup[] = [
  {
    title: 'Stems',
    forms: [
      { label: 'Masu stem', key: 'masuStem' },
      { label: 'Negative stem', key: 'negativeStem' },
      { label: 'Te-form', key: 'teForm' },
      { label: 'Negative te-form', key: 'negativeTeForm' },
      { label: 'Adverbial Negative Form', key: 'adverbialNegative' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Plain Form',
    forms: [
      { label: 'Present Indicative Form', key: 'present' },
      { label: 'Present Indicative Negative Form', key: 'negative' },
      { label: 'Past Indicative Form', key: 'past' },
      { label: 'Past Indicative Negative Form', key: 'pastNegative' },
      { label: 'Presumptive Form', key: 'volitional' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Polite Form',
    forms: [
      { label: 'Present Indicative Form', key: 'polite' },
      { label: 'Present Indicative Negative Form', key: 'politeNegative' },
      { label: 'Past Indicative Form', key: 'politePast' },
      { label: 'Past Indicative Negative Form', key: 'politePastNegative' },
      { label: 'Presumptive Form', key: 'politeVolitional' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Tai Form (Want to)',
    forms: [
      { label: 'Present Indicative Form', key: 'taiForm' },
      { label: 'Present Indicative Negative Form', key: 'taiFormNegative' },
      { label: 'Past Indicative Form', key: 'taiFormPast' },
      { label: 'Past Indicative Negative Form', key: 'taiFormPastNegative' },
      { label: 'Adjective stem', key: 'taiFormStem' },
      { label: 'Te-form', key: 'taiFormTeForm' },
      { label: 'Negative te-form', key: 'taiFormNegativeTeForm' },
      { label: 'Adverbial Form', key: 'taiFormAdverbial' },
      { label: 'Provisional Form', key: 'taiFormProvisional' },
      { label: 'Provisional Negative Form', key: 'taiFormProvisionalNegative' },
      { label: 'Conditional Form', key: 'taiFormConditional' },
      { label: 'Conditional Negative Form', key: 'taiFormConditionalNegative' },
      { label: 'Objective Form', key: 'taiFormObjective' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Imperative Forms',
    forms: [
      { label: 'Plain Form - Present Indicative', key: 'imperativePlain' },
      { label: 'Polite Form - Present Indicative', key: 'imperativePolite' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Provisional Form',
    forms: [
      { label: 'Present Indicative Form', key: 'provisional' },
      { label: 'Present Indicative Negative Form', key: 'provisionalNegative' },
      { label: 'Present Indicative Negative Colloquial Form', key: 'provisionalNegativeColloquial' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Conditional Form',
    forms: [
      { label: 'Present Indicative Form', key: 'conditional' },
      { label: 'Present Indicative Negative Form', key: 'conditionalNegative' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Alternative Form',
    forms: [
      { label: 'Present Indicative Form', key: 'alternativeForm' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Potential Plain Form',
    forms: [
      { label: 'Present Indicative Form', key: 'potential' },
      { label: 'Present Indicative Negative Form', key: 'potentialNegative' },
      { label: 'Past Indicative Form', key: 'potentialPast' },
      { label: 'Past Indicative Negative Form', key: 'potentialPastNegative' },
      { label: 'Masu-stem', key: 'potentialStem' },
      { label: 'Te-form', key: 'potentialTeForm' },
      { label: 'Negative te-form', key: 'potentialNegativeTeForm' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Potential Polite Form',
    forms: [
      { label: 'Present Indicative Form', key: 'potentialPolite' },
      { label: 'Present Indicative Negative Form', key: 'potentialPoliteNegative' },
      { label: 'Past Indicative Form', key: 'potentialPolitePast' },
      { label: 'Past Indicative Negative Form', key: 'potentialPolitePastNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Passive Plain Form',
    forms: [
      { label: 'Present Indicative Form', key: 'passive' },
      { label: 'Present Indicative Negative Form', key: 'passiveNegative' },
      { label: 'Past Indicative Form', key: 'passivePast' },
      { label: 'Past Indicative Negative Form', key: 'passivePastNegative' },
      { label: 'Masu stem', key: 'passiveStem' },
      { label: 'Te-form', key: 'passiveTeForm' },
      { label: 'Negative te-form', key: 'passiveNegativeTeForm' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Passive Polite Form',
    forms: [
      { label: 'Present Indicative Form', key: 'passivePolite' },
      { label: 'Present Indicative Negative Form', key: 'passivePoliteNegative' },
      { label: 'Past Indicative Form', key: 'passivePolitePast' },
      { label: 'Past Indicative Negative Form', key: 'passivePolitePastNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Causative Plain Form',
    forms: [
      { label: 'Present Indicative Form', key: 'causative' },
      { label: 'Present Indicative Negative Form', key: 'causativeNegative' },
      { label: 'Past Indicative Form', key: 'causativePast' },
      { label: 'Past Indicative Negative Form', key: 'causativePastNegative' },
      { label: 'Masu stem', key: 'causativeStem' },
      { label: 'Te-form', key: 'causativeTeForm' },
      { label: 'Negative te-form', key: 'causativeNegativeTeForm' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Causative Polite Form',
    forms: [
      { label: 'Present Indicative Form', key: 'causativePolite' },
      { label: 'Present Indicative Negative Form', key: 'causativePoliteNegative' },
      { label: 'Past Indicative Form', key: 'causativePolitePast' },
      { label: 'Past Indicative Negative Form', key: 'causativePolitePastNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Causative Passive Plain Form',
    forms: [
      { label: 'Present Indicative Form', key: 'causativePassive' },
      { label: 'Present Indicative Negative Form', key: 'causativePassiveNegative' },
      { label: 'Past Indicative Form', key: 'causativePassivePast' },
      { label: 'Past Indicative Negative Form', key: 'causativePassivePastNegative' },
      { label: 'Masu stem', key: 'causativePassiveStem' },
      { label: 'Te-form', key: 'causativePassiveTeForm' },
      { label: 'Negative te-form', key: 'causativePassiveNegativeTeForm' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Causative Passive Polite Form',
    forms: [
      { label: 'Present Indicative Form', key: 'causativePassivePolite' },
      { label: 'Present Indicative Negative Form', key: 'causativePassivePoliteNegative' },
      { label: 'Past Indicative Form', key: 'causativePassivePolitePast' },
      { label: 'Past Indicative Negative Form', key: 'causativePassivePolitePastNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Colloquial Form',
    forms: [
      { label: 'Present Indicative Negative Masculine Form', key: 'colloquialNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Formal Form',
    forms: [
      { label: 'Present Indicative Negative Form', key: 'formalNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Classical Form (nu)',
    forms: [
      { label: 'Present Indicative Negative Form', key: 'classicalNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
  {
    title: 'Classical Form (zaru)',
    forms: [
      { label: 'Present Indicative Negative Form', key: 'classicalNegativeModifier' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
];

// Simplified structure for adjectives (since they don't have all the forms)
export const ADJECTIVE_CONJUGATION_STRUCTURE: ConjugationDisplayGroup[] = [
  {
    title: 'Basic Forms',
    forms: [
      { label: 'Present', key: 'present' },
      { label: 'Negative', key: 'negative' },
      { label: 'Past', key: 'past' },
      { label: 'Past Negative', key: 'pastNegative' },
      { label: 'Te-form', key: 'teForm' },
      { label: 'Negative Te-form', key: 'negativeTeForm' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Polite Forms',
    forms: [
      { label: 'Polite', key: 'polite' },
      { label: 'Polite Negative', key: 'politeNegative' },
      { label: 'Polite Past', key: 'politePast' },
      { label: 'Polite Past Negative', key: 'politePastNegative' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Conditional Forms',
    forms: [
      { label: 'Provisional (ba)', key: 'provisional' },
      { label: 'Provisional Negative', key: 'provisionalNegative' },
      { label: 'Conditional (tara)', key: 'conditional' },
      { label: 'Conditional Negative', key: 'conditionalNegative' },
    ],
    defaultExpanded: true
  },
  {
    title: 'Presumptive Forms',
    forms: [
      { label: 'Presumptive', key: 'presumptive' },
      { label: 'Presumptive Negative', key: 'presumptiveNegative' },
      { label: 'Presumptive Polite', key: 'presumptivePolite' },
      { label: 'Presumptive Polite Negative', key: 'presumptivePoliteNegative' },
    ],
    collapsible: true,
    defaultExpanded: false
  },
];

// Helper function to get the appropriate structure based on word type
export function getConjugationStructure(wordType: string): ConjugationDisplayGroup[] {
  if (wordType === 'i-adjective' || wordType === 'na-adjective') {
    return ADJECTIVE_CONJUGATION_STRUCTURE;
  }
  return COMPREHENSIVE_CONJUGATION_STRUCTURE;
}