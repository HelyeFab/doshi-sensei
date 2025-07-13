#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// Configuration
const CHUNK_SIZE = 50; // Number of strings per API call
const DELAY_BETWEEN_CHUNKS = 1000; // 1 second delay to avoid rate limits
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

// Language configurations
const LANGUAGES = {
  it: { name: 'Italian', code: 'it' },
  fr: { name: 'French', code: 'fr' },
  de: { name: 'German', code: 'de' },
  es: { name: 'Spanish', code: 'es' },
  ar: { name: 'Arabic', code: 'ar' },
  ko: { name: 'Korean', code: 'ko' }
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
  
  // Extract the object after 'export const en = '
  const startIndex = content.indexOf('export const en = {');
  if (startIndex === -1) {
    throw new Error('Could not find "export const en = {" in English strings file');
  }
  
  // Find the matching closing brace
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let endIndex = -1;
  
  for (let i = startIndex + 18; i < content.length; i++) { // 18 is length of "export const en = "
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    // Handle string literals
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
  
  if (endIndex === -1) {
    throw new Error('Could not find matching closing brace in English strings file');
  }
  
  const objectString = content.substring(startIndex + 18, endIndex);
  
  try {
    // Use Function constructor to safely evaluate the object
    const evalFunc = new Function(`return ${objectString}`);
    return evalFunc();
  } catch (error) {
    console.error('Error parsing English strings:', error);
    throw new Error('Failed to parse English strings object');
  }
}

// Load existing translations for a language
function loadExistingTranslations(langCode) {
  const translationPath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
  
  if (!fs.existsSync(translationPath)) {
    return {};
  }
  
  const content = fs.readFileSync(translationPath, 'utf8');
  
  // Extract the object after 'export const XX = '
  const pattern = new RegExp(`export const ${langCode} = {`);
  const startIndex = content.search(pattern);
  if (startIndex === -1) {
    return {};
  }
  
  // Find the matching closing brace
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let endIndex = -1;
  const startPos = startIndex + `export const ${langCode} = `.length;
  
  for (let i = startPos; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    // Handle string literals
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
  
  if (endIndex === -1) {
    return {};
  }
  
  const objectString = content.substring(startPos, endIndex);
  
  try {
    const evalFunc = new Function(`return ${objectString}`);
    return evalFunc();
  } catch (error) {
    console.error(`Error parsing existing ${langCode} translations:`, error);
    return {};
  }
}

// Flatten nested object to key-value pairs
function flattenObject(obj, prefix = '', result = {}) {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (Array.isArray(value)) {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null) {
      flattenObject(value, newKey, result);
    }
  }
  
  return result;
}

// Unflatten key-value pairs back to nested object
function unflattenObject(flat) {
  const result = {};
  
  for (const key in flat) {
    const parts = key.split('.');
    let current = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = flat[key];
  }
  
  return result;
}

// Find missing translations
function findMissingTranslations(englishFlat, existingFlat) {
  const missing = {};
  
  for (const key in englishFlat) {
    if (!existingFlat[key]) {
      missing[key] = englishFlat[key];
    }
  }
  
  return missing;
}

// Prepare translation prompt
function prepareTranslationPrompt(strings, targetLang) {
  const doNotTranslateList = DO_NOT_TRANSLATE.join(', ');
  
  return `You are a professional translator specializing in UI/UX translations for language learning applications. 
Please translate the following strings from English to ${targetLang.name} (${targetLang.code}).

IMPORTANT RULES:
1. Maintain the exact same JSON structure - only translate the values, never change the keys
2. Do NOT translate these terms: ${doNotTranslateList}
3. Keep placeholder patterns like {{variable}} unchanged
4. Preserve HTML tags if present
5. For arrays, translate each string element but maintain the array structure
6. Use formal/polite language appropriate for an educational app
7. For Italian specifically:
   - Use "tu" form for user-facing messages
   - Keep technical terms in English when commonly used
   - Be careful with verb conjugation terminology

Please respond with ONLY the translated JSON object, no explanations or comments.

Strings to translate:
${JSON.stringify(strings, null, 2)}`;
}

// Translate a chunk of strings
async function translateChunk(chunk, targetLang, retries = 0) {
  try {
    console.log(`  Translating chunk of ${Object.keys(chunk).length} strings...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Respond only with the translated JSON object."
        },
        {
          role: "user",
          content: prepareTranslationPrompt(chunk, targetLang)
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 4000,
    });
    
    const translatedText = response.choices[0].message.content;
    
    // Parse the response
    try {
      // Remove any markdown code blocks if present
      const cleanedText = translatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const translated = JSON.parse(cleanedText);
      return translated;
    } catch (parseError) {
      console.error('Error parsing translation response:', parseError);
      console.error('Response:', translatedText);
      
      if (retries < MAX_RETRIES) {
        console.log(`  Retrying... (attempt ${retries + 1}/${MAX_RETRIES})`);
        await sleep(RETRY_DELAY);
        return translateChunk(chunk, targetLang, retries + 1);
      }
      
      throw parseError;
    }
  } catch (error) {
    console.error('Translation error:', error);
    
    if (retries < MAX_RETRIES) {
      console.log(`  Retrying... (attempt ${retries + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY);
      return translateChunk(chunk, targetLang, retries + 1);
    }
    
    throw error;
  }
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Split object into chunks
function chunkObject(obj, chunkSize) {
  const entries = Object.entries(obj);
  const chunks = [];
  
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunkEntries = entries.slice(i, i + chunkSize);
    chunks.push(Object.fromEntries(chunkEntries));
  }
  
  return chunks;
}

// Save translations to file
function saveTranslations(translations, langCode) {
  const outputPath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
  
  // Create translations directory if it doesn't exist
  const translationsDir = path.dirname(outputPath);
  if (!fs.existsSync(translationsDir)) {
    fs.mkdirSync(translationsDir, { recursive: true });
  }
  
  // Generate file content
  const content = `// Auto-generated translation file for ${langCode.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using OpenAI GPT-4 API
// Total strings: ${Object.keys(flattenObject(translations)).length}

export const ${langCode} = ${JSON.stringify(translations, null, 2)};
`;
  
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`✅ Saved translations to ${outputPath}`);
}

// Main translation function
async function translateLanguage(langCode) {
  console.log(`\n🌍 Starting translation for ${LANGUAGES[langCode].name} (${langCode})`);
  
  try {
    // Load English strings
    console.log('📖 Loading English base strings...');
    const englishStrings = loadEnglishStrings();
    const englishFlat = flattenObject(englishStrings);
    console.log(`  Found ${Object.keys(englishFlat).length} total strings`);
    
    // Load existing translations
    console.log(`📖 Loading existing ${langCode} translations...`);
    const existingTranslations = loadExistingTranslations(langCode);
    const existingFlat = flattenObject(existingTranslations);
    console.log(`  Found ${Object.keys(existingFlat).length} existing translations`);
    
    // Find missing translations
    const missingFlat = findMissingTranslations(englishFlat, existingFlat);
    const missingCount = Object.keys(missingFlat).length;
    
    if (missingCount === 0) {
      console.log(`✅ All strings are already translated for ${langCode}!`);
      return;
    }
    
    console.log(`📊 Found ${missingCount} missing translations`);
    
    // Split into chunks
    const chunks = chunkObject(missingFlat, CHUNK_SIZE);
    console.log(`📦 Split into ${chunks.length} chunks of up to ${CHUNK_SIZE} strings each`);
    
    // Translate each chunk
    const allTranslations = { ...existingFlat };
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n🔄 Processing chunk ${i + 1}/${chunks.length}`);
      
      try {
        const translatedChunk = await translateChunk(chunks[i], LANGUAGES[langCode]);
        
        // Merge translated chunk
        Object.assign(allTranslations, translatedChunk);
        
        // Save progress after each chunk
        const merged = { ...existingTranslations, ...unflattenObject(allTranslations) };
        saveTranslations(merged, langCode);
        
        // Delay before next chunk
        if (i < chunks.length - 1) {
          console.log(`  Waiting ${DELAY_BETWEEN_CHUNKS}ms before next chunk...`);
          await sleep(DELAY_BETWEEN_CHUNKS);
        }
      } catch (error) {
        console.error(`❌ Error translating chunk ${i + 1}:`, error);
        console.log('  Saving progress and continuing...');
      }
    }
    
    // Final save
    const finalTranslations = { ...existingTranslations, ...unflattenObject(allTranslations) };
    saveTranslations(finalTranslations, langCode);
    
    const finalCount = Object.keys(flattenObject(finalTranslations)).length;
    const completionPercent = Math.round((finalCount / Object.keys(englishFlat).length) * 100);
    
    console.log(`\n✅ Translation complete for ${LANGUAGES[langCode].name}!`);
    console.log(`📊 Coverage: ${finalCount}/${Object.keys(englishFlat).length} strings (${completionPercent}%)`);
    
  } catch (error) {
    console.error(`\n❌ Fatal error translating ${langCode}:`, error);
  }
}

// Main function
async function main() {
  console.log('🚀 OpenAI Translation Script');
  console.log('============================\n');
  
  // Check API key
  if (!process.env.OPEN_AI_API_KEY) {
    console.error('❌ Error: OPEN_AI_API_KEY not found in .env file');
    process.exit(1);
  }
  
  // Get language from command line or default to Italian
  const langCode = process.argv[2] || 'it';
  
  if (!LANGUAGES[langCode]) {
    console.error(`❌ Error: Unknown language code "${langCode}"`);
    console.log(`Available languages: ${Object.keys(LANGUAGES).join(', ')}`);
    process.exit(1);
  }
  
  // Translate the specified language
  await translateLanguage(langCode);
  
  console.log('\n✨ Done!');
}

// Run the script
main().catch(console.error);