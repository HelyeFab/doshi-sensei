// Computation Web Worker - Singleton service for heavy computations
// Following PWA best practices from Google Workbox and major PWAs

// Import utilities for different computation tasks
const WORKER_VERSION = '1.0.0';

// Cache for Tatoeba data chunks
const tatoebaCache = {
  metadata: null,
  indexChunks: new Map(),
  exampleChunks: new Map()
};

// Japanese text cleaning function
function cleanJapaneseText(text) {
  if (!text || typeof text !== 'string') return text;
  // Remove brackets with readings [reading] or ［reading］
  return text.replace(/[\[［][^\]］]+[\]］]/g, '').trim();
}

// Validate Japanese example
function isValidExample(example) {
  if (!example || typeof example !== 'object') return false;
  if (!example.japanese || !example.english) return false;
  if (typeof example.japanese !== 'string' || typeof example.english !== 'string') return false;
  
  // Check for Japanese characters
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  if (!japanesePattern.test(example.japanese)) return false;
  
  // Check it's not just numbers
  if (/^\d+$/.test(example.japanese)) return false;
  
  return true;
}

// Load Tatoeba metadata
async function loadTatoebaMetadata() {
  if (tatoebaCache.metadata) return tatoebaCache.metadata;
  
  try {
    const response = await fetch('/data/tatoeba/metadata.json');
    tatoebaCache.metadata = await response.json();
    return tatoebaCache.metadata;
  } catch (error) {
    console.error('Failed to load Tatoeba metadata:', error);
    throw new Error('Tatoeba data not available');
  }
}

// Load Tatoeba index chunk
async function loadIndexChunk(chunkIndex) {
  if (tatoebaCache.indexChunks.has(chunkIndex)) {
    return tatoebaCache.indexChunks.get(chunkIndex);
  }
  
  try {
    const response = await fetch(`/data/tatoeba/index-${chunkIndex}.json`);
    const data = await response.json();
    tatoebaCache.indexChunks.set(chunkIndex, data);
    return data;
  } catch (error) {
    console.error(`Failed to load index chunk ${chunkIndex}:`, error);
    throw error;
  }
}

// Load Tatoeba example chunk
async function loadExampleChunk(chunkIndex) {
  if (tatoebaCache.exampleChunks.has(chunkIndex)) {
    return tatoebaCache.exampleChunks.get(chunkIndex);
  }
  
  try {
    const response = await fetch(`/data/tatoeba/examples-${chunkIndex}.json`);
    const data = await response.json();
    tatoebaCache.exampleChunks.set(chunkIndex, data);
    return data;
  } catch (error) {
    console.error(`Failed to load example chunk ${chunkIndex}:`, error);
    throw error;
  }
}

// Search Tatoeba examples
async function searchTatoebaInWorker(word, limit = 5) {
  const metadata = await loadTatoebaMetadata();
  if (!metadata) return [];
  
  const examples = [];
  const seenIds = new Set();
  
  // Search through index chunks
  for (let i = 0; i < metadata.totalIndexChunks && examples.length < limit; i++) {
    try {
      const indexChunk = await loadIndexChunk(i);
      
      if (indexChunk[word]) {
        const exampleIndices = indexChunk[word];
        
        for (const exampleIndex of exampleIndices) {
          if (examples.length >= limit) break;
          
          const chunkIndex = Math.floor(exampleIndex / metadata.chunkSize);
          const localIndex = exampleIndex % metadata.chunkSize;
          
          try {
            const exampleChunk = await loadExampleChunk(chunkIndex);
            const example = exampleChunk[localIndex];
            
            if (example && !seenIds.has(example.id)) {
              examples.push(example);
              seenIds.add(example.id);
            }
          } catch (err) {
            console.error(`Failed to load example chunk ${chunkIndex}:`, err);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load index chunk ${i}:`, error);
    }
  }
  
  return examples;
}

// Batch process vocabulary items
function batchProcessVocabulary(items) {
  return items.map(item => {
    // Clean Japanese text
    if (item.kanji) {
      item.kanji = cleanJapaneseText(item.kanji);
    }
    if (item.kana) {
      item.kana = cleanJapaneseText(item.kana);
    }
    
    // Validate and clean examples
    if (item.example) {
      if (isValidExample(item.example)) {
        item.example.japanese = cleanJapaneseText(item.example.japanese);
      } else {
        item.example = null;
      }
    }
    
    return item;
  });
}

// FSRS Algorithm calculations (for spaced repetition)
function calculateFSRSSchedule(card, rating) {
  // Simplified FSRS calculation for worker
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  const intervals = {
    1: 1,  // Again - 1 day
    2: 3,  // Hard - 3 days
    3: 7,  // Good - 7 days
    4: 14  // Easy - 14 days
  };
  
  const nextReview = now + (intervals[rating] || 7) * dayInMs;
  
  return {
    nextReview: new Date(nextReview),
    interval: intervals[rating] || 7,
    ease: card.ease || 2.5
  };
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, payload, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'CLEAN_TEXT':
        result = cleanJapaneseText(payload.text);
        break;
        
      case 'BATCH_CLEAN_TEXTS':
        result = payload.texts.map(cleanJapaneseText);
        break;
        
      case 'VALIDATE_EXAMPLE':
        result = isValidExample(payload.example);
        break;
        
      case 'SEARCH_TATOEBA':
        result = await searchTatoebaInWorker(payload.word, payload.limit);
        break;
        
      case 'BATCH_SEARCH_TATOEBA':
        const results = new Map();
        for (const word of payload.words) {
          const examples = await searchTatoebaInWorker(word, payload.limitPerWord || 3);
          results.set(word, examples);
        }
        result = Array.from(results.entries());
        break;
        
      case 'PROCESS_VOCABULARY':
        result = batchProcessVocabulary(payload.items);
        break;
        
      case 'CALCULATE_FSRS':
        result = calculateFSRSSchedule(payload.card, payload.rating);
        break;
        
      case 'CLEAR_CACHE':
        tatoebaCache.indexChunks.clear();
        tatoebaCache.exampleChunks.clear();
        result = { success: true };
        break;
        
      case 'GET_CACHE_SIZE':
        result = {
          indexChunks: tatoebaCache.indexChunks.size,
          exampleChunks: tatoebaCache.exampleChunks.size
        };
        break;
        
      default:
        throw new Error(`Unknown worker action: ${type}`);
    }
    
    self.postMessage({ 
      type: 'SUCCESS', 
      payload: result, 
      id 
    });
    
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      payload: { 
        message: error.message,
        stack: error.stack
      }, 
      id 
    });
  }
});

// Initial setup
self.postMessage({ 
  type: 'READY', 
  payload: { version: WORKER_VERSION } 
});