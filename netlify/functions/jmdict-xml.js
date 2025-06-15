const fs = require('fs').promises;
const path = require('path');

// JMdict XML Parser Functions (simplified for Netlify)
function parseJMdictXML(xmlContent, limit = 1000) {
  const entries = [];

  // Extract entries using regex
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

function parseEntry(entryXml) {
  try {
    // Extract entry sequence
    const entSeqMatch = entryXml.match(/<ent_seq>(\d+)<\/ent_seq>/);
    if (!entSeqMatch) return null;

    const entSeq = entSeqMatch[1];

    // Extract kanji elements
    const kanji = [];
    const kanjiRegex = /<keb>([^<]+)<\/keb>/g;
    let kanjiMatch;
    while ((kanjiMatch = kanjiRegex.exec(entryXml)) !== null) {
      kanji.push(kanjiMatch[1]);
    }

    // Extract reading elements
    const readings = [];
    const readingRegex = /<reb>([^<]+)<\/reb>/g;
    let readingMatch;
    while ((readingMatch = readingRegex.exec(entryXml)) !== null) {
      readings.push(readingMatch[1]);
    }

    // Extract senses
    const senses = [];
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

function parseSense(senseXml) {
  try {
    // Extract part of speech
    const partOfSpeech = [];
    const posRegex = /<pos>([^<]+)<\/pos>/g;
    let posMatch;
    while ((posMatch = posRegex.exec(senseXml)) !== null) {
      // Remove entity references like &n; &v; etc.
      const pos = posMatch[1].replace(/&([^;]+);/g, '$1');
      partOfSpeech.push(pos);
    }

    // Extract glosses (meanings)
    const glosses = [];
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

function convertToJapaneseWord(entry, index) {
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

  return {
    id: `jmdict-${entry.entSeq}`,
    kanji,
    kana,
    romaji,
    meaning,
    type: wordType,
    jlpt: 'N5',
    tags: allPOS
  };
}

function determineWordType(partOfSpeech) {
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

function convertKanaToRomaji(kana) {
  const kanaMap = {
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

function searchJMdictEntries(entries, query, limit = 20) {
  const results = [];
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

// Cache for parsed entries
let cachedEntries = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function loadJMdictEntries(chunkSize = 200000) {
  try {
    // Check cache
    const now = Date.now();
    if (cachedEntries && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedEntries;
    }

    console.log('Loading JMdict entries from file...');

    // In Netlify Functions, files are in the deploy directory
    // Try multiple potential paths
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'dict', 'JMdict_e_examp'),
      path.join(__dirname, '..', '..', 'public', 'dict', 'JMdict_e_examp'),
      path.join('/var/task', 'public', 'dict', 'JMdict_e_examp'),
      '/tmp/JMdict_e_examp'
    ];

    let filePath = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        filePath = testPath;
        console.log(`Found JMdict file at: ${filePath}`);
        break;
      } catch (error) {
        console.log(`JMdict file not found at: ${testPath}`);
        continue;
      }
    }

    if (!filePath) {
      console.error('JMdict file not found in any expected location');
      return [];
    }

    // Read the file
    const content = await fs.readFile(filePath, 'utf-8');

    // Take a chunk for processing
    const chunk = content.substring(0, chunkSize);

    // Parse entries
    const entries = parseJMdictXML(chunk, 500);

    // Cache the results
    cachedEntries = entries;
    cacheTimestamp = now;

    console.log(`Loaded and cached ${entries.length} JMdict entries`);
    return entries;
  } catch (error) {
    console.error('Error loading JMdict entries:', error);
    return [];
  }
}

// Netlify Function Handler
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { action, query, limit } = event.queryStringParameters || {};
  const parsedLimit = parseInt(limit) || 20;

  try {
    switch (action) {
      case 'test':
        const testEntries = await loadJMdictEntries(100000); // 100KB for quick test
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `JMdict XML parser working! Loaded ${testEntries.length} entries.`,
            sampleEntries: testEntries.slice(0, 3).map((entry, index) =>
              convertToJapaneseWord(entry, index)
            )
          })
        };

      case 'search':
        if (!query) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Query parameter required' })
          };
        }

        const allEntries = await loadJMdictEntries();
        const matchingEntries = searchJMdictEntries(allEntries, query, parsedLimit);

        const results = matchingEntries.map((entry, index) =>
          convertToJapaneseWord(entry, index)
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            query,
            results,
            count: results.length,
            source: 'JMdict XML'
          })
        };

      case 'stats':
        const statsEntries = await loadJMdictEntries();
        const stats = {
          totalEntries: statsEntries.length,
          entriesWithKanji: statsEntries.filter(e => e.kanji.length > 0).length,
          entriesWithReadings: statsEntries.filter(e => e.readings.length > 0).length,
          averageSensesPerEntry: statsEntries.reduce((acc, e) => acc + e.senses.length, 0) / statsEntries.length,
          cacheStatus: cachedEntries ? 'cached' : 'not cached',
          cacheAge: cachedEntries ? Math.round((Date.now() - cacheTimestamp) / 1000) : 0
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(stats)
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use: test, search, or stats' })
        };
    }
  } catch (error) {
    console.error('JMdict XML function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Server error: ${error.message || 'Unknown error'}`
      })
    };
  }
};
