const fs = require('fs');
const path = require('path');
const https = require('https');

// Use the raw listing from KanjiVG repository
const KANJIVG_RAW_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

// List of all kanji unicode ranges
const KANJI_RANGES = [
  // CJK Unified Ideographs (main block)
  { start: 0x4E00, end: 0x9FFF, name: 'CJK Unified Ideographs' },
  // CJK Extension A
  { start: 0x3400, end: 0x4DBF, name: 'CJK Extension A' },
  // Additional ranges if needed
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else if (response.statusCode === 404) {
        file.close();
        fs.unlink(dest, () => {});
        resolve(false); // File doesn't exist in KanjiVG
      } else {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function testKanjiExists(codePoint) {
  const url = `${KANJIVG_RAW_URL}${codePoint}.svg`;
  
  return new Promise((resolve) => {
    https.get(url, (response) => {
      resolve(response.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function downloadAllKanjiVGSystematic() {
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'kanjivg');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('📂 Output directory:', outputDir);
  console.log('🔍 Systematically downloading all KanjiVG files...');
  
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;
  const index = {};
  
  // Load existing index if available
  const indexPath = path.join(outputDir, 'index.json');
  if (fs.existsSync(indexPath)) {
    Object.assign(index, JSON.parse(fs.readFileSync(indexPath, 'utf8')));
  }
  
  for (const range of KANJI_RANGES) {
    console.log(`\n📊 Processing ${range.name} (U+${range.start.toString(16).toUpperCase()}-U+${range.end.toString(16).toUpperCase()})`);
    
    let rangeDownloaded = 0;
    let rangeSkipped = 0;
    let rangeNotFound = 0;
    
    // Process in batches
    const batchSize = 20;
    for (let i = range.start; i <= range.end; i += batchSize) {
      const batch = [];
      
      for (let j = 0; j < batchSize && i + j <= range.end; j++) {
        const unicode = i + j;
        const codePoint = unicode.toString(16).padStart(5, '0');
        const filename = `${codePoint}.svg`;
        const dest = path.join(outputDir, filename);
        
        // Skip if already exists
        if (fs.existsSync(dest)) {
          rangeSkipped++;
          totalSkipped++;
          const kanjiChar = String.fromCharCode(unicode);
          index[kanjiChar] = codePoint;
          continue;
        }
        
        batch.push({ unicode, codePoint, dest });
      }
      
      // Download batch
      await Promise.all(batch.map(async ({ unicode, codePoint, dest }) => {
        try {
          const url = `${KANJIVG_RAW_URL}${codePoint}.svg`;
          const exists = await downloadFile(url, dest);
          
          if (exists) {
            rangeDownloaded++;
            totalDownloaded++;
            const kanjiChar = String.fromCharCode(unicode);
            index[kanjiChar] = codePoint;
            
            if (totalDownloaded % 100 === 0) {
              console.log(`  ✓ Downloaded ${totalDownloaded} files...`);
            }
          } else {
            rangeNotFound++;
            totalNotFound++;
          }
        } catch (error) {
          console.error(`  ✗ Error downloading U+${codePoint}: ${error.message}`);
        }
      }));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Save index periodically
      if (totalDownloaded % 500 === 0) {
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        console.log(`  💾 Saved index with ${Object.keys(index).length} entries`);
      }
    }
    
    console.log(`  ${range.name} complete:`);
    console.log(`    Downloaded: ${rangeDownloaded}`);
    console.log(`    Skipped: ${rangeSkipped}`);
    console.log(`    Not found: ${rangeNotFound}`);
  }
  
  // Final index save
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  
  // Count total files
  const allFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.svg'));
  
  console.log('\n✅ Download complete!');
  console.log(`   Total SVG files: ${allFiles.length}`);
  console.log(`   Downloaded: ${totalDownloaded}`);
  console.log(`   Skipped (already existed): ${totalSkipped}`);
  console.log(`   Not found in KanjiVG: ${totalNotFound}`);
  console.log(`   Index entries: ${Object.keys(index).length}`);
}

// Alternative: Quick download of just the most commonly used kanji
async function downloadEssentialKanji() {
  // Joyo kanji (2136 characters taught in Japanese schools)
  // Plus common kanji used in names
  console.log('\n🎯 Downloading essential kanji (Joyo + common)...');
  
  // This would contain the most important ~3000 kanji
  // Implementation here if needed
}

// Run the download
console.log('🚀 Starting comprehensive KanjiVG download...');
console.log('📝 This will systematically check and download all available kanji.\n');

downloadAllKanjiVGSystematic().catch(error => {
  console.error('Failed:', error);
});