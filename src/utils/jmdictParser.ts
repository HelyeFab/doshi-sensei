import { JapaneseWord, WordType, JLPTLevel } from '@/types';

// JMdict XML Parser
// Parses the official JMdict XML format directly

export interface JMdictEntry {
  entSeq: string;
  kanji: string[];
  readings: string[];
  senses: JMdictSense[];
}

export interface JMdictSense {
  partOfSpeech: string[];
  glosses: string[];
}

/**
 * Parse JMdict XML content and extract entries
 */
export function parseJMdictXML(xmlContent: string, limit: number = 1000): JMdictEntry[] {
  const entries: JMdictEntry[] = [];

  // Extract entries using regex (more efficient than full XML parsing for large files)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  let count = 0;

  while ((match = entryRegex.exec(xmlContent)) !== null && count < limit) {
    const entryXml = match[1];
    const entry = parseEntry(entryXml);
    if (entry) {
      entries.push(entry);
      count++;
    }
  }

  return entries;
}

/**
 * Parse a single entry from XML content
 */
function parseEntry(entryXml: string): JMdictEntry | null {
  try {
    // Extract entry sequence
    const entSeqMatch = entryXml.match(/<ent_seq>(\d+)<\/ent_seq>/);
    if (!entSeqMatch) return null;

    const entSeq = entSeqMatch[1];

    // Extract kanji elements
    const kanji: string[] = [];
    const kanjiRegex = /<keb>([^<]+)<\/keb>/g;
    let kanjiMatch;
    while ((kanjiMatch = kanjiRegex.exec(entryXml)) !== null) {
      kanji.push(kanjiMatch[1]);
    }

    // Extract reading elements
    const readings: string[] = [];
    const readingRegex = /<reb>([^<]+)<\/reb>/g;
    let readingMatch;
    while ((readingMatch = readingRegex.exec(entryXml)) !== null) {
      readings.push(readingMatch[1]);
    }

    // Extract senses
    const senses: JMdictSense[] = [];
    const senseRegex = /<sense>([\s\S]*?)<\/sense>/g;
    let senseMatch;
    while ((senseMatch = senseRegex.exec(entryXml)) !== null) {
      const sense = parseSense(senseMatch[1]);
      if (sense) {
        senses.push(sense);
      }
    }

    return {
      entSeq,
      kanji,
      readings,
      senses
    };
  } catch (error) {
    console.error('Error parsing entry:', error);
    return null;
  }
}

/**
 * Parse a sense element
 */
function parseSense(senseXml: string): JMdictSense | null {
  try {
    // Extract part of speech
    const partOfSpeech: string[] = [];
    const posRegex = /<pos>([^<]+)<\/pos>/g;
    let posMatch;
    while ((posMatch = posRegex.exec(senseXml)) !== null) {
      // Remove entity references like &n; &v; etc.
      const pos = posMatch[1].replace(/&([^;]+);/g, '$1');
      partOfSpeech.push(pos);
    }

    // Extract glosses (meanings)
    const glosses: string[] = [];
    const glossRegex = /<gloss[^>]*>([^<]+)<\/gloss>/g;
    let glossMatch;
    while ((glossMatch = glossRegex.exec(senseXml)) !== null) {
      glosses.push(glossMatch[1]);
    }

    return {
      partOfSpeech,
      glosses
    };
  } catch (error) {
    console.error('Error parsing sense:', error);
    return null;
  }
}

/**
 * Convert JMdict entry to JapaneseWord format
 */
export function convertToJapaneseWord(entry: JMdictEntry, index: number): JapaneseWord {
  // Get primary kanji and reading
  const kanji = entry.kanji[0] || entry.readings[0] || 'Unknown';
  const kana = entry.readings[0] || entry.kanji[0] || 'Unknown';

  // Generate romaji (simplified conversion)
  const romaji = convertKanaToRomaji(kana);

  // Get primary meaning
  const meaning = entry.senses[0]?.glosses.join(', ') || 'No meaning available';

  // Determine word type from part of speech
  const allPOS = entry.senses.flatMap(s => s.partOfSpeech);
  const wordType = determineWordType(allPOS);

  // Default JLPT level (JMdict doesn't include this)
  const jlptLevel: JLPTLevel = 'N5';

  return {
    id: `jmdict-${entry.entSeq}`,
    kanji,
    kana,
    romaji,
    meaning,
    type: wordType,
    jlpt: jlptLevel,
    tags: allPOS
  };
}

/**
 * Determine word type from part of speech tags
 */
function determineWordType(partOfSpeech: string[]): WordType {
  const pos = partOfSpeech.join(' ').toLowerCase();

  // Verb classifications
  if (pos.includes('v1') || pos.includes('ichidan')) {
    return 'Ichidan';
  } else if (pos.includes('v5') || pos.includes('godan')) {
    return 'Godan';
  } else if (pos.includes('vs-s') || pos.includes('vs-i') || pos.includes('vk') || pos.includes('irregular')) {
    return 'Irregular';
  }

  // Adjective classifications
  else if (pos.includes('adj-i') || pos.includes('i-adjective')) {
    return 'i-adjective';
  } else if (pos.includes('adj-na') || pos.includes('na-adjective')) {
    return 'na-adjective';
  }

  // Other classifications
  else if (pos.includes('n') || pos.includes('noun')) {
    return 'noun';
  } else if (pos.includes('adv') || pos.includes('adverb')) {
    return 'adverb';
  } else if (pos.includes('prt') || pos.includes('particle')) {
    return 'particle';
  }

  return 'other';
}

/**
 * Simple kana to romaji conversion
 */
function convertKanaToRomaji(kana: string): string {
  const kanaMap: { [key: string]: string } = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n',
    'ー': '', 'っ': ''
  };

  let result = '';
  for (let i = 0; i < kana.length; i++) {
    const char = kana[i];
    result += kanaMap[char] || char;
  }
  return result;
}

/**
 * Search JMdict entries by query
 */
export function searchJMdictEntries(entries: JMdictEntry[], query: string, limit: number = 20): JMdictEntry[] {
  const results: JMdictEntry[] = [];
  const lowerQuery = query.toLowerCase();

  for (const entry of entries) {
    if (results.length >= limit) break;

    // Search in kanji
    const kanjiMatch = entry.kanji.some(k => k.includes(query));

    // Search in readings
    const readingMatch = entry.readings.some(r => r.includes(query));

    // Search in glosses (English meanings)
    const meaningMatch = entry.senses.some(sense =>
      sense.glosses.some(gloss => gloss.toLowerCase().includes(lowerQuery))
    );

    if (kanjiMatch || readingMatch || meaningMatch) {
      results.push(entry);
    }
  }

  return results;
}

// Note: For server-side file loading, use the functions in netlify/functions/jmdict-xml.js
// This parser is designed to work in both browser and Node.js environments
// by accepting XML content directly rather than file paths
