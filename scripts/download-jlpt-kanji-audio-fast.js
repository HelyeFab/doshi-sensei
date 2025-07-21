#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Google TTS API configuration
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
const API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

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

// Batch configuration - FASTER VERSION
const BATCH_SIZE = 20; // Process 20 kanji at a time (double the original)
const BATCH_DELAY = 5000; // 5 second delay between batches (half the original)
const REQUEST_DELAY = 200; // 200ms delay between individual requests (faster)

// Progress tracking
let progressFile = path.join(__dirname, 'jlpt-kanji-audio-progress.json');

// Parse command line arguments
const args = process.argv.slice(2);
const levelFilter = args[0]?.toUpperCase(); // e.g., N3, N2, N1

// Load JLPT kanji data
function loadJLPTKanji() {
  const kanjiData = {
    N5: [],
    N4: [],
    N3: [],
    N2: [],
    N1: []
  };

  // Load N5
  const n5Data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'kanji_data', 'jlpt_5', 'jlpt_5.json'), 'utf8'));
  kanjiData.N5 = n5Data.map(k => ({ ...k, level: 'N5' }));

  // Load N4 (main + split files)
  const n4Files = ['jlpt_4/jlpt_4.json', 'jlpt_4_1/jlpt_4_1.json'];
  n4Files.forEach(file => {
    const filePath = path.join(__dirname, '..', 'kanji_data', file);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      kanjiData.N4.push(...data.map(k => ({ ...k, level: 'N4' })));
    }
  });

  // Load N3 (main + split files)
  const n3Dir = path.join(__dirname, '..', 'kanji_data');
  const n3Folders = fs.readdirSync(n3Dir).filter(f => f.startsWith('jlpt_3'));
  n3Folders.forEach(folder => {
    const filePath = path.join(n3Dir, folder, `${folder}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      kanjiData.N3.push(...data.map(k => ({ ...k, level: 'N3' })));
    }
  });

  // Load N2 (main + split files)
  const n2Folders = fs.readdirSync(n3Dir).filter(f => f.startsWith('jlpt_2'));
  n2Folders.forEach(folder => {
    const filePath = path.join(n3Dir, folder, `${folder}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      kanjiData.N2.push(...data.map(k => ({ ...k, level: 'N2' })));
    }
  });

  // Load N1 (main + split files)
  const n1Folders = fs.readdirSync(n3Dir).filter(f => f.startsWith('jlpt_1'));
  n1Folders.forEach(folder => {
    const filePath = path.join(n3Dir, folder, `${folder}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      kanjiData.N1.push(...data.map(k => ({ ...k, level: 'N1' })));
    }
  });

  // Fix typo in folder name
  const typoPath = path.join(n3Dir, 'jlp_3_1', 'jlpt_3_1.json');
  if (fs.existsSync(typoPath)) {
    const data = JSON.parse(fs.readFileSync(typoPath, 'utf8'));
    kanjiData.N3.push(...data.map(k => ({ ...k, level: 'N3' })));
  }

  return kanjiData;
}

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
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

// Process a batch of kanji
async function processBatch(kanjiList, levelDirs, progress) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const kanji of kanjiList) {
    console.log(`\n  Processing: ${kanji.kanji} (${kanji.meaning})`);
    
    // 1. Download kanji character audio
    const kanjiId = `${kanji.level}_${kanji.kanji}_char`;
    if (!progress.completed.includes(kanjiId)) {
      const kanjiPath = path.join(levelDirs.character, `${kanji.kanji}.mp3`);
      console.log(`    ↓ Kanji character: ${kanji.kanji}`);
      
      try {
        await generateAudio(kanji.kanji, kanjiPath);
        console.log(`    ✓ Saved: character/${kanji.kanji}.mp3`);
        progress.completed.push(kanjiId);
        results.success++;
      } catch (error) {
        console.error(`    ✗ Failed: ${error.message}`);
        progress.failed.push({ id: kanjiId, error: error.message });
        results.failed++;
      }
      
      await sleep(REQUEST_DELAY);
    } else {
      results.skipped++;
    }

    // 2. Download onyomi (Chinese readings)
    // Check both field names for compatibility
    const onyomiReadings = kanji.onyomi || kanji.on || [];
    if (onyomiReadings.length > 0) {
      for (const reading of onyomiReadings) {
        if (!reading || reading === 'n/a') continue;
        
        const onId = `${kanji.level}_${kanji.kanji}_on_${reading}`;
        if (!progress.completed.includes(onId)) {
          const onPath = path.join(levelDirs.onyomi, `${kanji.kanji}_${reading}.mp3`);
          console.log(`    ↓ Onyomi: ${reading}`);
          
          try {
            await generateAudio(reading, onPath);
            console.log(`    ✓ Saved: onyomi/${kanji.kanji}_${reading}.mp3`);
            progress.completed.push(onId);
            results.success++;
          } catch (error) {
            console.error(`    ✗ Failed: ${error.message}`);
            progress.failed.push({ id: onId, error: error.message });
            results.failed++;
          }
          
          await sleep(REQUEST_DELAY);
        } else {
          results.skipped++;
        }
      }
    }

    // 3. Download kunyomi (Japanese readings)
    // Check both field names for compatibility
    const kunyomiReadings = kanji.kunyomi || kanji.kun || [];
    if (kunyomiReadings.length > 0) {
      for (const reading of kunyomiReadings) {
        if (!reading || reading === 'n/a') continue;
        
        const kunId = `${kanji.level}_${kanji.kanji}_kun_${reading}`;
        if (!progress.completed.includes(kunId)) {
          const kunPath = path.join(levelDirs.kunyomi, `${kanji.kanji}_${reading}.mp3`);
          console.log(`    ↓ Kunyomi: ${reading}`);
          
          try {
            await generateAudio(reading, kunPath);
            console.log(`    ✓ Saved: kunyomi/${kanji.kanji}_${reading}.mp3`);
            progress.completed.push(kunId);
            results.success++;
          } catch (error) {
            console.error(`    ✗ Failed: ${error.message}`);
            progress.failed.push({ id: kunId, error: error.message });
            results.failed++;
          }
          
          await sleep(REQUEST_DELAY);
        } else {
          results.skipped++;
        }
      }
    }

    // Save progress after each kanji
    saveProgress(progress);
  }

  return results;
}

// Main execution
async function main() {
  console.log('🎌 JLPT Kanji Audio Downloader - FAST VERSION\n');

  if (!API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_TTS_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('Loading kanji data...\n');
  const allKanji = loadJLPTKanji();
  
  // Filter by level if specified
  let levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  if (levelFilter && levels.includes(levelFilter)) {
    levels = [levelFilter];
    console.log(`Filtering for level ${levelFilter} only\n`);
  }

  // Calculate totals
  let totalKanji = 0;
  let totalFiles = 0;
  levels.forEach(level => {
    const kanjiCount = allKanji[level].length;
    const filesPerLevel = allKanji[level].reduce((sum, k) => {
      return sum + 1 + (k.on?.length || 0) + (k.kun?.length || 0);
    }, 0);
    totalKanji += kanjiCount;
    totalFiles += filesPerLevel;
    console.log(`  ${level}: ${kanjiCount} kanji (~${filesPerLevel} audio files)`);
  });

  console.log(`\nTotal: ${totalKanji} kanji (~${totalFiles} audio files)`);
  console.log(`Estimated time: ~${Math.ceil(totalFiles * REQUEST_DELAY / 1000 / 60)} minutes`);
  console.log('\nFAST MODE: Larger batches, shorter delays\n');

  // Load progress
  const progress = loadProgress();
  console.log(`Progress: ${progress.completed.length} completed, ${progress.failed.length} failed\n`);

  // Process each level
  for (const level of levels) {
    const kanjiList = allKanji[level];
    if (kanjiList.length === 0) continue;

    // Skip completed levels
    const levelCompleted = kanjiList.every(k => {
      const charId = `${level}_${k.kanji}_char`;
      return progress.completed.includes(charId);
    });
    
    if (levelCompleted && !levelFilter) {
      console.log(`📚 Skipping ${level} (already completed)\n`);
      continue;
    }

    console.log(`📚 Processing ${level} (${kanjiList.length} kanji)\n`);

    // Create level directories
    const levelDir = level.toLowerCase();
    const levelDirs = {
      character: path.join(OUTPUT_DIR, levelDir, 'character'),
      onyomi: path.join(OUTPUT_DIR, levelDir, 'onyomi'),
      kunyomi: path.join(OUTPUT_DIR, levelDir, 'kunyomi'),
    };

    Object.values(levelDirs).forEach(dir => ensureDirectoryExists(dir));

    // Process in batches
    const totalBatches = Math.ceil(kanjiList.length / BATCH_SIZE);
    
    for (let i = 0; i < kanjiList.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = kanjiList.slice(i, i + BATCH_SIZE);
      
      console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} kanji)`);
      
      const results = await processBatch(batch, levelDirs, progress);
      
      console.log(`  Results: ${results.success} downloaded, ${results.failed} failed, ${results.skipped} skipped`);
      
      // Wait between batches (except for the last batch)
      if (i + BATCH_SIZE < kanjiList.length) {
        console.log(`  ⏸️  Waiting ${BATCH_DELAY/1000} seconds before next batch...`);
        await sleep(BATCH_DELAY);
      }
    }
  }

  // Final report
  console.log('\n✅ Download complete!\n');
  console.log(`Total files: ${progress.completed.length}`);
  console.log(`Failed: ${progress.failed.length}`);
  
  if (progress.failed.length > 0) {
    console.log('\nFailed downloads:');
    progress.failed.forEach(f => console.log(`  - ${f.id}: ${f.error}`));
  }
}

// Run the script
main().catch(console.error);