#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const dotenv = require('dotenv');

// Load the MCP's .env file to get the API key
const mcpEnvPath = '/home/mate/Dev/MCPs/translator-mcp/.env';
const mcpEnv = dotenv.parse(fs.readFileSync(mcpEnvPath));

const API_KEY = mcpEnv.GOOGLE_TRANSLATE_API_KEY;

// Configuration
const CONFIG = {
  cleanedStringsFile: 'extracted-strings/cleaned-strings.json',
  outputDir: 'src/config/strings/translations',
  languages: {
    'fr': 'French',
    'it': 'Italian',
    'de': 'German',
    'es': 'Spanish',
    'ar': 'Arabic',
    'ko': 'Korean'
  },
  batchSize: 100 // Google Translate can handle up to 128 segments per request
};

// Function to call Google Translate API directly
async function translateText(texts, targetLang) {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  
  const data = JSON.stringify({
    q: texts,
    target: targetLang,
    source: 'en',
    format: 'text'
  });

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else if (parsed.data && parsed.data.translations) {
            const translations = parsed.data.translations.map(t => t.translatedText);
            resolve(translations);
          } else {
            reject(new Error('Invalid response from Google Translate'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Function to translate all strings for a language
async function translateLanguage(strings, langCode, langName) {
  console.log(`\n🔄 Translating to ${langName} (${langCode})...`);
  
  const entries = Object.entries(strings);
  const translatedStrings = {};
  
  // Process in batches
  for (let i = 0; i < entries.length; i += CONFIG.batchSize) {
    const batch = entries.slice(i, i + CONFIG.batchSize);
    const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
    const totalBatches = Math.ceil(entries.length / CONFIG.batchSize);
    
    console.log(`  Batch ${batchNumber}/${totalBatches}...`);
    
    try {
      // Extract just the text values for translation
      const textsToTranslate = batch.map(([key, value]) => value);
      
      // Translate the batch
      const translations = await translateText(textsToTranslate, langCode);
      
      // Map translations back to keys
      batch.forEach(([key, value], index) => {
        translatedStrings[key] = translations[index] || value;
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ❌ Error in batch ${batchNumber}: ${error.message}`);
      // Add original text as fallback
      batch.forEach(([key, value]) => {
        translatedStrings[key] = value;
      });
    }
  }
  
  return translatedStrings;
}

// Generate translation file
function saveTranslationFile(langCode, langName, translations) {
  const content = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API

export const ${langCode} = ${JSON.stringify(translations, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;

  const filePath = path.join(CONFIG.outputDir, `${langCode}.ts`);
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ Saved ${langCode}.ts`);
}

// Main function
async function main() {
  console.log('🌐 Direct Google Translate for Doshi Sensei\n');
  console.log('🔑 Using API key from MCP .env file');
  
  // Load cleaned strings
  if (!fs.existsSync(CONFIG.cleanedStringsFile)) {
    console.error('❌ Cleaned strings file not found:', CONFIG.cleanedStringsFile);
    console.error('   Run merge-translations.js first.');
    process.exit(1);
  }
  
  const cleanedData = JSON.parse(fs.readFileSync(CONFIG.cleanedStringsFile, 'utf8'));
  const { strings } = cleanedData;
  
  console.log(`📋 Loaded ${Object.keys(strings).length} strings to translate`);
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Translate each language
  for (const [langCode, langName] of Object.entries(CONFIG.languages)) {
    try {
      const translations = await translateLanguage(strings, langCode, langName);
      saveTranslationFile(langCode, langName, translations);
    } catch (error) {
      console.error(`\n❌ Failed to translate ${langName}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Translation complete!');
  console.log('\n🎉 All languages have been translated using Google Translate API');
  console.log('\nNext steps:');
  console.log('1. Review the translations in src/config/strings/translations/');
  console.log('2. Test each language in your app');
  console.log('3. Consider having native speakers review and refine the translations');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});