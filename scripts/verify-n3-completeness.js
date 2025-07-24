#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load N3 kanji data
function loadN3Kanji() {
  const kanjiData = [];
  const n3Dir = path.join(__dirname, '..', 'kanji_data');
  
  // Load all N3 folders
  const n3Folders = fs.readdirSync(n3Dir).filter(f => f.startsWith('jlpt_3'));
  n3Folders.forEach(folder => {
    const filePath = path.join(n3Dir, folder, `${folder}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      kanjiData.push(...data.map(k => ({ ...k, level: 'N3' })));
    }
  });

  // Check typo folder
  const typoPath = path.join(n3Dir, 'jlp_3_1', 'jlpt_3_1.json');
  if (fs.existsSync(typoPath)) {
    const data = JSON.parse(fs.readFileSync(typoPath, 'utf8'));
    kanjiData.push(...data.map(k => ({ ...k, level: 'N3' })));
  }

  return kanjiData;
}

// Main check
const n3Kanji = loadN3Kanji();
console.log(`Total N3 kanji: ${n3Kanji.length}`);

let totalExpectedFiles = 0;
let expectedCharFiles = 0;
let expectedOnFiles = 0;
let expectedKunFiles = 0;

n3Kanji.forEach(kanji => {
  // Character file
  expectedCharFiles++;
  totalExpectedFiles++;
  
  // Onyomi files
  if (kanji.onyomi && kanji.onyomi.length > 0) {
    kanji.onyomi.forEach(reading => {
      if (reading && reading !== 'n/a') {
        expectedOnFiles++;
        totalExpectedFiles++;
      }
    });
  }
  
  // Kunyomi files
  if (kanji.kunyomi && kanji.kunyomi.length > 0) {
    kanji.kunyomi.forEach(reading => {
      if (reading && reading !== 'n/a') {
        expectedKunFiles++;
        totalExpectedFiles++;
      }
    });
  }
});

console.log(`\nExpected files:`);
console.log(`  Character: ${expectedCharFiles}`);
console.log(`  Onyomi: ${expectedOnFiles}`);
console.log(`  Kunyomi: ${expectedKunFiles}`);
console.log(`  Total: ${totalExpectedFiles}`);

// Check actual files
const audioDir = path.join(__dirname, '..', 'public', 'audio', 'kanji', 'n3');
const charFiles = fs.existsSync(path.join(audioDir, 'character')) ? 
  fs.readdirSync(path.join(audioDir, 'character')).filter(f => f.endsWith('.mp3')).length : 0;
const onFiles = fs.existsSync(path.join(audioDir, 'onyomi')) ? 
  fs.readdirSync(path.join(audioDir, 'onyomi')).filter(f => f.endsWith('.mp3')).length : 0;
const kunFiles = fs.existsSync(path.join(audioDir, 'kunyomi')) ? 
  fs.readdirSync(path.join(audioDir, 'kunyomi')).filter(f => f.endsWith('.mp3')).length : 0;

console.log(`\nActual files:`);
console.log(`  Character: ${charFiles}`);
console.log(`  Onyomi: ${onFiles}`);
console.log(`  Kunyomi: ${kunFiles}`);
console.log(`  Total: ${charFiles + onFiles + kunFiles}`);

console.log(`\nMissing:`);
console.log(`  Character: ${expectedCharFiles - charFiles}`);
console.log(`  Onyomi: ${expectedOnFiles - onFiles}`);
console.log(`  Kunyomi: ${expectedKunFiles - kunFiles}`);
console.log(`  Total: ${totalExpectedFiles - (charFiles + onFiles + kunFiles)}`);

// Load progress file to check
const progressFile = path.join(__dirname, 'jlpt-kanji-audio-progress.json');
const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
const n3Progress = progress.completed.filter(id => id.startsWith('N3_'));
console.log(`\nProgress file shows ${n3Progress.length} N3 entries completed`);

// Sample check - show first few kanji with missing readings
console.log(`\nSample of kanji that should have readings:`);
let sampleCount = 0;
for (const kanji of n3Kanji) {
  if (sampleCount >= 5) break;
  
  const charId = `N3_${kanji.kanji}_char`;
  const hasChar = n3Progress.includes(charId);
  
  let missingOn = [];
  if (kanji.onyomi && kanji.onyomi.length > 0) {
    kanji.onyomi.forEach(reading => {
      if (reading && reading !== 'n/a') {
        const onId = `N3_${kanji.kanji}_on_${reading}`;
        if (!n3Progress.includes(onId)) {
          missingOn.push(reading);
        }
      }
    });
  }
  
  let missingKun = [];
  if (kanji.kunyomi && kanji.kunyomi.length > 0) {
    kanji.kunyomi.forEach(reading => {
      if (reading && reading !== 'n/a') {
        const kunId = `N3_${kanji.kanji}_kun_${reading}`;
        if (!n3Progress.includes(kunId)) {
          missingKun.push(reading);
        }
      }
    });
  }
  
  if (missingOn.length > 0 || missingKun.length > 0) {
    console.log(`\n${kanji.kanji} (${kanji.meaning}):`);
    if (missingOn.length > 0) console.log(`  Missing onyomi: ${missingOn.join(', ')}`);
    if (missingKun.length > 0) console.log(`  Missing kunyomi: ${missingKun.join(', ')}`);
    sampleCount++;
  }
}