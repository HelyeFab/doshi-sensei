#!/usr/bin/env node

/**
 * Unified Translation Script for Doshi Sensei
 * 
 * This script handles all translations using OpenAI GPT-4o-mini
 * Usage: node translate.js [language_code] [options]
 * 
 * Examples:
 *   node translate.js fr              # Translate to French
 *   node translate.js all             # Translate to all supported languages
 *   node translate.js fr --force      # Force retranslate even if complete
 *   node translate.js --check         # Check translation coverage only
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// Configuration
const SUPPORTED_LANGUAGES = {
  es: { name: 'Spanish', code: 'es' },
  fr: { name: 'French', code: 'fr' },
  de: { name: 'German', code: 'de' },
  it: { name: 'Italian', code: 'it' },
  ar: { name: 'Arabic', code: 'ar', rtl: true },
  ko: { name: 'Korean', code: 'ko' },
  ja: { name: 'Japanese', code: 'ja' },
  zh: { name: 'Chinese (Simplified)', code: 'zh' },
  pt: { name: 'Portuguese', code: 'pt' },
  ru: { name: 'Russian', code: 'ru' }
};

// Translation settings
const CHUNK_SIZE = 30;
const DELAY_BETWEEN_CHUNKS = 2000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Terms that should NOT be translated
const DO_NOT_TRANSLATE = [
  'Doshi Sensei',
  'JLPT',
  'N1', 'N2', 'N3', 'N4', 'N5',
  'hiragana', 'katakana', 'kanji',
  'romaji', 'furigana',
  'PWA', 'API', 'UI', 'CSV', 'JSON',
  'Stripe', 'PayPal',
  'WaniKani', 'Jisho',
  'OpenAI', 'Google', 'DeepL'
];

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

// Helper function to parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    language: null,
    force: false,
    check: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--check') {
      options.check = true;
    } else if (!arg.startsWith('--')) {
      options.language = arg;
    }
  }

  return options;
}

// Load English strings with better error handling
async function loadEnglishStrings() {
  const enPath = path.join(__dirname, '../src/config/strings/en.ts');
  
  try {
    // Read the file
    const content = fs.readFileSync(enPath, 'utf8');
    
    // Use a more robust approach - compile and execute in isolated context
    const { runInNewContext } = require('vm');
    
    // Find the export statement and extract the object
    const startPattern = /export\s+const\s+en\s*=\s*{/;
    const startMatch = content.match(startPattern);
    if (!startMatch) {
      throw new Error('Could not find English strings object');
    }
    
    // Find the matching closing brace
    const startIndex = startMatch.index + startMatch[0].length - 1;
    let braceCount = 1;
    let inString = false;
    let stringChar = null;
    let endIndex = -1;
    
    for (let i = startIndex + 1; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      // Handle string boundaries
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && prevChar !== '\\') {
        inString = false;
        stringChar = null;
      }
      
      // Count braces only outside of strings
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
    }
    
    if (endIndex === -1) {
      throw new Error('Could not find matching closing brace for English strings');
    }
    
    const objectCode = content.substring(startIndex, endIndex);
    
    // Evaluate the object in a safe context
    const result = runInNewContext(`(${objectCode})`, {}, { 
      filename: 'en.ts',
      timeout: 5000 
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error loading English strings:', error.message);
    
    // Fallback: Try to load from a JSON file if it exists
    const jsonPath = path.join(__dirname, 'en-strings-cache.json');
    if (fs.existsSync(jsonPath)) {
      console.log('📁 Using cached English strings from previous run');
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    
    throw error;
  }
}

// Save English strings to cache for future use
function cacheEnglishStrings(strings) {
  const cachePath = path.join(__dirname, 'en-strings-cache.json');
  fs.writeFileSync(cachePath, JSON.stringify(strings, null, 2));
}

// Flatten nested object into dot notation
function flattenObject(obj, prefix = '', result = {}) {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        result[`${newKey}[${index}]`] = item;
      });
    } else if (typeof value === 'object' && value !== null) {
      flattenObject(value, newKey, result);
    }
  }
  
  return result;
}

// Unflatten dot notation back to nested object
function unflattenObject(flat) {
  const result = {};
  
  for (const key in flat) {
    const parts = key.split(/\.|\[|\]/).filter(Boolean);
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextArray = !isNaN(parseInt(nextPart));
      
      if (!current[part]) {
        current[part] = isNextArray ? [] : {};
      }
      current = current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    if (Array.isArray(current)) {
      current[parseInt(lastPart)] = flat[key];
    } else {
      current[lastPart] = flat[key];
    }
  }
  
  return result;
}

// Load existing translations
function loadExistingTranslations(langCode) {
  const filePath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
  
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { runInNewContext } = require('vm');
    
    const objectMatch = content.match(new RegExp(`export\\s+const\\s+${langCode}\\s*=\\s*({[\\s\\S]*});?\\s*$`));
    if (!objectMatch) {
      return {};
    }
    
    const objectCode = objectMatch[1];
    return runInNewContext(`(${objectCode})`, {}, { 
      filename: `${langCode}.ts`,
      timeout: 5000 
    });
  } catch (error) {
    console.warn(`⚠️ Could not load existing ${langCode} translations:`, error.message);
    return {};
  }
}

// Translate a chunk of strings
async function translateChunk(chunk, targetLang, attempt = 1) {
  const langInfo = SUPPORTED_LANGUAGES[targetLang];
  
  try {
    const prompt = `You are a professional translator for a Japanese language learning app called "Doshi Sensei". 
Translate the following UI strings from English to ${langInfo.name} (${langInfo.code}).

Important instructions:
1. Maintain the exact same JSON structure with keys and values
2. Only translate the string values, never change the keys
3. Keep placeholders like {{name}}, {{count}}, etc. exactly as they are
4. Do NOT translate these terms: ${DO_NOT_TRANSLATE.join(', ')}
5. Use appropriate formality level for an educational app
6. For ${langInfo.name}, use standard/formal language suitable for UI text
${langInfo.rtl ? '7. This is a right-to-left language, ensure proper text direction markers if needed' : ''}

Translate this JSON object:
${JSON.stringify(chunk, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Return only valid JSON with no additional text or markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Clean up response - remove markdown code blocks if present
    const cleanedResponse = responseText
      .replace(/^```json\s*\n?/, '')
      .replace(/\n?```\s*$/, '')
      .trim();
    
    return JSON.parse(cleanedResponse);
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`⚠️ Retry attempt ${attempt} for chunk...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return translateChunk(chunk, targetLang, attempt + 1);
    }
    throw error;
  }
}

// Translate all strings for a language
async function translateLanguage(langCode, englishStrings, force = false) {
  const langInfo = SUPPORTED_LANGUAGES[langCode];
  console.log(`\n🌍 Translating to ${langInfo.name} (${langCode})...`);
  
  // Check if already complete
  const existing = loadExistingTranslations(langCode);
  const existingFlat = flattenObject(existing);
  const englishFlat = flattenObject(englishStrings);
  
  if (!force && Object.keys(existingFlat).length === Object.keys(englishFlat).length) {
    console.log(`✅ ${langInfo.name} already complete (${Object.keys(existingFlat).length} strings)`);
    return;
  }
  
  // Find missing keys
  const missingKeys = Object.keys(englishFlat).filter(key => !existingFlat[key]);
  if (!force && missingKeys.length === 0) {
    console.log(`✅ ${langInfo.name} already complete`);
    return;
  }
  
  console.log(`📊 Found ${missingKeys.length} missing translations${force ? ' (force mode)' : ''}`);
  
  // Prepare strings to translate
  const toTranslate = force ? englishFlat : 
    Object.fromEntries(missingKeys.map(key => [key, englishFlat[key]]));
  
  // Split into chunks
  const entries = Object.entries(toTranslate);
  const chunks = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    chunks.push(Object.fromEntries(entries.slice(i, i + CHUNK_SIZE)));
  }
  
  console.log(`📦 Processing ${chunks.length} chunks...`);
  
  // Translate chunks
  const results = {};
  for (let i = 0; i < chunks.length; i++) {
    const progress = `[${i + 1}/${chunks.length}]`;
    process.stdout.write(`\r🔄 ${progress} Translating chunk...`);
    
    try {
      const translated = await translateChunk(chunks[i], langCode);
      Object.assign(results, translated);
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
      }
    } catch (error) {
      console.error(`\n❌ Error translating chunk ${i + 1}:`, error.message);
      throw error;
    }
  }
  
  console.log('\n✅ Translation complete!');
  
  // Merge with existing translations
  const finalFlat = force ? results : { ...existingFlat, ...results };
  const finalNested = unflattenObject(finalFlat);
  
  // Save to file
  saveTranslation(langCode, finalNested);
}

// Save translation to file
function saveTranslation(langCode, translations) {
  const langInfo = SUPPORTED_LANGUAGES[langCode];
  const filePath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
  
  const content = `// Auto-generated translation file for ${langCode.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using OpenAI GPT-4o-mini
// Language: ${langInfo.name}
// Total strings: ${Object.keys(flattenObject(translations)).length}

export const ${langCode} = ${JSON.stringify(translations, null, 2)};
`;
  
  fs.writeFileSync(filePath, content);
  console.log(`💾 Saved to ${filePath}`);
}

// Check translation coverage
function checkCoverage() {
  console.log('\n📊 Translation Coverage Report');
  console.log('================================\n');
  
  try {
    const englishStrings = loadEnglishStrings();
    const englishCount = Object.keys(flattenObject(englishStrings)).length;
    console.log(`English (base): ${englishCount} strings\n`);
    
    for (const [code, info] of Object.entries(SUPPORTED_LANGUAGES)) {
      const existing = loadExistingTranslations(code);
      const count = Object.keys(flattenObject(existing)).length;
      const percentage = ((count / englishCount) * 100).toFixed(1);
      const status = count === englishCount ? '✅' : '🔄';
      
      console.log(`${status} ${info.name} (${code}): ${count}/${englishCount} (${percentage}%)`);
    }
  } catch (error) {
    console.error('❌ Error checking coverage:', error.message);
  }
}

// Main function
async function main() {
  console.log('🌐 Doshi Sensei Translation Tool');
  console.log('================================\n');
  
  // Check for API key
  if (!process.env.OPEN_AI_API_KEY) {
    console.error('❌ Error: OPEN_AI_API_KEY not found in environment variables');
    console.error('Please add it to your .env file');
    process.exit(1);
  }
  
  const options = parseArgs();
  
  // Just check coverage
  if (options.check) {
    checkCoverage();
    return;
  }
  
  // Show usage if no language specified
  if (!options.language) {
    console.log('Usage: node translate.js [language_code] [options]\n');
    console.log('Languages:');
    for (const [code, info] of Object.entries(SUPPORTED_LANGUAGES)) {
      console.log(`  ${code} - ${info.name}`);
    }
    console.log('  all - Translate all languages\n');
    console.log('Options:');
    console.log('  --force  Force retranslate even if complete');
    console.log('  --check  Check translation coverage only\n');
    console.log('Examples:');
    console.log('  node translate.js fr');
    console.log('  node translate.js all');
    console.log('  node translate.js fr --force');
    console.log('  node translate.js --check');
    return;
  }
  
  try {
    // Load English strings
    console.log('📖 Loading English strings...');
    const englishStrings = await loadEnglishStrings();
    cacheEnglishStrings(englishStrings);
    
    const stringCount = Object.keys(flattenObject(englishStrings)).length;
    console.log(`✅ Loaded ${stringCount} English strings`);
    
    // Translate specified language(s)
    if (options.language === 'all') {
      for (const langCode of Object.keys(SUPPORTED_LANGUAGES)) {
        await translateLanguage(langCode, englishStrings, options.force);
      }
    } else if (SUPPORTED_LANGUAGES[options.language]) {
      await translateLanguage(options.language, englishStrings, options.force);
    } else {
      console.error(`❌ Unknown language: ${options.language}`);
      console.error('Use --help to see supported languages');
      process.exit(1);
    }
    
    console.log('\n✨ All done!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}