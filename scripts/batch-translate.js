const fs = require('fs');
const path = require('path');
const https = require('https');

// Google Translate API key
const API_KEY = 'AIzaSyDfETlyCtkm_-iM8p7G3fCaVqK4bu1wjsg';

// Language codes for translation
const languageMap = {
  fr: 'fr', // French
  it: 'it', // Italian
  de: 'de', // German
  es: 'es', // Spanish
  ar: 'ar', // Arabic
  ko: 'ko'  // Korean
};

// Read the English base file
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Extract and parse the English object
const enMatch = enContent.match(/export const en = (\{[\s\S]*\});/);
if (!enMatch) {
  console.error('Could not extract English object');
  process.exit(1);
}

// Parse using eval (safe in this controlled context)
const enObj = eval(`(${enMatch[1]})`);
console.log('Successfully parsed English object');

// Function to collect all strings from an object
function collectStrings(obj, path = '') {
  const strings = [];
  
  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (Array.isArray(obj[key])) {
      obj[key].forEach((item, index) => {
        if (typeof item === 'string') {
          strings.push({ path: `${fullPath}[${index}]`, text: item });
        }
      });
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      strings.push(...collectStrings(obj[key], fullPath));
    } else if (typeof obj[key] === 'string') {
      strings.push({ path: fullPath, text: obj[key] });
    }
  }
  
  return strings;
}

// Function to batch translate texts using Google Translate API
async function batchTranslateTexts(texts, targetLang) {
  const BATCH_SIZE = 100; // Google Translate API allows up to 128 segments per request
  const results = new Map();
  
  // Skip patterns
  const skipPatterns = [
    /^[A-Z0-9_]+$/, // All caps constants
    /^Doshi Sensei$/i, // App name
    /^[0-9]+$/, // Numbers
    /^JLPT N[1-5]$/, // JLPT levels
    /^N[1-5]$/, // JLPT levels short form
    /^Pokédex$/i, // Special names
    /^WaniKani$/i, // Brand names
  ];
  
  // Filter texts that need translation
  const textsToTranslate = texts.filter(({ text }) => 
    !skipPatterns.some(pattern => pattern.test(text))
  );
  
  // Add skipped texts to results
  texts.forEach(({ path, text }) => {
    if (skipPatterns.some(pattern => pattern.test(text))) {
      results.set(path, text);
    }
  });
  
  console.log(`📊 Translating ${textsToTranslate.length} strings (${texts.length - textsToTranslate.length} skipped)`);
  
  // Process in batches
  for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
    const batch = textsToTranslate.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map(({ text }) => text);
    
    console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(textsToTranslate.length / BATCH_SIZE)} (${batch.length} strings)...`);
    
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
    
    const data = JSON.stringify({
      q: batchTexts,
      source: 'en',
      target: targetLang,
      format: 'text'
    });
    
    try {
      const translations = await new Promise((resolve, reject) => {
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
              const result = JSON.parse(responseData);
              if (result.data && result.data.translations) {
                const translated = result.data.translations.map(t => 
                  t.translatedText
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                );
                resolve(translated);
              } else if (result.error) {
                console.error(`❌ Batch translation error: ${result.error.message}`);
                reject(new Error(result.error.message));
              } else {
                reject(new Error('No translations returned'));
              }
            } catch (e) {
              console.error(`❌ Parse error: ${e.message}`);
              reject(e);
            }
          });
        });
        
        req.on('error', (error) => {
          console.error(`❌ Request error: ${error.message}`);
          reject(error);
        });
        
        req.write(data);
        req.end();
      });
      
      // Map translations back to paths
      batch.forEach(({ path }, index) => {
        if (translations[index]) {
          results.set(path, translations[index]);
        }
      });
      
      console.log(`✅ Batch completed successfully`);
      
    } catch (error) {
      console.error(`❌ Batch failed: ${error.message}`);
      // On error, use original texts
      batch.forEach(({ path, text }) => {
        results.set(path, text);
      });
    }
    
    // Rate limiting delay between batches
    if (i + BATCH_SIZE < textsToTranslate.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Function to rebuild object with translated strings
function rebuildWithTranslations(obj, translations, path = '') {
  const result = {};
  
  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (Array.isArray(obj[key])) {
      result[key] = obj[key].map((item, index) => {
        if (typeof item === 'string') {
          const itemPath = `${fullPath}[${index}]`;
          return translations.get(itemPath) || item;
        }
        return item;
      });
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = rebuildWithTranslations(obj[key], translations, fullPath);
    } else if (typeof obj[key] === 'string') {
      result[key] = translations.get(fullPath) || obj[key];
    } else {
      result[key] = obj[key];
    }
  }
  
  return result;
}

// Function to generate TypeScript code
function generateTsCode(obj, indent = '  ') {
  const lines = [];
  const keys = Object.keys(obj);
  
  keys.forEach((key, index) => {
    const value = obj[key];
    const isLast = index === keys.length - 1;
    
    if (Array.isArray(value)) {
      const arrayItems = value.map(item => 
        typeof item === 'string' 
          ? `    "${item.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"` 
          : `    ${JSON.stringify(item)}`
      ).join(',\n');
      lines.push(`${indent}${key}: [\n${arrayItems}\n${indent}]${isLast ? '' : ','}`);
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${indent}${key}: {`);
      lines.push(generateTsCode(value, indent + '  '));
      lines.push(`${indent}}${isLast ? '' : ','}`);
    } else {
      const escapedValue = typeof value === 'string' 
        ? '"' + value.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
        : value;
      lines.push(`${indent}${key}: ${escapedValue}${isLast ? '' : ','}`);
    }
  });
  
  return lines.join('\n');
}

// Main translation process
async function translateAll() {
  // Collect all strings once
  const allStrings = collectStrings(enObj);
  console.log(`\n📊 Total strings found: ${allStrings.length}\n`);
  
  for (const [langCode, googleLangCode] of Object.entries(languageMap)) {
    console.log(`\n🌍 Translating to ${langCode.toUpperCase()} (${googleLangCode})...`);
    console.log('═'.repeat(50));
    
    try {
      const startTime = Date.now();
      
      // Batch translate all strings
      const translations = await batchTranslateTexts(allStrings, googleLangCode);
      
      // Rebuild object with translations
      const translatedObj = rebuildWithTranslations(enObj, translations);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n⏱️  Translation completed in ${duration} seconds`);
      
      // Generate TypeScript code
      const header = `// Auto-generated translation file for ${langCode.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API (batch mode)
// Total strings: ${allStrings.length}

`;
      
      const tsCode = `export const ${langCode} = {\n${generateTsCode(translatedObj)}\n};\n`;
      
      // Write the file
      const outputPath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
      fs.writeFileSync(outputPath, header + tsCode);
      
      console.log(`✅ Successfully saved ${langCode}.ts`);
      
    } catch (error) {
      console.error(`❌ Error translating ${langCode}:`, error.message);
    }
    
    // Delay between languages
    console.log('\n⏳ Waiting 3 seconds before next language...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✨ All translations complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Test the language switching in the app');
  console.log('2. Review translations for accuracy');
  console.log('3. Make any necessary manual corrections');
}

// Run the translation
console.log('🚀 Starting batch translation process...');
translateAll().catch(console.error);