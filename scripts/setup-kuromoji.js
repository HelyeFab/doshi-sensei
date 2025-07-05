const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

const DICT_URL = 'https://unpkg.com/kuromoji@0.1.2/dict/';
const DICT_FILES = [
  'base.dat.gz',
  'cc.dat.gz',
  'check.dat.gz',
  'tid.dat.gz',
  'tid_map.dat.gz',
  'tid_pos.dat.gz',
  'unk.dat.gz',
  'unk_char.dat.gz',
  'unk_compat.dat.gz',
  'unk_invoke.dat.gz',
  'unk_map.dat.gz',
  'unk_pos.dat.gz'
];

const DICT_DIR = path.join(__dirname, '..', 'public', 'dict');

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        file.close();
        fs.unlinkSync(destPath);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

async function setupKuromoji() {
  // Create dictionary directory
  if (!fs.existsSync(DICT_DIR)) {
    fs.mkdirSync(DICT_DIR, { recursive: true });
    console.log('Created dictionary directory:', DICT_DIR);
  }

  // Download dictionary files
  console.log('Downloading Kuromoji dictionary files...');
  
  for (const fileName of DICT_FILES) {
    const url = DICT_URL + fileName;
    const destPath = path.join(DICT_DIR, fileName);
    
    if (fs.existsSync(destPath)) {
      console.log(`✓ ${fileName} already exists`);
      continue;
    }
    
    console.log(`Downloading ${fileName}...`);
    try {
      await downloadFile(url, destPath);
      console.log(`✓ Downloaded ${fileName}`);
    } catch (error) {
      console.error(`✗ Failed to download ${fileName}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n✅ Kuromoji dictionary setup complete!');
  console.log('Dictionary files are in:', DICT_DIR);
}

setupKuromoji().catch(console.error);