const fs = require('fs');
const path = require('path');
const https = require('https');

// Common kanji for testing - includes simple and complex characters
const SAMPLE_KANJI = [
  // Numbers
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  // Basic kanji
  '日', '月', '火', '水', '木', '金', '土',
  // Common verbs
  '見', '聞', '話', '読', '書', '食', '飲', '行', '来', '帰',
  // People/family
  '人', '男', '女', '子', '父', '母', '友',
  // Nature
  '山', '川', '海', '空', '雨', '風',
  // Time
  '年', '月', '日', '時', '分', '今', '昨', '明',
  // School/study
  '学', '校', '生', '先', '教', '勉', '強',
  // Common nouns
  '家', '車', '電', '話', '本', '手', '目', '口', '耳',
  // Complex examples
  '愛', '夢', '桜', '龍', '鬱'
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

async function downloadKanjiVGSamples() {
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'kanjivg');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`📂 Output directory: ${outputDir}`);
  console.log(`📥 Downloading ${SAMPLE_KANJI.length} kanji SVG files...`);
  
  let downloaded = 0;
  let failed = 0;
  
  for (const kanji of SAMPLE_KANJI) {
    try {
      // Get Unicode code point
      const codePoint = kanji.charCodeAt(0).toString(16).padStart(5, '0');
      const filename = `${codePoint}.svg`;
      const url = `${KANJIVG_BASE_URL}${codePoint}.svg`;
      const dest = path.join(outputDir, filename);
      
      // Skip if already exists
      if (fs.existsSync(dest)) {
        console.log(`✓ ${kanji} (${codePoint}) - already exists`);
        downloaded++;
        continue;
      }
      
      // Download the file
      await downloadFile(url, dest);
      console.log(`✓ ${kanji} (${codePoint}) - downloaded`);
      downloaded++;
      
      // Small delay to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ ${kanji} - failed: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Download complete!`);
  console.log(`   Downloaded: ${downloaded}/${SAMPLE_KANJI.length}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed}`);
  }
  
  // Create an index file
  const indexPath = path.join(outputDir, 'index.json');
  const index = SAMPLE_KANJI.reduce((acc, kanji) => {
    const codePoint = kanji.charCodeAt(0).toString(16).padStart(5, '0');
    const svgPath = path.join(outputDir, `${codePoint}.svg`);
    if (fs.existsSync(svgPath)) {
      acc[kanji] = codePoint;
    }
    return acc;
  }, {});
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📄 Created index.json with ${Object.keys(index).length} entries`);
}

// Run the download
downloadKanjiVGSamples().catch(console.error);