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

// Audio directory
const audioDir = path.join(__dirname, '../public/audio/kanji/n1');

// Function to generate expected filenames
function generateExpectedFiles(kanji) {
  const files = [];
  
  // Character pronunciation
  files.push(`${kanji.kanji}_char.mp3`);
  
  // Onyomi readings
  if (kanji.onyomi && kanji.onyomi.length > 0) {
    kanji.onyomi.forEach(reading => {
      files.push(`${kanji.kanji}_on_${reading}.mp3`);
    });
  }
  
  // Kunyomi readings
  if (kanji.kunyomi && kanji.kunyomi.length > 0) {
    kanji.kunyomi.forEach(reading => {
      files.push(`${kanji.kanji}_kun_${reading}.mp3`);
    });
  }
  
  return files;
}

// Check if audio directory exists
if (!fs.existsSync(audioDir)) {
  console.log(`Audio directory does not exist: ${audioDir}`);
  process.exit(1);
}

// Get list of actual files in the directory
const actualFiles = fs.readdirSync(audioDir);
console.log(`Total files in N1 audio directory: ${actualFiles.length}`);

// Generate all expected files and check which ones are missing
const missingFiles = [];
let totalExpected = 0;

n1Kanji.forEach(kanji => {
  const expectedFiles = generateExpectedFiles(kanji);
  totalExpected += expectedFiles.length;
  
  expectedFiles.forEach(filename => {
    if (!actualFiles.includes(filename)) {
      missingFiles.push({
        character: kanji.kanji,
        filename: filename,
        type: filename.includes('_char') ? 'character' : 
              filename.includes('_on_') ? 'onyomi' : 'kunyomi',
        reading: filename.includes('_on_') ? filename.split('_on_')[1].replace('.mp3', '') :
                 filename.includes('_kun_') ? filename.split('_kun_')[1].replace('.mp3', '') : null
      });
    }
  });
});

console.log(`\nTotal expected files: ${totalExpected}`);
console.log(`Total missing files: ${missingFiles.length}`);
console.log(`Percentage complete: ${((totalExpected - missingFiles.length) / totalExpected * 100).toFixed(2)}%`);

if (missingFiles.length > 0) {
  console.log('\nMissing files:');
  console.log('==============');
  
  // Group by character
  const byCharacter = {};
  missingFiles.forEach(file => {
    if (!byCharacter[file.character]) {
      byCharacter[file.character] = [];
    }
    byCharacter[file.character].push(file);
  });
  
  // Display missing files grouped by character
  Object.keys(byCharacter).slice(0, 20).forEach(char => {
    console.log(`\n${char} (${byCharacter[char].length} files):`);
    byCharacter[char].forEach(file => {
      console.log(`  - ${file.filename} (${file.type}${file.reading ? ': ' + file.reading : ''})`);
    });
  });
  
  if (Object.keys(byCharacter).length > 20) {
    console.log(`\n... and ${Object.keys(byCharacter).length - 20} more characters with missing files`);
  }
  
  // Write full list to a file
  const outputPath = path.join(__dirname, 'missing-n1-audio-files.json');
  fs.writeFileSync(outputPath, JSON.stringify(missingFiles, null, 2));
  console.log(`\nFull list of missing files written to: ${outputPath}`);
} else {
  console.log('\nAll expected N1 audio files are present!');
}