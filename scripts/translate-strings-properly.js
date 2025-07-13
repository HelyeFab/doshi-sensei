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

// Extract the English object
const enMatch = enContent.match(/export const en = (\{[\s\S]*\});/);
if (!enMatch) {
  console.error('Could not extract English object');
  process.exit(1);
}

// Parse the object string
function parseObjectString(str) {
  str = str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  str = str.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  str = str.replace(/\n/g, '\\n');
  
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('Error parsing:', e.message);
    return null;
  }
}

const enObj = parseObjectString(enMatch[1]);
if (!enObj) {
  console.error('Failed to parse English object');
  process.exit(1);
}

// Function to translate text using Google Translate API
async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  
  // Skip translation for certain strings
  const skipPatterns = [
    /^[A-Z0-9_]+$/, // All caps constants
    /^Doshi Sensei$/i, // App name
    /^[0-9]+$/, // Numbers
    /^JLPT N[1-5]$/, // JLPT levels
    /^Pokédex$/i, // Special names
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
            resolve(result.data.translations[0].translatedText);
          } else if (result.error) {
            console.error(`Translation error: ${result.error.message}`);
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
async function translateObject(obj, targetLang, path = '') {
  const result = {};
  
  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (Array.isArray(obj[key])) {
      // Translate array items
      console.log(`  Translating array: ${fullPath}`);
      result[key] = await Promise.all(
        obj[key].map(item => 
          typeof item === 'string' ? translateText(item, targetLang) : item
        )
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursively translate nested objects
      result[key] = await translateObject(obj[key], targetLang, fullPath);
    } else if (typeof obj[key] === 'string') {
      // Translate string
      process.stdout.write(`  Translating: ${fullPath}... `);
      result[key] = await translateText(obj[key], targetLang);
      console.log('✓');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      // Keep non-string values as is
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
        typeof item === 'string' ? `    "${item.replace(/"/g, '\\"')}"` : `    ${JSON.stringify(item)}`
      ).join(',\n');
      lines.push(`${indent}${key}: [\n${arrayItems}\n${indent}]${isLast ? '' : ','}`);
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${indent}${key}: {`);
      lines.push(generateTsCode(value, indent + '  '));
      lines.push(`${indent}}${isLast ? '' : ','}`);
    } else {
      const escapedValue = typeof value === 'string' 
        ? '"' + value.replace(/"/g, '\\"') + '"'
        : value;
      lines.push(`${indent}${key}: ${escapedValue}${isLast ? '' : ','}`);
    }
  });
  
  return lines.join('\n');
}

// Main translation process
async function translateAll() {
  for (const [langCode, googleLangCode] of Object.entries(languageMap)) {
    console.log(`\n🌍 Translating to ${langCode.toUpperCase()}...`);
    
    try {
      // Translate the entire object
      const translatedObj = await translateObject(enObj, googleLangCode);
      
      // Generate TypeScript code
      const header = `// Auto-generated translation file for ${langCode.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API

`;
      
      const tsCode = `export const ${langCode} = {\n${generateTsCode(translatedObj)}\n};\n`;
      
      // Write the file
      const outputPath = path.join(__dirname, `../src/config/strings/translations/${langCode}.ts`);
      fs.writeFileSync(outputPath, header + tsCode);
      
      console.log(`✅ Successfully translated and saved ${langCode}.ts`);
      
    } catch (error) {
      console.error(`❌ Error translating ${langCode}:`, error.message);
    }
    
    // Longer delay between languages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✨ All translations complete!');
}

// Run the translation
translateAll().catch(console.error);