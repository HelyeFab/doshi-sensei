// src/utils/jmdictLocalSearch.ts
import { JapaneseWord } from '@/types';

let jmdictData: any = null;
let loadingPromise: Promise<void> | null = null;

export async function loadJMdictData() {
  if (jmdictData) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch('/data/jmdict-eng-common.json')
    .then(res => res.json())
    .then(data => {
      jmdictData = data;
    })
    .catch(err => {
      console.error('Failed to load JMdict data:', err);
      jmdictData = null;
    }) as any;
  return loadingPromise;
}

// Priority tags indicating common usage
const PRIORITY_TAGS = new Set([
  'news1', 'news2', 'ichi1', 'ichi2', 'spec1', 'spec2', 'gai1', 'gai2',
  'nf01','nf02','nf03','nf04','nf05','nf06','nf07','nf08','nf09','nf10'
]);

// Common parts of speech
const COMMON_POS = [
  'noun', 'verb', 'adjective', 'adverb', 'expression', 'pronoun', 'conjunction', 'interjection'
];

function getPriorityScore(tags: string[]): number {
  return tags.some(tag => PRIORITY_TAGS.has(tag)) ? 100 : 0;
}

function getPosScore(pos: string[]): number {
  return pos.some(p => COMMON_POS.some(c => p.includes(c))) ? 30 : 0;
}

function getFrequencyScore(word: any): number {
  // Placeholder: if you have a frequency list, use it here
  // e.g., if (FREQUENCY_LIST[word.kanji[0]?.text]) return 50;
  return 0;
}

export async function searchJMdictWords(term: string, limit: number = 30): Promise<JapaneseWord[]> {
  await loadJMdictData();
  if (!jmdictData) return [];
  const lowerTerm = term.toLowerCase();
  const results: { word: any; score: number }[] = [];
  for (const word of jmdictData.words) {
    // Gather tags and part of speech
    const tags = [
      ...(word.kanji?.flatMap((k: any) => k.tags || []) || []),
      ...(word.kana?.flatMap((k: any) => k.tags || []) || [])
    ];
    const pos = word.sense?.flatMap((s: any) => s.partOfSpeech || []) || [];

    // Scoring
    let score = 0;
    // Priority tags
    score += getPriorityScore(tags);
    // Part of speech
    score += getPosScore(pos);
    // Frequency (if available)
    score += getFrequencyScore(word);

    // Exact/partial match
    let exact = false;
    let partial = false;
    if (word.kanji.some((k: any) => k.text === term) || word.kana.some((k: any) => k.text === term)) {
      score += 1000;
      exact = true;
    } else if (word.kanji.some((k: any) => k.text && k.text.includes(term)) || word.kana.some((k: any) => k.text && k.text.includes(term))) {
      score += 100;
      partial = true;
    }
    // English gloss match
    const glossMatch = word.sense.some((s: any) =>
      s.gloss.some((g: any) => g.lang === 'eng' && g.text.toLowerCase().includes(lowerTerm))
    );
    if (glossMatch) score += 50;

    if (exact || partial || glossMatch) {
      results.push({ word, score });
    }
  }
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  // Convert to JapaneseWord format
  return results.slice(0, limit).map(({ word }) => {
    const mainKanji = word.kanji[0]?.text || word.kana[0]?.text || '';
    const mainKana = word.kana[0]?.text || '';
    const meaning = word.sense[0]?.gloss?.find((g: any) => g.lang === 'eng')?.text || '';
    return {
      id: word.id,
      kanji: mainKanji,
      kana: mainKana,
      romaji: '', // Optionally add romaji conversion
      meaning,
      type: '', // Optionally map partOfSpeech to type
      jlpt: 'N5', // Optionally map to JLPT
      tags: []
    };
  });
}
