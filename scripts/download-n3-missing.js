#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Google TTS API configuration
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;

// Voice configuration - using female voice as in the app
const VOICE_CONFIG = {
  languageCode: 'ja-JP',
  name: 'ja-JP-Neural2-B', // Female voice
};

// Audio configuration
const AUDIO_CONFIG = {
  audioEncoding: 'MP3',
  speakingRate: 1.0,
  pitch: 0.0,
  volumeGainDb: 0.0,
};

// Output directories
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'kanji');

// Batch configuration
const BATCH_SIZE = 20;
const BATCH_DELAY = 5000;
const REQUEST_DELAY = 200;

// Progress tracking
let progressFile = path.join(__dirname, 'jlpt-kanji-audio-progress.json');

// Load JLPT N3 kanji data
function loadN3Kanji() {
  const kanjiData = [];

  // Load N3 files
  const n3Dir = path.join(__dirname, '..', 'kanji_data');
  const n3Folders = fs.readdirSync(n3Dir).filter(f => f.startsWith('jlpt_3'));
  n3Folders.forEach(folder => {
    const filePath = path.join(n3Dir, folder, `${folder}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      kanjiData.push(...data.map(k => ({ ...k, level: 'N3' })));
    }
  });

  // Fix typo in folder name
  const typoPath = path.join(n3Dir, 'jlp_3_1', 'jlpt_3_1.json');
  if (fs.existsSync(typoPath)) {
    const data = JSON.parse(fs.readFileSync(typoPath, 'utf8'));
    kanjiData.push(...data.map(k => ({ ...k, level: 'N3' })));
  }

  return kanjiData;
}

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Load progress
function loadProgress() {
  if (fs.existsSync(progressFile)) {
    return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
  }
  return {
    completed: [],
    failed: [],
    lastLevel: null,
    lastIndex: 0
  };
}

// Save progress
function saveProgress(progress) {
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
}

// Generate audio using Google TTS API
async function generateAudio(text, outputPath) {
  const requestData = {
    input: { text },
    voice: VOICE_CONFIG,
    audioConfig: AUDIO_CONFIG,
  };

  const postData = JSON.stringify(requestData);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'texttospeech.googleapis.com',
      path: `/v1/text:synthesize?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            reject(new Error(`API Error: ${response.error.message}`));
            return;
          }

          // Decode base64 audio content
          const audioContent = Buffer.from(response.audioContent, 'base64');
          
          // Write to file
          fs.writeFileSync(outputPath, audioContent);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process a batch of missing readings
async function processBatch(missingItems, levelDirs, progress) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const item of missingItems) {
    console.log(`\n  Processing: ${item.kanji} ${item.type} ${item.reading}`);
    
    try {
      await generateAudio(item.reading, item.path);
      console.log(`    ✓ Saved: ${item.relativePath}`);
      progress.completed.push(item.id);
      results.success++;
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
      progress.failed.push({ id: item.id, error: error.message });
      results.failed++;
    }
    
    await sleep(REQUEST_DELAY);
    
    // Save progress after each item
    saveProgress(progress);
  }

  return results;
}

// Main execution
async function main() {
  console.log('🎌 N3 Missing Readings Downloader\n');

  if (!API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_TTS_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Loading N3 kanji data...\n');
  const n3Kanji = loadN3Kanji();
  console.log(`Found ${n3Kanji.length} N3 kanji\n`);

  // Load progress
  const progress = loadProgress();
  console.log(`Progress: ${progress.completed.length} completed, ${progress.failed.length} failed\n`);

  // Create level directories
  const levelDirs = {
    character: path.join(OUTPUT_DIR, 'n3', 'character'),
    onyomi: path.join(OUTPUT_DIR, 'n3', 'onyomi'),
    kunyomi: path.join(OUTPUT_DIR, 'n3', 'kunyomi'),
  };

  Object.values(levelDirs).forEach(dir => ensureDirectoryExists(dir));

  // Find missing readings
  const missingItems = [];
  
  for (const kanji of n3Kanji) {
    // Check onyomi
    if (kanji.onyomi && kanji.onyomi.length > 0) {
      for (const reading of kanji.onyomi) {
        if (!reading || reading === 'n/a') continue;
        
        const onId = `N3_${kanji.kanji}_on_${reading}`;
        if (!progress.completed.includes(onId)) {
          const onPath = path.join(levelDirs.onyomi, `${kanji.kanji}_${reading}.mp3`);
          missingItems.push({
            id: onId,
            kanji: kanji.kanji,
            reading: reading,
            type: 'onyomi',
            path: onPath,
            relativePath: `onyomi/${kanji.kanji}_${reading}.mp3`
          });
        }
      }
    }

    // Check kunyomi
    if (kanji.kunyomi && kanji.kunyomi.length > 0) {
      for (const reading of kanji.kunyomi) {
        if (!reading || reading === 'n/a') continue;
        
        const kunId = `N3_${kanji.kanji}_kun_${reading}`;
        if (!progress.completed.includes(kunId)) {
          const kunPath = path.join(levelDirs.kunyomi, `${kanji.kanji}_${reading}.mp3`);
          missingItems.push({
            id: kunId,
            kanji: kanji.kanji,
            reading: reading,
            type: 'kunyomi',
            path: kunPath,
            relativePath: `kunyomi/${kanji.kanji}_${reading}.mp3`
          });
        }
      }
    }
  }

  console.log(`Found ${missingItems.length} missing readings to download\n`);

  if (missingItems.length === 0) {
    console.log('✅ All N3 readings are already downloaded!');
    return;
  }

  // Process in batches
  const totalBatches = Math.ceil(missingItems.length / BATCH_SIZE);
  
  for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = missingItems.slice(i, i + BATCH_SIZE);
    
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} items)`);
    
    const results = await processBatch(batch, levelDirs, progress);
    
    console.log(`Results: ${results.success} downloaded, ${results.failed} failed`);
    
    // Wait between batches (except for the last batch)
    if (i + BATCH_SIZE < missingItems.length) {
      console.log(`⏸️  Waiting ${BATCH_DELAY/1000} seconds before next batch...`);
      await sleep(BATCH_DELAY);
    }
  }

  // Final report
  console.log('\n✅ Download complete!\n');
  console.log(`Total missing items processed: ${missingItems.length}`);
  console.log(`Successfully downloaded: ${missingItems.filter(item => progress.completed.includes(item.id)).length}`);
  console.log(`Failed: ${missingItems.filter(item => progress.failed.some(f => f.id === item.id)).length}`);
}

// Run the script
main().catch(console.error);