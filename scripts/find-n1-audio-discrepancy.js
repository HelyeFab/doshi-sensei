const fs = require('fs');
const path = require('path');

// Load the N1 kanji data from multiple files
const n1Kanji = [];

// Load main N1 file
const n1DataPath = path.join(__dirname, '../kanji_data/jlpt_1/jlpt_1.json');
const n1MainData = JSON.parse(fs.readFileSync(n1DataPath, 'utf8'));
n1Kanji.push(...n1MainData);

// Load N1 sub-files (jlpt_1_1 through jlpt_1_10)
for (let i = 1; i <= 10; i++) {
  const subPath = path.join(__dirname, `../kanji_data/jlpt_1_${i}/jlpt_1_${i}.json`);
  if (fs.existsSync(subPath)) {
    const subData = JSON.parse(fs.readFileSync(subPath, 'utf8'));
    n1Kanji.push(...subData);
  }
}

console.log(`Total N1 kanji loaded: ${n1Kanji.length}`);

// Count expected files using the same logic as the download script
let expectedFiles = 0;
const expectedFilesList = [];

n1Kanji.forEach(kanji => {
  // Character file
  expectedFiles++;
  expectedFilesList.push(`character/${kanji.kanji}.mp3`);
  
  // Onyomi files
  if (kanji.onyomi && kanji.onyomi.length > 0) {
    kanji.onyomi.forEach(reading => {
      expectedFiles++;
      expectedFilesList.push(`onyomi/${kanji.kanji}_${reading}.mp3`);
    });
  }
  
  // Kunyomi files
  if (kanji.kunyomi && kanji.kunyomi.length > 0) {
    kanji.kunyomi.forEach(reading => {
      expectedFiles++;
      expectedFilesList.push(`kunyomi/${kanji.kanji}_${reading}.mp3`);
    });
  }
});

console.log(`Expected files: ${expectedFiles}`);

// Check for duplicates in expected files
const duplicates = expectedFilesList.filter((item, index) => expectedFilesList.indexOf(item) !== index);
if (duplicates.length > 0) {
  console.log('\nDuplicate expected files found:');
  duplicates.forEach(dup => console.log(`  - ${dup}`));
}

// Now check the actual progress file to see what was downloaded
const progressPath = path.join(__dirname, 'jlpt-kanji-audio-progress.json');
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

// Count N1 entries in completed and failed
const n1Completed = progress.completed.filter(id => id.startsWith('N1_')).length;
const n1Failed = progress.failed.filter(item => item.id.startsWith('N1_')).length;

console.log(`\nProgress file analysis:`);
console.log(`N1 completed: ${n1Completed}`);
console.log(`N1 failed: ${n1Failed}`);
console.log(`Total N1 entries: ${n1Completed + n1Failed}`);

// Check if any N1 file is in the failed list
const n1FailedItems = progress.failed.filter(item => item.id.startsWith('N1_'));
if (n1FailedItems.length > 0) {
  console.log('\nN1 files in failed list:');
  n1FailedItems.forEach(item => {
    console.log(`  - ${item.id}`);
  });
}

// Count actual files
const audioBaseDir = path.join(__dirname, '../public/audio/kanji/n1');
const charFiles = fs.readdirSync(path.join(audioBaseDir, 'character')).filter(f => f.endsWith('.mp3'));
const onyomiFiles = fs.readdirSync(path.join(audioBaseDir, 'onyomi')).filter(f => f.endsWith('.mp3'));
const kunyomiFiles = fs.readdirSync(path.join(audioBaseDir, 'kunyomi')).filter(f => f.endsWith('.mp3'));

const totalActualFiles = charFiles.length + onyomiFiles.length + kunyomiFiles.length;
console.log(`\nActual files on disk: ${totalActualFiles}`);

// The discrepancy
console.log(`\nDiscrepancy: ${expectedFiles} expected vs ${totalActualFiles} actual = ${expectedFiles - totalActualFiles} missing`);

// Check if the discrepancy matches the download script's logic
// The download script generates IDs like: N1_${kanji}_char, N1_${kanji}_on_${reading}, N1_${kanji}_kun_${reading}
let downloadScriptExpected = 0;
n1Kanji.forEach(kanji => {
  downloadScriptExpected++; // char
  if (kanji.onyomi) downloadScriptExpected += kanji.onyomi.length;
  if (kanji.kunyomi) downloadScriptExpected += kanji.kunyomi.length;
});

console.log(`\nDownload script would expect: ${downloadScriptExpected} files`);

// Check specific discrepancies in the failed list
if (n1FailedItems.length > 0) {
  console.log('\nAnalyzing failed N1 items:');
  n1FailedItems.forEach(item => {
    // Parse the ID to understand what file it represents
    const parts = item.id.split('_');
    if (parts.length >= 3) {
      const level = parts[0];
      const kanji = parts[1];
      const type = parts[2];
      
      if (type === 'char') {
        console.log(`  - Missing character audio for: ${kanji}`);
      } else if (type === 'on') {
        const reading = parts.slice(3).join('_');
        console.log(`  - Missing onyomi audio for: ${kanji} (${reading})`);
      } else if (type === 'kun') {
        const reading = parts.slice(3).join('_');
        console.log(`  - Missing kunyomi audio for: ${kanji} (${reading})`);
      }
    }
  });
}