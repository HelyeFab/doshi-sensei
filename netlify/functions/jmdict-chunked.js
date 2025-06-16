const fs = require('fs').promises;
const path = require('path');

// JMdict XML Parser Functions (optimized for chunked access)
function parseJMdictXML(xmlContent, limit = 1000) {
  const entries = [];
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
    const entSeqMatch = entryXml.match(/<ent_seq>(\d+)<\/ent_seq>/);
    if (!entSeqMatch) return null;

    const entSeq = entSeqMatch[1];

    const kanji = [];
    const kanjiRegex = /<keb>([^<]+)<\/keb>/g;
    let kanjiMatch;
    while ((kanjiMatch = kanjiRegex.exec(entryXml)) !== null) {
      kanji.push(kanjiMatch[1]);
    }

    const readings = [];
    const readingRegex = /<reb>([^<]+)<\/reb>/g;
    let readingMatch;
    while ((readingMatch = readingRegex.exec(entryXml)) !== null) {
      readings.push(readingMatch[1]);
    }

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
    const partOfSpeech = [];
    const posRegex = /<pos>([^<]+)<\/pos>/g;
    let posMatch;
    while ((posMatch = posRegex.exec(senseXml)) !== null) {
      const pos = posMatch[1].replace(/&([^;]+);/g, '$1');
      partOfSpeech.push(pos);
    }

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
  const kanji = entry.kanji[0] || entry.readings[0] || 'Unknown';
  const kana = entry.readings[0] || entry.kanji[0] || 'Unknown';
  const romaji = convertKanaToRomaji(kana);
  const meaning = entry.senses[0]?.glosses.join(', ') || 'No meaning available';
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

  if (pos.includes('v1') || pos.includes('ichidan')) {
    return 'Ichidan';
  } else if (pos.includes('v5') || pos.includes('godan')) {
    return 'Godan';
  } else if (pos.includes('vs-s') || pos.includes('vs-i') || pos.includes('vk') || pos.includes('irregular')) {
    return 'Irregular';
  } else if (pos.includes('adj-i') || pos.includes('i-adjective')) {
    return 'i-adjective';
  } else if (pos.includes('adj-na') || pos.includes('na-adjective')) {
    return 'na-adjective';
  } else if (pos.includes('n') || pos.includes('noun')) {
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

    const kanjiMatch = entry.kanji.some(k => k.includes(query));
    const readingMatch = entry.readings.some(r => r.includes(query));
    const meaningMatch = entry.senses.some(sense =>
      sense.glosses.some(gloss => gloss.toLowerCase().includes(lowerQuery))
    );

    if (kanjiMatch || readingMatch || meaningMatch) {
      results.push(entry);
    }
  }

  return results;
}

// Cache for search index and chunks
let searchIndex = null;
let chunkCache = new Map();
let indexLoadTime = 0;
const INDEX_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CHUNK_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function loadSearchIndex() {
  try {
    const now = Date.now();
    if (searchIndex && (now - indexLoadTime) < INDEX_CACHE_DURATION) {
      return searchIndex;
    }

    console.log('Loading search index...');
    console.log('__dirname:', __dirname);
    console.log('process.cwd():', process.cwd());

    // For Netlify static export, files are in the build output directory
    const possiblePaths = [
      path.join(__dirname, '..', '..', '..', 'dict', 'index.json'),
      path.join(__dirname, '..', '..', 'dict', 'index.json'),
      path.join(process.cwd(), 'dict', 'index.json'),
      path.join('/opt/build/repo/out/dict/index.json'),
      path.join('/var/task', 'dict', 'index.json'),
      path.join(__dirname, '..', '..', '.next', 'dict', 'index.json'),
      path.join('/var/task', '.next', 'dict', 'index.json'),
      path.join(process.cwd(), '.next', 'dict', 'index.json')
    ];

    console.log('Checking paths for index file:');
    possiblePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

    let indexPath = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        indexPath = testPath;
        console.log(`✅ Found index file at: ${indexPath}`);
        break;
      } catch (error) {
        console.log(`❌ Not found: ${testPath}`);
        continue;
      }
    }

    if (!indexPath) {
      console.error('Search index file not found in any expected location');
      return null;
    }

    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);

    searchIndex = indexData;
    indexLoadTime = now;

    console.log(`Loaded search index: ${indexData.totalEntries} entries, ${indexData.totalChunks} chunks`);
    return searchIndex;

  } catch (error) {
    console.error('Error loading search index:', error);
    return null;
  }
}

async function loadChunk(chunkIndex) {
  try {
    const now = Date.now();
    const cacheKey = `chunk_${chunkIndex}`;

    // Check cache
    if (chunkCache.has(cacheKey)) {
      const cached = chunkCache.get(cacheKey);
      if ((now - cached.timestamp) < CHUNK_CACHE_DURATION) {
        return cached.data;
      } else {
        chunkCache.delete(cacheKey);
      }
    }

    console.log(`Loading chunk ${chunkIndex}...`);

    const index = await loadSearchIndex();
    if (!index || !index.chunks[chunkIndex]) {
      console.error(`Chunk ${chunkIndex} not found in index`);
      return [];
    }

    const chunk = index.chunks[chunkIndex];
    const chunkFilename = chunk.filename;

    // For Netlify static export, chunk files are in the build output directory
    const possiblePaths = [
      path.join(__dirname, '..', '..', '..', 'dict', 'chunks', chunkFilename),
      path.join(__dirname, '..', '..', 'dict', 'chunks', chunkFilename),
      path.join(process.cwd(), 'dict', 'chunks', chunkFilename),
      path.join('/opt/build/repo/out/dict/chunks', chunkFilename),
      path.join('/var/task', 'dict', 'chunks', chunkFilename),
      path.join(__dirname, '..', '..', '.next', 'dict', 'chunks', chunkFilename),
      path.join('/var/task', '.next', 'dict', 'chunks', chunkFilename),
      path.join(process.cwd(), '.next', 'dict', 'chunks', chunkFilename)
    ];

    let chunkPath = null;
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        chunkPath = testPath;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!chunkPath) {
      console.error(`Chunk file ${chunkFilename} not found in any expected location`);
      return [];
    }

    const chunkContent = await fs.readFile(chunkPath, 'utf-8');
    const entries = parseJMdictXML(chunkContent, 10000);

    // Cache the chunk
    chunkCache.set(cacheKey, {
      data: entries,
      timestamp: now
    });

    // Limit cache size
    if (chunkCache.size > 5) {
      const oldestKey = Array.from(chunkCache.keys())[0];
      chunkCache.delete(oldestKey);
    }

    console.log(`Loaded chunk ${chunkIndex}: ${entries.length} entries`);
    return entries;

  } catch (error) {
    console.error(`Error loading chunk ${chunkIndex}:`, error);
    return [];
  }
}

async function searchChunkedJMdict(query, limit = 20) {
  try {
    console.log(`Searching chunked JMdict for: "${query}"`);

    const index = await loadSearchIndex();
    if (!index) {
      console.log('Search index not available, returning empty results');
      return [];
    }

    // Find relevant chunks using the search index
    const lowerQuery = query.toLowerCase();
    const relevantChunks = new Set();

    // Check direct matches
    if (index.searchIndex[lowerQuery]) {
      index.searchIndex[lowerQuery].forEach(chunkIndex => relevantChunks.add(chunkIndex));
    }

    // Check partial matches for longer queries
    if (query.length >= 2) {
      for (let i = 2; i <= Math.min(query.length, 4); i++) {
        const partial = lowerQuery.substring(0, i);
        if (index.searchIndex[partial]) {
          index.searchIndex[partial].forEach(chunkIndex => relevantChunks.add(chunkIndex));
        }
      }
    }

    // If no relevant chunks found, search a few chunks anyway
    if (relevantChunks.size === 0) {
      console.log('No relevant chunks found in index, searching first few chunks');
      [0, 1, 2].forEach(i => {
        if (i < index.totalChunks) relevantChunks.add(i);
      });
    }

    console.log(`Searching ${relevantChunks.size} relevant chunks: [${Array.from(relevantChunks).join(', ')}]`);

    // Load and search relevant chunks
    const allResults = [];
    const chunkPromises = Array.from(relevantChunks).slice(0, 3).map(async (chunkIndex) => {
      try {
        const entries = await loadChunk(chunkIndex);
        const results = searchJMdictEntries(entries, query, limit);
        return results.map((entry, index) => convertToJapaneseWord(entry, index));
      } catch (error) {
        console.error(`Error searching chunk ${chunkIndex}:`, error);
        return [];
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(results => allResults.push(...results));

    // Remove duplicates and limit results
    const uniqueResults = allResults.filter((word, index, self) =>
      index === self.findIndex(w => w.id === word.id)
    );

    const finalResults = uniqueResults.slice(0, limit);
    console.log(`Found ${finalResults.length} unique results from chunked search`);

    return finalResults;

  } catch (error) {
    console.error('Error in chunked JMdict search:', error);
    return [];
  }
}

// Netlify Function Handler
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
        const index = await loadSearchIndex();
        if (!index) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Search index not found. Please run the chunking script first.',
              instructions: 'Run: node scripts/chunk-jmdict.js'
            })
          };
        }

        // Test loading a chunk
        const testChunk = await loadChunk(0);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Chunked JMdict working! Index loaded with ${index.totalChunks} chunks.`,
            indexStats: {
              totalEntries: index.totalEntries,
              totalChunks: index.totalChunks,
              searchTerms: Object.keys(index.searchIndex).length
            },
            sampleEntries: testChunk.slice(0, 3).map((entry, index) =>
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

        const results = await searchChunkedJMdict(query, parsedLimit);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            query,
            results,
            count: results.length,
            source: 'JMdict Chunked'
          })
        };

      case 'stats':
        const statsIndex = await loadSearchIndex();
        if (!statsIndex) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Search index not found' })
          };
        }

        const stats = {
          totalEntries: statsIndex.totalEntries,
          totalChunks: statsIndex.totalChunks,
          searchTerms: Object.keys(statsIndex.searchIndex).length,
          cacheStatus: {
            indexCached: searchIndex !== null,
            chunksInCache: chunkCache.size,
            indexAge: searchIndex ? Math.round((Date.now() - indexLoadTime) / 1000) : 0
          },
          chunks: statsIndex.chunks.map(chunk => ({
            filename: chunk.filename,
            entryCount: chunk.entryCount,
            sizeKB: Math.round(chunk.size / 1024)
          }))
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
    console.error('Chunked JMdict function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Server error: ${error.message || 'Unknown error'}`
      })
    };
  }
};
