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
console.log(`Found ${Object.keys(enObj).length} top-level keys`);

// Function to translate text using Google Translate API
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip translation for certain strings
  const skipPatterns = [
    /^[A-Z0-9_]+$/, // All caps constants
    /^Doshi Sensei$/i, // App name
    /^[0-9]+$/, // Numbers
    /^JLPT N[1-5]$/, // JLPT levels
    /^N[1-5]$/, // JLPT levels short form
    /^Pokédex$/i, // Special names
    /^WaniKani$/i, // Brand names
  ];
  
  if (skipPatterns.some(pattern => pattern.test(text))) {
    return text;
  }
  
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  
  const data = JSON.stringify({
    q: text,
    source: 'en',
    target: targetLang,
    format: 'text'
  });
  
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
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
          if (result.data && result.data.translations && result.data.translations[0]) {
            // Decode HTML entities
            const translated = result.data.translations[0].translatedText
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            resolve(translated);
          } else if (result.error) {
            console.error(`Translation error for "${text}": ${result.error.message}`);
            resolve(text); // Return original text on error
          } else {
            resolve(text);
          }
        } catch (e) {
          console.error(`Parse error: ${e.message}`);
          resolve(text);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      resolve(text); // Return original text on error
    });
    
    req.write(data);
    req.end();
  });
}

// Function to translate an entire object recursively
async function translateObject(obj, targetLang, path = '', depth = 0) {
  const result = {};
  const indent = '  '.repeat(depth);
  
  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (Array.isArray(obj[key])) {
      // Translate array items
      console.log(`${indent}📚 Translating array: ${fullPath}`);
      result[key] = await Promise.all(
        obj[key].map(async (item, i) => {
          if (typeof item === 'string') {
            process.stdout.write(`${indent}  [${i}] `);
            const translated = await translateText(item, targetLang);
            console.log('✓');
            await new Promise(resolve => setTimeout(resolve, 50)); // Rate limiting
            return translated;
          }
          return item;
        })
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursively translate nested objects
      console.log(`${indent}📁 Entering: ${fullPath}`);
      result[key] = await translateObject(obj[key], targetLang, fullPath, depth + 1);
    } else if (typeof obj[key] === 'string') {
      // Translate string
      process.stdout.write(`${indent}📝 ${key}: `);
      result[key] = await translateText(obj[key], targetLang);
      console.log('✓');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    } else {
      // Keep non-string values as is
      result[key] = obj[key];
    }
  }
  
  return result;
}

// Function to generate TypeScript code with proper formatting
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

// Count total strings for progress tracking
function countStrings(obj) {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      count++;
    } else if (Array.isArray(obj[key])) {
      count += obj[key].filter(item => typeof item === 'string').length;
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countStrings(obj[key]);
    }
  }
  return count;
}

// Main translation process
async function translateAll() {
  const totalStrings = countStrings(enObj);
  console.log(`\n📊 Total strings to translate: ${totalStrings}\n`);
  
  for (const [langCode, googleLangCode] of Object.entries(languageMap)) {
    console.log(`\n🌍 Translating to ${langCode.toUpperCase()} (${googleLangCode})...`);
    console.log('═'.repeat(50));
    
    try {
      const startTime = Date.now();
      
      // Translate the entire object
      const translatedObj = await translateObject(enObj, googleLangCode);
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n⏱️  Translation completed in ${duration} seconds`);
      
      // Generate TypeScript code
      const header = `// Auto-generated translation file for ${langCode.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API
// Total strings: ${totalStrings}

`;
      
      const tsCode = `export const ${langCode} = {\n${generateTsCode(translatedObj)}\n};\n`;
      
      // Write the file
      const outputPath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
      fs.writeFileSync(outputPath, header + tsCode);
      
      console.log(`✅ Successfully saved ${langCode}.ts`);
      
    } catch (error) {
      console.error(`❌ Error translating ${langCode}:`, error.message);
    }
    
    // Longer delay between languages to avoid rate limiting
    console.log('\n⏳ Waiting before next language...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✨ All translations complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Review the translated files for accuracy');
  console.log('2. Test the language switching in the app');
  console.log('3. Make any necessary manual corrections');
}

// Run the translation
console.log('🚀 Starting translation process...');
translateAll().catch(console.error);