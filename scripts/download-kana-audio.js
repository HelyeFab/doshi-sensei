#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Google TTS API configuration
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY;
const API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Voice configuration - using female voice as in the app
const VOICE_CONFIG = {
  languageCode: 'ja-JP',
  name: 'ja-JP-Neural2-B', // Female voice
};

// Audio configuration
const AUDIO_CONFIG = {
  audioEncoding: 'MP3',
  speakingRate: 1.0,
  pitch: 0.0,
  volumeGainDb: 0.0,
};

// Output directories
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'audio', 'kana');
const HIRAGANA_DIR = path.join(OUTPUT_DIR, 'hiragana');
const KATAKANA_DIR = path.join(OUTPUT_DIR, 'katakana');

// Kana data (copied from kanaData.ts)
const kanaData = [
  // Vowels
  { id: 'a', hiragana: 'あ', katakana: 'ア' },
  { id: 'i', hiragana: 'い', katakana: 'イ' },
  { id: 'u', hiragana: 'う', katakana: 'ウ' },
  { id: 'e', hiragana: 'え', katakana: 'エ' },
  { id: 'o', hiragana: 'お', katakana: 'オ' },
  // K-row
  { id: 'ka', hiragana: 'か', katakana: 'カ' },
  { id: 'ki', hiragana: 'き', katakana: 'キ' },
  { id: 'ku', hiragana: 'く', katakana: 'ク' },
  { id: 'ke', hiragana: 'け', katakana: 'ケ' },
  { id: 'ko', hiragana: 'こ', katakana: 'コ' },
  // G-row
  { id: 'ga', hiragana: 'が', katakana: 'ガ' },
  { id: 'gi', hiragana: 'ぎ', katakana: 'ギ' },
  { id: 'gu', hiragana: 'ぐ', katakana: 'グ' },
  { id: 'ge', hiragana: 'げ', katakana: 'ゲ' },
  { id: 'go', hiragana: 'ご', katakana: 'ゴ' },
  // S-row
  { id: 'sa', hiragana: 'さ', katakana: 'サ' },
  { id: 'shi', hiragana: 'し', katakana: 'シ' },
  { id: 'su', hiragana: 'す', katakana: 'ス' },
  { id: 'se', hiragana: 'せ', katakana: 'セ' },
  { id: 'so', hiragana: 'そ', katakana: 'ソ' },
  // Z-row
  { id: 'za', hiragana: 'ざ', katakana: 'ザ' },
  { id: 'ji', hiragana: 'じ', katakana: 'ジ' },
  { id: 'zu', hiragana: 'ず', katakana: 'ズ' },
  { id: 'ze', hiragana: 'ぜ', katakana: 'ゼ' },
  { id: 'zo', hiragana: 'ぞ', katakana: 'ゾ' },
  // T-row
  { id: 'ta', hiragana: 'た', katakana: 'タ' },
  { id: 'chi', hiragana: 'ち', katakana: 'チ' },
  { id: 'tsu', hiragana: 'つ', katakana: 'ツ' },
  { id: 'te', hiragana: 'て', katakana: 'テ' },
  { id: 'to', hiragana: 'と', katakana: 'ト' },
  // D-row
  { id: 'da', hiragana: 'だ', katakana: 'ダ' },
  { id: 'ji2', hiragana: 'ぢ', katakana: 'ヂ' },
  { id: 'zu2', hiragana: 'づ', katakana: 'ヅ' },
  { id: 'de', hiragana: 'で', katakana: 'デ' },
  { id: 'do', hiragana: 'ど', katakana: 'ド' },
  // N-row
  { id: 'na', hiragana: 'な', katakana: 'ナ' },
  { id: 'ni', hiragana: 'に', katakana: 'ニ' },
  { id: 'nu', hiragana: 'ぬ', katakana: 'ヌ' },
  { id: 'ne', hiragana: 'ね', katakana: 'ネ' },
  { id: 'no', hiragana: 'の', katakana: 'ノ' },
  // H-row
  { id: 'ha', hiragana: 'は', katakana: 'ハ' },
  { id: 'hi', hiragana: 'ひ', katakana: 'ヒ' },
  { id: 'fu', hiragana: 'ふ', katakana: 'フ' },
  { id: 'he', hiragana: 'へ', katakana: 'ヘ' },
  { id: 'ho', hiragana: 'ほ', katakana: 'ホ' },
  // B-row
  { id: 'ba', hiragana: 'ば', katakana: 'バ' },
  { id: 'bi', hiragana: 'び', katakana: 'ビ' },
  { id: 'bu', hiragana: 'ぶ', katakana: 'ブ' },
  { id: 'be', hiragana: 'べ', katakana: 'ベ' },
  { id: 'bo', hiragana: 'ぼ', katakana: 'ボ' },
  // P-row
  { id: 'pa', hiragana: 'ぱ', katakana: 'パ' },
  { id: 'pi', hiragana: 'ぴ', katakana: 'ピ' },
  { id: 'pu', hiragana: 'ぷ', katakana: 'プ' },
  { id: 'pe', hiragana: 'ぺ', katakana: 'ペ' },
  { id: 'po', hiragana: 'ぽ', katakana: 'ポ' },
  // M-row
  { id: 'ma', hiragana: 'ま', katakana: 'マ' },
  { id: 'mi', hiragana: 'み', katakana: 'ミ' },
  { id: 'mu', hiragana: 'む', katakana: 'ム' },
  { id: 'me', hiragana: 'め', katakana: 'メ' },
  { id: 'mo', hiragana: 'も', katakana: 'モ' },
  // Y-row
  { id: 'ya', hiragana: 'や', katakana: 'ヤ' },
  { id: 'yu', hiragana: 'ゆ', katakana: 'ユ' },
  { id: 'yo', hiragana: 'よ', katakana: 'ヨ' },
  // R-row
  { id: 'ra', hiragana: 'ら', katakana: 'ラ' },
  { id: 'ri', hiragana: 'り', katakana: 'リ' },
  { id: 'ru', hiragana: 'る', katakana: 'ル' },
  { id: 're', hiragana: 'れ', katakana: 'レ' },
  { id: 'ro', hiragana: 'ろ', katakana: 'ロ' },
  // W-row
  { id: 'wa', hiragana: 'わ', katakana: 'ワ' },
  { id: 'wo', hiragana: 'を', katakana: 'ヲ' },
  // N
  { id: 'n', hiragana: 'ん', katakana: 'ン' },
  // Digraphs
  { id: 'kya', hiragana: 'きゃ', katakana: 'キャ' },
  { id: 'kyu', hiragana: 'きゅ', katakana: 'キュ' },
  { id: 'kyo', hiragana: 'きょ', katakana: 'キョ' },
  { id: 'gya', hiragana: 'ぎゃ', katakana: 'ギャ' },
  { id: 'gyu', hiragana: 'ぎゅ', katakana: 'ギュ' },
  { id: 'gyo', hiragana: 'ぎょ', katakana: 'ギョ' },
  { id: 'sha', hiragana: 'しゃ', katakana: 'シャ' },
  { id: 'shu', hiragana: 'しゅ', katakana: 'シュ' },
  { id: 'sho', hiragana: 'しょ', katakana: 'ショ' },
  { id: 'ja', hiragana: 'じゃ', katakana: 'ジャ' },
  { id: 'ju', hiragana: 'じゅ', katakana: 'ジュ' },
  { id: 'jo', hiragana: 'じょ', katakana: 'ジョ' },
  { id: 'cha', hiragana: 'ちゃ', katakana: 'チャ' },
  { id: 'chu', hiragana: 'ちゅ', katakana: 'チュ' },
  { id: 'cho', hiragana: 'ちょ', katakana: 'チョ' },
  { id: 'nya', hiragana: 'にゃ', katakana: 'ニャ' },
  { id: 'nyu', hiragana: 'にゅ', katakana: 'ニュ' },
  { id: 'nyo', hiragana: 'にょ', katakana: 'ニョ' },
  { id: 'hya', hiragana: 'ひゃ', katakana: 'ヒャ' },
  { id: 'hyu', hiragana: 'ひゅ', katakana: 'ヒュ' },
  { id: 'hyo', hiragana: 'ひょ', katakana: 'ヒョ' },
  { id: 'bya', hiragana: 'びゃ', katakana: 'ビャ' },
  { id: 'byu', hiragana: 'びゅ', katakana: 'ビュ' },
  { id: 'byo', hiragana: 'びょ', katakana: 'ビョ' },
  { id: 'pya', hiragana: 'ぴゃ', katakana: 'ピャ' },
  { id: 'pyu', hiragana: 'ぴゅ', katakana: 'ピュ' },
  { id: 'pyo', hiragana: 'ぴょ', katakana: 'ピョ' },
  { id: 'mya', hiragana: 'みゃ', katakana: 'ミャ' },
  { id: 'myu', hiragana: 'みゅ', katakana: 'ミュ' },
  { id: 'myo', hiragana: 'みょ', katakana: 'ミョ' },
  { id: 'rya', hiragana: 'りゃ', katakana: 'リャ' },
  { id: 'ryu', hiragana: 'りゅ', katakana: 'リュ' },
  { id: 'ryo', hiragana: 'りょ', katakana: 'リョ' },
];

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Generate audio using Google TTS API
async function generateAudio(text, outputPath) {
  const requestData = {
    input: { text },
    voice: VOICE_CONFIG,
    audioConfig: AUDIO_CONFIG,
  };

  const postData = JSON.stringify(requestData);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'texttospeech.googleapis.com',
      path: `/v1/text:synthesize?key=${API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.error) {
            reject(new Error(`API Error: ${response.error.message}`));
            return;
          }

          // Decode base64 audio content
          const audioContent = Buffer.from(response.audioContent, 'base64');
          
          // Write to file
          fs.writeFileSync(outputPath, audioContent);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to download all kana audio
async function downloadAllKanaAudio() {
  if (!API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_TTS_API_KEY not found in environment variables');
    console.error('Please add it to your .env.local file');
    process.exit(1);
  }

  console.log('Starting kana audio download...');
  console.log(`Will download ${kanaData.length * 2} audio files (hiragana + katakana)`);

  // Create directories
  ensureDirectoryExists(OUTPUT_DIR);
  ensureDirectoryExists(HIRAGANA_DIR);
  ensureDirectoryExists(KATAKANA_DIR);

  let successCount = 0;
  let errorCount = 0;

  // Process each kana
  for (const kana of kanaData) {
    console.log(`\nProcessing: ${kana.id}`);

    // Download hiragana audio
    const hiraganaPath = path.join(HIRAGANA_DIR, `${kana.id}.mp3`);
    if (fs.existsSync(hiraganaPath)) {
      console.log(`  ✓ Hiragana audio already exists: ${kana.id}.mp3`);
    } else {
      try {
        console.log(`  ↓ Downloading hiragana: ${kana.hiragana}`);
        await generateAudio(kana.hiragana, hiraganaPath);
        console.log(`  ✓ Saved: ${hiraganaPath}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error downloading hiragana ${kana.id}: ${error.message}`);
        errorCount++;
      }
    }

    // Download katakana audio
    const katakanaPath = path.join(KATAKANA_DIR, `${kana.id}.mp3`);
    if (fs.existsSync(katakanaPath)) {
      console.log(`  ✓ Katakana audio already exists: ${kana.id}.mp3`);
    } else {
      try {
        console.log(`  ↓ Downloading katakana: ${kana.katakana}`);
        await generateAudio(kana.katakana, katakanaPath);
        console.log(`  ✓ Saved: ${katakanaPath}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Error downloading katakana ${kana.id}: ${error.message}`);
        errorCount++;
      }
    }

    // Rate limiting - wait 100ms between requests to avoid hitting API limits
    await sleep(100);
  }

  console.log('\n=== Download Complete ===');
  console.log(`✓ Successfully downloaded: ${successCount} files`);
  console.log(`✗ Errors: ${errorCount} files`);
  console.log(`📁 Audio files saved to: ${OUTPUT_DIR}`);

  // Create index file for easy import
  const indexContent = {
    hiragana: {},
    katakana: {},
  };

  kanaData.forEach(kana => {
    indexContent.hiragana[kana.id] = `/audio/kana/hiragana/${kana.id}.mp3`;
    indexContent.katakana[kana.id] = `/audio/kana/katakana/${kana.id}.mp3`;
  });

  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexContent, null, 2));
  console.log(`\n✓ Created index file: ${indexPath}`);
}

// Run the script
downloadAllKanaAudio().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});