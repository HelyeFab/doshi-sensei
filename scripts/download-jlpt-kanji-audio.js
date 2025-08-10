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

// Batch configuration
const BATCH_SIZE = 10; // Process 10 kanji at a time (each kanji = ~5 audio files)
const BATCH_DELAY = 10000; // 10 second delay between batches
const REQUEST_DELAY = 300; // 300ms delay between individual requests

// Progress tracking
let progressFile = path.join(__dirname, 'jlpt-kanji-audio-progress.json');

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
    if (!progress.completed.includes(kanjiId) && !progress.failed.includes(kanjiId)) {
      const fileName = `${kanji.kanji}.mp3`;
      const filePath = path.join(levelDirs.character, fileName);

      try {
        console.log(`    ↓ Kanji character: ${kanji.kanji}`);
        await generateAudio(kanji.kanji, filePath);
        console.log(`    ✓ Saved: character/${fileName}`);
        progress.completed.push(kanjiId);
        results.success++;
      } catch (error) {
        console.error(`    ✗ Error: ${error.message}`);
        progress.failed.push(kanjiId);
        results.failed++;
      }
      saveProgress(progress);
      await sleep(REQUEST_DELAY);
    } else {
      results.skipped++;
    }

    // 2. Download onyomi readings
    for (const onyomi of kanji.onyomi || []) {
      const onyomiId = `${kanji.level}_${kanji.kanji}_on_${onyomi}`;
      if (!progress.completed.includes(onyomiId) && !progress.failed.includes(onyomiId)) {
        // Create safe filename (replace special chars)
        const safeOnyomi = onyomi.replace(/[\/\\?%*:|"<>]/g, '_');
        const fileName = `${kanji.kanji}_${safeOnyomi}.mp3`;
        const filePath = path.join(levelDirs.onyomi, fileName);

        try {
          console.log(`    ↓ Onyomi: ${onyomi}`);
          await generateAudio(onyomi, filePath);
          console.log(`    ✓ Saved: onyomi/${fileName}`);
          progress.completed.push(onyomiId);
          results.success++;
        } catch (error) {
          console.error(`    ✗ Error: ${error.message}`);
          progress.failed.push(onyomiId);
          results.failed++;
        }
        saveProgress(progress);
        await sleep(REQUEST_DELAY);
      } else {
        results.skipped++;
      }
    }

    // 3. Download kunyomi readings
    for (const kunyomi of kanji.kunyomi || []) {
      const kunyomiId = `${kanji.level}_${kanji.kanji}_kun_${kunyomi}`;
      if (!progress.completed.includes(kunyomiId) && !progress.failed.includes(kunyomiId)) {
        // Create safe filename (replace special chars)
        const safeKunyomi = kunyomi.replace(/[\/\\?%*:|"<>]/g, '_');
        const fileName = `${kanji.kanji}_${safeKunyomi}.mp3`;
        const filePath = path.join(levelDirs.kunyomi, fileName);

        try {
          console.log(`    ↓ Kunyomi: ${kunyomi}`);
          await generateAudio(kunyomi, filePath);
          console.log(`    ✓ Saved: kunyomi/${fileName}`);
          progress.completed.push(kunyomiId);
          results.success++;
        } catch (error) {
          console.error(`    ✗ Error: ${error.message}`);
          progress.failed.push(kunyomiId);
          results.failed++;
        }
        saveProgress(progress);
        await sleep(REQUEST_DELAY);
      } else {
        results.skipped++;
      }
    }
  }

  return results;
}

// Main function to download all JLPT kanji audio
async function downloadAllKanjiAudio() {
  if (!API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_TTS_API_KEY not found in environment variables');
    console.error('Please add it to your .env or .env.local file');
    process.exit(1);
  }

  console.log('🎌 JLPT Kanji Audio Downloader\n');
  console.log('Loading kanji data...');

  const kanjiData = loadJLPTKanji();
  const totalKanji = Object.values(kanjiData).reduce((sum, level) => sum + level.length, 0);

  console.log(`\nFound ${totalKanji} kanji across all JLPT levels:`);
  let totalReadings = 0;
  Object.entries(kanjiData).forEach(([level, levelKanji]) => {
    let levelReadings = 0;
    levelKanji.forEach(k => {
      levelReadings += 1 + (k.onyomi?.length || 0) + (k.kunyomi?.length || 0);
    });
    totalReadings += levelReadings;
    console.log(`  ${level}: ${levelKanji.length} kanji (~${levelReadings} audio files)`);
  });
  
  console.log(`\nTotal audio files to download: ~${totalReadings}`);
  const estimatedTime = Math.ceil((totalReadings * REQUEST_DELAY / 1000 / 60) + (totalKanji / BATCH_SIZE * BATCH_DELAY / 1000 / 60));
  console.log(`Estimated time: ~${estimatedTime} minutes (not including retries)`);
  console.log(`\nTip: This script supports resuming. You can stop and restart at any time.`);

  // Create output directory
  ensureDirectoryExists(OUTPUT_DIR);

  // Load progress
  const progress = loadProgress();
  console.log(`\nProgress: ${progress.completed.length} completed, ${progress.failed.length} failed`);

  // Process each level
  const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
  let totalStats = {
    success: 0,
    failed: 0,
    skipped: 0
  };

  for (const level of levels) {
    const levelKanji = kanjiData[level];
    if (levelKanji.length === 0) continue;

    // Skip levels that are already complete
    const levelCompleted = levelKanji.every(k => 
      progress.completed.includes(`${level}_${k.kanji}`)
    );
    if (levelCompleted) {
      console.log(`\n✓ ${level} already complete, skipping...`);
      totalStats.skipped += levelKanji.length;
      continue;
    }

    console.log(`\n📚 Processing ${level} (${levelKanji.length} kanji)`);
    
    // Create subdirectories for each type of audio
    const levelDir = path.join(OUTPUT_DIR, level.toLowerCase());
    const levelDirs = {
      character: path.join(levelDir, 'character'),
      onyomi: path.join(levelDir, 'onyomi'),
      kunyomi: path.join(levelDir, 'kunyomi')
    };
    
    ensureDirectoryExists(levelDir);
    ensureDirectoryExists(levelDirs.character);
    ensureDirectoryExists(levelDirs.onyomi);
    ensureDirectoryExists(levelDirs.kunyomi);

    // Process in batches
    for (let i = 0; i < levelKanji.length; i += BATCH_SIZE) {
      const batch = levelKanji.slice(i, Math.min(i + BATCH_SIZE, levelKanji.length));
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(levelKanji.length / BATCH_SIZE);

      console.log(`\n  Batch ${batchNum}/${totalBatches} (${batch.length} kanji)`);
      
      const batchResults = await processBatch(batch, levelDirs, progress);
      totalStats.success += batchResults.success;
      totalStats.failed += batchResults.failed;
      totalStats.skipped += batchResults.skipped;

      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < levelKanji.length) {
        console.log(`  ⏸️  Waiting ${BATCH_DELAY / 1000} seconds before next batch...`);
        await sleep(BATCH_DELAY);
      }
    }
  }

  // Create index file
  console.log('\n📝 Creating index file...');
  const index = {};
  
  levels.forEach(level => {
    index[level] = {
      characters: {},
      onyomi: {},
      kunyomi: {}
    };
    
    const levelDir = path.join(OUTPUT_DIR, level.toLowerCase());
    
    // Index character audio files
    const charDir = path.join(levelDir, 'character');
    if (fs.existsSync(charDir)) {
      const files = fs.readdirSync(charDir).filter(f => f.endsWith('.mp3'));
      files.forEach(file => {
        const kanji = file.replace('.mp3', '');
        index[level].characters[kanji] = `/audio/kanji/${level.toLowerCase()}/character/${file}`;
      });
    }
    
    // Index onyomi audio files
    const onDir = path.join(levelDir, 'onyomi');
    if (fs.existsSync(onDir)) {
      const files = fs.readdirSync(onDir).filter(f => f.endsWith('.mp3'));
      files.forEach(file => {
        // Extract kanji and reading from filename
        const match = file.match(/^(.+?)_(.+?)\.mp3$/);
        if (match) {
          const [, kanji, reading] = match;
          if (!index[level].onyomi[kanji]) {
            index[level].onyomi[kanji] = {};
          }
          index[level].onyomi[kanji][reading] = `/audio/kanji/${level.toLowerCase()}/onyomi/${file}`;
        }
      });
    }
    
    // Index kunyomi audio files
    const kunDir = path.join(levelDir, 'kunyomi');
    if (fs.existsSync(kunDir)) {
      const files = fs.readdirSync(kunDir).filter(f => f.endsWith('.mp3'));
      files.forEach(file => {
        // Extract kanji and reading from filename
        const match = file.match(/^(.+?)_(.+?)\.mp3$/);
        if (match) {
          const [, kanji, reading] = match;
          if (!index[level].kunyomi[kanji]) {
            index[level].kunyomi[kanji] = {};
          }
          index[level].kunyomi[kanji][reading] = `/audio/kanji/${level.toLowerCase()}/kunyomi/${file}`;
        }
      });
    }
  });

  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`✓ Created index file: ${indexPath}`);

  // Final summary
  console.log('\n=== Download Complete ===');
  console.log(`✓ Successfully downloaded: ${totalStats.success} files`);
  console.log(`✗ Failed: ${totalStats.failed} files`);
  console.log(`⏭️  Skipped: ${totalStats.skipped} files`);
  console.log(`📁 Audio files saved to: ${OUTPUT_DIR}`);
  
  if (totalStats.failed > 0) {
    console.log('\n⚠️  Some downloads failed. You can run the script again to retry.');
    console.log('   Failed downloads are tracked in:', progressFile);
  }

  // Clean up progress file if everything is complete
  if (totalStats.failed === 0 && totalStats.success + totalStats.skipped === totalKanji) {
    fs.unlinkSync(progressFile);
    console.log('\n✨ All downloads complete! Progress file removed.');
  }
}

// Run the script
downloadAllKanjiAudio().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});