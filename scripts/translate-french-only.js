const fs = require('fs');
const path = require('path');
const https = require('https');

// Google Translate API key
const API_KEY = 'AIzaSyDfETlyCtkm_-iM8p7G3fCaVqK4bu1wjsg';

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
  
  // Escape special characters that might break JSON
  const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  
  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  
  const data = JSON.stringify({
    q: escapedText,
    source: 'en',
    target: targetLang,
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
          const result = JSON.parse(responseData);
          if (result.data && result.data.translations && result.data.translations[0]) {
            // Decode HTML entities and unescape
            const translated = result.data.translations[0].translatedText
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/\\\\/g, '\\')
              .replace(/\\"/g, '"');
            resolve(translated);
          } else if (result.error) {
            console.error(`\n❌ Translation error for "${text}": ${result.error.message}`);
            resolve(text); // Return original text on error
          } else {
            resolve(text);
          }
        } catch (e) {
          console.error(`\n❌ Parse error: ${e.message}`);
          console.error('Response:', responseData);
          resolve(text);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`\n❌ Request error: ${error.message}`);
      resolve(text); // Return original text on error
    });
    
    req.write(data);
    req.end();
  });
}

// Function to translate an entire object recursively
async function translateObject(obj, targetLang) {
  const result = {};
  
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      // Translate array items
      result[key] = await Promise.all(
        obj[key].map(async (item) => {
          if (typeof item === 'string') {
            const translated = await translateText(item, targetLang);
            await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
            return translated;
          }
          return item;
        })
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursively translate nested objects
      result[key] = await translateObject(obj[key], targetLang);
    } else if (typeof obj[key] === 'string') {
      // Translate string
      result[key] = await translateText(obj[key], targetLang);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
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

// Main translation process
async function translateFrench() {
  console.log('\n🌍 Translating to FRENCH...');
  console.log('This will take a few minutes due to rate limiting...\n');
  
  try {
    const startTime = Date.now();
    
    // Translate the entire object
    const translatedObj = await translateObject(enObj, 'fr');
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n⏱️  Translation completed in ${duration} seconds`);
    
    // Generate TypeScript code
    const header = `// Auto-generated translation file for FRENCH
// Generated on: ${new Date().toISOString()}
// Translated using Google Translate API

`;
    
    const tsCode = `export const fr = {\n${generateTsCode(translatedObj)}\n};\n`;
    
    // Write the file
    const outputPath = path.join(__dirname, '../src/config/strings/translations/fr.ts');
    fs.writeFileSync(outputPath, header + tsCode);
    
    console.log(`✅ Successfully saved fr.ts`);
    console.log('\n📝 Please test the French translation in the app!');
    
  } catch (error) {
    console.error(`❌ Error translating French:`, error.message);
  }
}

// Run the translation
console.log('🚀 Starting French translation...');
translateFrench().catch(console.error);