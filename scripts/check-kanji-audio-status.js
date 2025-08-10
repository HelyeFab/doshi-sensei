#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log(`
=====================================
  JLPT Kanji Audio Download Status
=====================================
`);

// Expected counts per level
const expectedCounts = {
  N5: { kanji: 80, estimated: 351 },
  N4: { kanji: 170, estimated: 627 },
  N3: { kanji: 370, estimated: 1325 },
  N2: { kanji: 380, estimated: 1164 },
  N1: { kanji: 1136, estimated: 3057 }
};

// Check progress file
const progressPath = path.join(__dirname, 'jlpt-kanji-audio-progress.json');
let progress = { completed: [], failed: [] };
if (fs.existsSync(progressPath)) {
  progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
}

// Check actual downloaded files
const audioDir = path.join(__dirname, '..', 'public', 'audio', 'kanji');
const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];

console.log('Level | Kanji | Expected | Downloaded | Status');
console.log('------|-------|----------|------------|--------');

let totalExpected = 0;
let totalDownloaded = 0;

levels.forEach(level => {
  const levelDir = path.join(audioDir, level.toLowerCase());
  let fileCount = 0;
  
  if (fs.existsSync(levelDir)) {
    const charDir = path.join(levelDir, 'character');
    const onDir = path.join(levelDir, 'onyomi');
    const kunDir = path.join(levelDir, 'kunyomi');
    
    if (fs.existsSync(charDir)) {
      fileCount += fs.readdirSync(charDir).filter(f => f.endsWith('.mp3')).length;
    }
    if (fs.existsSync(onDir)) {
      fileCount += fs.readdirSync(onDir).filter(f => f.endsWith('.mp3')).length;
    }
    if (fs.existsSync(kunDir)) {
      fileCount += fs.readdirSync(kunDir).filter(f => f.endsWith('.mp3')).length;
    }
  }
  
  const expected = expectedCounts[level];
  const percentage = fileCount > 0 ? Math.round((fileCount / expected.estimated) * 100) : 0;
  const status = fileCount === 0 ? '❌ Not started' : 
                 fileCount >= expected.estimated ? '✅ Complete' : 
                 `⏳ ${percentage}%`;
  
  console.log(`${level.padEnd(5)} | ${expected.kanji.toString().padEnd(5)} | ${expected.estimated.toString().padEnd(8)} | ${fileCount.toString().padEnd(10)} | ${status}`);
  
  totalExpected += expected.estimated;
  totalDownloaded += fileCount;
});

console.log('\n' + '='.repeat(60));
console.log(`TOTAL | 2136  | ${totalExpected.toString().padEnd(8)} | ${totalDownloaded.toString().padEnd(10)} | ${Math.round((totalDownloaded / totalExpected) * 100)}%`);

// Progress details
const levelProgress = {};
levels.forEach(level => {
  levelProgress[level] = progress.completed.filter(id => id.startsWith(`${level}_`)).length;
});

console.log('\nProgress Tracker:');
console.log(`- Completed: ${progress.completed.length} items`);
console.log(`- Failed: ${progress.failed.length} items`);

if (progress.failed.length > 0) {
  console.log('\n⚠️  Some downloads failed. To retry, delete the progress file:');
  console.log(`   rm ${progressPath}`);
}

console.log('\nTo download a specific level:');
console.log('  node scripts/download-jlpt-level.js N4');
console.log('  node scripts/download-jlpt-level.js N3');
console.log('  (etc.)');