const fs = require('fs');
const path = require('path');
const https = require('https');

// KanjiVG GitHub API to get all files
const GITHUB_API_URL = 'https://api.github.com/repos/KanjiVG/kanjivg/contents/kanji';
const KANJIVG_RAW_URL = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'DoshiSensei-KanjiDownloader'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

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
      } else if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        file.close();
        fs.unlink(dest, () => {});
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
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

async function downloadAllKanjiVG() {
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'kanjivg');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('📂 Output directory:', outputDir);
  console.log('🔍 Fetching list of all kanji from KanjiVG...');
  
  try {
    // Get list of all SVG files from GitHub API
    const files = await fetchJSON(GITHUB_API_URL);
    const svgFiles = files.filter(file => file.name.endsWith('.svg'));
    
    console.log(`📊 Found ${svgFiles.length} kanji SVG files to download`);
    console.log('⏳ This will take several minutes. Starting download...\n');
    
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;
    const index = {};
    
    // Process in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < svgFiles.length; i += batchSize) {
      const batch = svgFiles.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (file) => {
        const dest = path.join(outputDir, file.name);
        
        // Skip if already exists
        if (fs.existsSync(dest)) {
          skipped++;
          return;
        }
        
        try {
          await downloadFile(file.download_url, dest);
          downloaded++;
          
          // Extract kanji character from unicode
          const codePoint = file.name.replace('.svg', '');
          const kanjiChar = String.fromCharCode(parseInt(codePoint, 16));
          index[kanjiChar] = codePoint;
          
          if (downloaded % 100 === 0) {
            console.log(`✓ Downloaded ${downloaded} files...`);
          }
        } catch (error) {
          failed++;
          console.error(`✗ Failed to download ${file.name}: ${error.message}`);
        }
      }));
      
      // Small delay between batches
      if (i + batchSize < svgFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Build complete index from all files
    console.log('\n📄 Building complete index...');
    const allFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.svg'));
    allFiles.forEach(filename => {
      const codePoint = filename.replace('.svg', '');
      try {
        const kanjiChar = String.fromCharCode(parseInt(codePoint, 16));
        index[kanjiChar] = codePoint;
      } catch (e) {
        // Skip invalid code points
      }
    });
    
    // Save index
    const indexPath = path.join(outputDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log('\n✅ Download complete!');
    console.log(`   Total files: ${allFiles.length}`);
    console.log(`   Downloaded: ${downloaded}`);
    console.log(`   Skipped (already existed): ${skipped}`);
    if (failed > 0) {
      console.log(`   Failed: ${failed}`);
    }
    console.log(`   Index entries: ${Object.keys(index).length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('rate limit')) {
      console.log('\n💡 Tip: If you hit GitHub rate limits, try again in an hour.');
    }
  }
}

// Alternative: Download using a predefined list of common kanji
async function downloadCommonKanji() {
  // If GitHub API fails, we can fall back to downloading the most common kanji
  const JOYO_KANJI = require('./joyo-kanji.json'); // You would need this file
  console.log('Using fallback method with common kanji list...');
  // Implementation here
}

// Run the download
console.log('🚀 Starting KanjiVG complete download...');
console.log('📝 This will download all ~6000+ kanji stroke order files.\n');

downloadAllKanjiVG().catch(error => {
  console.error('Failed to download using GitHub API:', error);
  console.log('\nTrying alternative method...');
  // Could implement fallback here
});