const fs = require('fs');
const path = require('path');
const https = require('https');

// Additional kanji to download - including common ones users might search
const ADDITIONAL_KANJI = [
  // Common words from search
  '様', '心', '必', '思', '出', '変', '使', '考',
  // Common kanji in vocabulary
  '私', '名', '前', '意', '味', '単', '語', '文',
  // Common verbs
  '作', '言', '知', '持', '立', '入', '出', '見',
  // More useful kanji
  '新', '古', '大', '小', '高', '安', '多', '少'
];

const KANJIVG_BASE_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAdditionalKanji() {
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'kanjivg');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Read existing index
  const indexPath = path.join(outputDir, 'index.json');
  let index = {};
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }
  
  console.log(`📂 Output directory: ${outputDir}`);
  console.log(`📥 Downloading ${ADDITIONAL_KANJI.length} additional kanji SVG files...`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (const kanji of ADDITIONAL_KANJI) {
    try {
      // Get Unicode code point
      const codePoint = kanji.charCodeAt(0).toString(16).padStart(5, '0');
      const filename = `${codePoint}.svg`;
      const url = `${KANJIVG_BASE_URL}${codePoint}.svg`;
      const dest = path.join(outputDir, filename);
      
      // Skip if already exists
      if (fs.existsSync(dest)) {
        console.log(`✓ ${kanji} (${codePoint}) - already exists`);
        index[kanji] = codePoint;
        downloaded++;
        continue;
      }
      
      // Download the file
      await downloadFile(url, dest);
      console.log(`✓ ${kanji} (${codePoint}) - downloaded`);
      index[kanji] = codePoint;
      downloaded++;
      
      // Small delay to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ ${kanji} - failed: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Download complete!`);
  console.log(`   Downloaded: ${downloaded}/${ADDITIONAL_KANJI.length}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}`);
  }
  
  // Update index file
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📄 Updated index.json with ${Object.keys(index).length} total entries`);
}

// Run the download
downloadAdditionalKanji().catch(console.error);