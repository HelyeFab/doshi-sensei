const fs = require('fs').promises;
const path = require('path');

// Configuration
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks
const INPUT_FILE = path.join(__dirname, '..', 'public', 'dict', 'JMdict_e_examp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'dict', 'chunks');
const INDEX_FILE = path.join(__dirname, '..', 'public', 'dict', 'index.json');

// JMdict XML Parser Functions
function parseJMdictXML(xmlContent, limit = null) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  let count = 0;

  while ((match = entryRegex.exec(xmlContent)) !== null) {
    if (limit && count >= limit) break;

    const entryXml = match[1];
    const entry = parseEntry(entryXml);
    if (entry) {
      entries.push({
        ...entry,
        rawXml: match[0] // Keep original XML for chunk reconstruction
      });
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

    // Extract senses for indexing
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

function createSearchTerms(entry) {
  const terms = new Set();

  // Add kanji
  entry.kanji.forEach(k => {
    terms.add(k.toLowerCase());
    // Add partial matches for kanji (first 1-3 characters)
    for (let i = 1; i <= Math.min(3, k.length); i++) {
      terms.add(k.substring(0, i).toLowerCase());
    }
  });

  // Add readings
  entry.readings.forEach(r => {
    terms.add(r.toLowerCase());
    // Add partial matches for readings (first 1-4 characters)
    for (let i = 1; i <= Math.min(4, r.length); i++) {
      terms.add(r.substring(0, i).toLowerCase());
    }
  });

  // Add English meanings
  entry.senses.forEach(sense => {
    sense.glosses.forEach(gloss => {
      const words = gloss.toLowerCase().split(/[,\s\-_()]+/);
      words.forEach(word => {
        if (word.length >= 2) {
          terms.add(word);
          // Add partial matches for longer words
          if (word.length >= 4) {
            for (let i = 2; i <= Math.min(4, word.length - 1); i++) {
              terms.add(word.substring(0, i));
            }
          }
        }
      });
    });
  });

  return Array.from(terms);
}

async function chunkJMdictFile() {
  try {
    console.log('Reading JMdict file...');
    const content = await fs.readFile(INPUT_FILE, 'utf-8');

    console.log('Parsing entries...');
    const allEntries = parseJMdictXML(content);
    console.log(`Parsed ${allEntries.length} entries`);

    // Create output directory
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Create chunks
    const chunks = [];
    const chunkSize = Math.ceil(allEntries.length / Math.ceil(content.length / CHUNK_SIZE));

    console.log(`Creating chunks with approximately ${chunkSize} entries each...`);

    for (let i = 0; i < allEntries.length; i += chunkSize) {
      const chunkEntries = allEntries.slice(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize);
      const chunkFilename = `chunk_${chunkIndex.toString().padStart(3, '0')}.xml`;

      // Create XML content for chunk
      const chunkXml = '<?xml version="1.0" encoding="UTF-8"?>\n<JMdict>\n' +
        chunkEntries.map(entry => entry.rawXml).join('\n') +
        '\n</JMdict>';

      // Write chunk file
      const chunkPath = path.join(OUTPUT_DIR, chunkFilename);
      await fs.writeFile(chunkPath, chunkXml, 'utf-8');

      // Create chunk metadata
      const chunkMeta = {
        filename: chunkFilename,
        path: `dict/chunks/${chunkFilename}`,
        index: chunkIndex,
        entryCount: chunkEntries.length,
        size: Buffer.byteLength(chunkXml, 'utf-8'),
        entryRange: {
          start: chunkEntries[0].entSeq,
          end: chunkEntries[chunkEntries.length - 1].entSeq
        }
      };

      chunks.push(chunkMeta);

      console.log(`Created ${chunkFilename}: ${chunkEntries.length} entries, ${Math.round(chunkMeta.size / 1024)}KB`);
    }

    // Create search index
    console.log('Creating search index...');
    const searchIndex = {};

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const startIdx = chunkIndex * chunkSize;
      const endIdx = Math.min(startIdx + chunkSize, allEntries.length);

      for (let i = startIdx; i < endIdx; i++) {
        const entry = allEntries[i];
        const searchTerms = createSearchTerms(entry);

        searchTerms.forEach(term => {
          if (!searchIndex[term]) {
            searchIndex[term] = [];
          }
          if (Array.isArray(searchIndex[term]) && !searchIndex[term].includes(chunkIndex)) {
            searchIndex[term].push(chunkIndex);
          }
        });
      }
    }

    // Create index file
    const indexData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      totalEntries: allEntries.length,
      totalChunks: chunks.length,
      chunks,
      searchIndex
    };

    await fs.writeFile(INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf-8');

    console.log('\n=== Chunking Complete ===');
    console.log(`Total entries: ${allEntries.length}`);
    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Search terms indexed: ${Object.keys(searchIndex).length}`);
    console.log(`Index file size: ${Math.round(Buffer.byteLength(JSON.stringify(indexData), 'utf-8') / 1024)}KB`);

    // Display chunk statistics
    console.log('\nChunk statistics:');
    chunks.forEach(chunk => {
      console.log(`${chunk.filename}: ${chunk.entryCount} entries, ${Math.round(chunk.size / 1024)}KB`);
    });

  } catch (error) {
    console.error('Error chunking JMdict file:', error);
    process.exit(1);
  }
}

// Run the chunking process
chunkJMdictFile();
