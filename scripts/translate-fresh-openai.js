#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// Configuration
const CHUNK_SIZE = 30; // Smaller chunks for better quality
const DELAY_BETWEEN_CHUNKS = 2000; // 2 seconds delay
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

// Language configurations
const LANGUAGES = {
  es: { name: 'Spanish', code: 'es' },
  ar: { name: 'Arabic', code: 'ar' },
  ko: { name: 'Korean', code: 'ko' },
  fr: { name: 'French', code: 'fr' },
  de: { name: 'German', code: 'de' },
  it: { name: 'Italian', code: 'it' }
};

// Special strings that should NOT be translated
const DO_NOT_TRANSLATE = [
  'Doshi Sensei',
  'JLPT',
  'N1', 'N2', 'N3', 'N4', 'N5',
  'hiragana', 'katakana', 'kanji',
  'romaji', 'furigana',
  'PWA',
  'API',
  'UI',
  'CSV', 'JSON',
  'Stripe',
  'PayPal',
  'WaniKani',
  'Jisho',
  'OpenAI',
  'Google',
  'DeepL'
];

// Load English base file
function loadEnglishStrings() {
  const enPath = path.join(__dirname, '../src/config/strings/en.ts');
  const content = fs.readFileSync(enPath, 'utf8');
  
  // Extract the object
  const startIndex = content.indexOf('export const en = {');
  if (startIndex === -1) {
    throw new Error('Could not find English strings');
  }
  
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let endIndex = -1;
  
  for (let i = startIndex + 18; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }
  
  const objectString = content.substring(startIndex + 18, endIndex);
  const evalFunc = new Function(`return ${objectString}`);
  return evalFunc();
}

// Flatten object to paths
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

// Unflatten paths to object
function unflattenObject(flat) {
  const result = {};
  
  for (const path in flat) {
    const value = flat[path];
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    
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
      current[parseInt(lastPart)] = value;
    } else {
      current[lastPart] = value;
    }
  }
  
  return result;
}

// Create translation prompt
function createPrompt(chunk, targetLang) {
  const entries = Object.entries(chunk);
  const doNotTranslateList = DO_NOT_TRANSLATE.join(', ');
  
  const prompt = `You are a professional translator for a Japanese language learning app. Translate these UI strings from English to ${targetLang.name}.

RULES:
1. Keep these terms in English: ${doNotTranslateList}
2. Preserve {{variables}} and HTML tags
3. Use appropriate formality for an educational app
4. Be consistent with terminology

Translate each string and return ONLY a JSON object with the same keys:

${JSON.stringify(chunk, null, 2)}`;

  return prompt;
}

// Translate chunk
async function translateChunk(chunk, targetLang, attempt = 1) {
  try {
    console.log(`  Translating ${Object.keys(chunk).length} strings (attempt ${attempt})...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate UI strings from English to ${targetLang.name}. Return only valid JSON.`
        },
        {
          role: "user", 
          content: createPrompt(chunk, targetLang)
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    const content = response.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        console.log(`  Parse error, retrying...`);
        await sleep(RETRY_DELAY);
        return translateChunk(chunk, targetLang, attempt + 1);
      }
      throw e;
    }
    
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`  Error: ${error.message}, retrying...`);
      await sleep(RETRY_DELAY);
      return translateChunk(chunk, targetLang, attempt + 1);
    }
    throw error;
  }
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Chunk array
function chunkObject(obj, size) {
  const entries = Object.entries(obj);
  const chunks = [];
  
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  
  return chunks;
}

// Save translations
function saveTranslations(translations, langCode, progress = false) {
  const outputPath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const header = `// Auto-generated translation file for ${langCode.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using OpenAI GPT-4
// Translation status: ${progress ? 'In Progress' : 'Complete'}

export const ${langCode} = `;
  
  const content = header + JSON.stringify(translations, null, 2) + ';\n';
  fs.writeFileSync(outputPath, content, 'utf8');
  
  if (!progress) {
    console.log(`✅ Saved complete translations to ${outputPath}`);
  }
}

// Main translation function
async function translateLanguage(langCode) {
  console.log(`\n🌍 Starting fresh translation for ${LANGUAGES[langCode].name} (${langCode})`);
  
  try {
    // Load English
    console.log('📖 Loading English strings...');
    const english = loadEnglishStrings();
    const flatEnglish = flattenObject(english);
    const totalStrings = Object.keys(flatEnglish).length;
    console.log(`  Found ${totalStrings} strings to translate`);
    
    // Create chunks
    const chunks = chunkObject(flatEnglish, CHUNK_SIZE);
    console.log(`📦 Split into ${chunks.length} chunks of ${CHUNK_SIZE} strings each`);
    
    // Translate all chunks
    const allTranslated = {};
    let processed = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n🔄 Chunk ${i + 1}/${chunks.length}`);
      
      try {
        const translated = await translateChunk(chunks[i], LANGUAGES[langCode]);
        Object.assign(allTranslated, translated);
        
        processed += Object.keys(chunks[i]).length;
        const percentage = Math.round((processed / totalStrings) * 100);
        console.log(`  Progress: ${processed}/${totalStrings} (${percentage}%)`);
        
        // Save progress every 5 chunks
        if ((i + 1) % 5 === 0) {
          const progressObj = unflattenObject(allTranslated);
          saveTranslations(progressObj, langCode, true);
          console.log(`  💾 Progress saved`);
        }
        
        // Delay between chunks
        if (i < chunks.length - 1) {
          await sleep(DELAY_BETWEEN_CHUNKS);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to translate chunk: ${error.message}`);
        // Continue with next chunk
      }
    }
    
    // Final save
    const finalTranslations = unflattenObject(allTranslated);
    saveTranslations(finalTranslations, langCode, false);
    
    const finalCount = Object.keys(allTranslated).length;
    const completionRate = Math.round((finalCount / totalStrings) * 100);
    
    console.log(`\n✅ Translation complete!`);
    console.log(`📊 Translated ${finalCount}/${totalStrings} strings (${completionRate}%)`);
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Main
async function main() {
  console.log('🚀 Fresh OpenAI Translation Script');
  console.log('==================================\n');
  
  if (!process.env.OPEN_AI_API_KEY) {
    console.error('❌ Error: OPEN_AI_API_KEY not found in .env');
    process.exit(1);
  }
  
  const langCode = process.argv[2];
  
  if (!langCode || !LANGUAGES[langCode]) {
    console.log('Usage: node translate-fresh-openai.js [language]');
    console.log(`Languages: ${Object.keys(LANGUAGES).join(', ')}`);
    process.exit(1);
  }
  
  await translateLanguage(langCode);
  console.log('\n✨ Done!');
}

main().catch(console.error);