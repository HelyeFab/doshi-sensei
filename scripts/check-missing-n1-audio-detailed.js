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

// Audio directories
const audioBaseDir = path.join(__dirname, '../public/audio/kanji/n1');
const charDir = path.join(audioBaseDir, 'character');
const onyomiDir = path.join(audioBaseDir, 'onyomi');
const kunyomiDir = path.join(audioBaseDir, 'kunyomi');

// Get list of actual files in each directory
const getFilesInDir = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
};

const charFiles = getFilesInDir(charDir);
const onyomiFiles = getFilesInDir(onyomiDir);
const kunyomiFiles = getFilesInDir(kunyomiDir);

console.log(`Character files: ${charFiles.length}`);
console.log(`Onyomi files: ${onyomiFiles.length}`);
console.log(`Kunyomi files: ${kunyomiFiles.length}`);
console.log(`Total files: ${charFiles.length + onyomiFiles.length + kunyomiFiles.length}`);

// Check for missing files
const missingFiles = [];
let totalExpected = 0;

n1Kanji.forEach(kanji => {
  // Check character file
  const charFilename = `${kanji.kanji}.mp3`;
  totalExpected++;
  if (!charFiles.includes(charFilename)) {
    missingFiles.push({
      character: kanji.kanji,
      filename: charFilename,
      type: 'character',
      directory: 'character'
    });
  }
  
  // Check onyomi files
  if (kanji.onyomi && kanji.onyomi.length > 0) {
    kanji.onyomi.forEach(reading => {
      const filename = `${kanji.kanji}_${reading}.mp3`;
      totalExpected++;
      if (!onyomiFiles.includes(filename)) {
        missingFiles.push({
          character: kanji.kanji,
          filename: filename,
          type: 'onyomi',
          reading: reading,
          directory: 'onyomi'
        });
      }
    });
  }
  
  // Check kunyomi files
  if (kanji.kunyomi && kanji.kunyomi.length > 0) {
    kanji.kunyomi.forEach(reading => {
      const filename = `${kanji.kanji}_${reading}.mp3`;
      totalExpected++;
      if (!kunyomiFiles.includes(filename)) {
        missingFiles.push({
          character: kanji.kanji,
          filename: filename,
          type: 'kunyomi',
          reading: reading,
          directory: 'kunyomi'
        });
      }
    });
  }
});

console.log(`\nTotal expected files: ${totalExpected}`);
console.log(`Total missing files: ${missingFiles.length}`);
console.log(`Percentage complete: ${((totalExpected - missingFiles.length) / totalExpected * 100).toFixed(2)}%`);

if (missingFiles.length > 0) {
  console.log('\nMissing files:');
  console.log('==============');
  
  // Show the actual missing files
  missingFiles.forEach(file => {
    console.log(`\nMissing: ${file.directory}/${file.filename}`);
    console.log(`Character: ${file.character}`);
    if (file.reading) {
      console.log(`Reading: ${file.reading} (${file.type})`);
    }
  });
  
  // Write full list to a file
  const outputPath = path.join(__dirname, 'missing-n1-audio-files-detailed.json');
  fs.writeFileSync(outputPath, JSON.stringify(missingFiles, null, 2));
  console.log(`\nFull list of missing files written to: ${outputPath}`);
} else {
  console.log('\nAll expected N1 audio files are present!');
}