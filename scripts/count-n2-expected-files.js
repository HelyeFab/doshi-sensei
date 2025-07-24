const fs = require('fs');
const path = require('path');

// Files to check for N2 kanji
const n2Files = [
    'jlpt_2/jlpt_2.json',
    'jlpt_2_1/jlpt_2_1.json',
    'jlpt_2_2/jlpt_2_2.json',
    'jlpt_2_3/jlpt_2_3.json'
];

let totalKanji = 0;
let totalOnyomi = 0;
let totalKunyomi = 0;
let kanjiDetails = [];

console.log('Counting N2 kanji audio requirements...\n');

n2Files.forEach(file => {
    const filePath = path.join(__dirname, '../kanji_data', file);
    
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const fileKanji = data.length;
        let fileOnyomi = 0;
        let fileKunyomi = 0;
        
        data.forEach(kanji => {
            fileOnyomi += kanji.onyomi.length;
            fileKunyomi += kanji.kunyomi.length;
            
            // Store details for each kanji
            kanjiDetails.push({
                kanji: kanji.kanji,
                onyomiCount: kanji.onyomi.length,
                kunyomiCount: kanji.kunyomi.length,
                totalFiles: 1 + kanji.onyomi.length + kanji.kunyomi.length
            });
        });
        
        console.log(`${file}:`);
        console.log(`  Kanji: ${fileKanji}`);
        console.log(`  Onyomi: ${fileOnyomi}`);
        console.log(`  Kunyomi: ${fileKunyomi}`);
        console.log(`  Subtotal files: ${fileKanji + fileOnyomi + fileKunyomi}\n`);
        
        totalKanji += fileKanji;
        totalOnyomi += fileOnyomi;
        totalKunyomi += fileKunyomi;
        
    } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
    }
});

const totalExpectedFiles = totalKanji + totalOnyomi + totalKunyomi;

console.log('=== SUMMARY ===');
console.log(`Total N2 kanji: ${totalKanji}`);
console.log(`Total onyomi readings: ${totalOnyomi}`);
console.log(`Total kunyomi readings: ${totalKunyomi}`);
console.log(`\nTOTAL EXPECTED AUDIO FILES: ${totalExpectedFiles}`);

// Show some examples
console.log('\n=== SAMPLE KANJI BREAKDOWN ===');
kanjiDetails.slice(0, 5).forEach(k => {
    console.log(`${k.kanji}: ${k.totalFiles} files (1 character + ${k.onyomiCount} onyomi + ${k.kunyomiCount} kunyomi)`);
});

// Find kanji with most readings
const maxReadings = kanjiDetails.reduce((max, k) => k.totalFiles > max.totalFiles ? k : max);
console.log(`\nKanji with most files needed: ${maxReadings.kanji} (${maxReadings.totalFiles} files)`);