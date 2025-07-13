const fs = require('fs');
const path = require('path');

// Read the English file and extract the object
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Extract the English object using regex
const enMatch = enContent.match(/export const en = (\{[\s\S]*\});/);
if (!enMatch) {
  console.error('Could not extract English object');
  process.exit(1);
}

// Function to parse the object string into actual JavaScript object
function parseObjectString(str) {
  // Remove comments
  str = str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Convert to valid JSON by:
  // 1. Adding quotes to unquoted keys
  str = str.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '"$1":');
  
  // 2. Replace trailing commas
  str = str.replace(/,(\s*[}\]])/g, '$1');
  
  // 3. Handle multi-line strings
  str = str.replace(/\n/g, '\\n');
  
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('Error parsing object:', e.message);
    console.error('First 500 chars:', str.substring(0, 500));
    return null;
  }
}

// Parse English object
const enObj = parseObjectString(enMatch[1]);
if (!enObj) {
  console.error('Failed to parse English object');
  process.exit(1);
}

// Function to generate TypeScript code with unquoted keys
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
        ? '"' + value.replace(/"/g, '\\"').replace(/\\n/g, '\n') + '"'
        : value;
      lines.push(`${indent}${key}: ${escapedValue}${isLast ? '' : ','}`);
    }
  });
  
  return lines.join('\n');
}

// Function to deep merge, keeping translations where they exist
function deepMerge(english, translation) {
  const result = {};
  
  for (const key in english) {
    if (Array.isArray(english[key])) {
      // For arrays, use translation if available, otherwise use English
      result[key] = (translation && Array.isArray(translation[key])) ? translation[key] : english[key];
    } else if (typeof english[key] === 'object' && english[key] !== null) {
      // Nested object
      result[key] = deepMerge(
        english[key], 
        translation && translation[key] && typeof translation[key] === 'object' ? translation[key] : {}
      );
    } else {
      // Use translation if available AND different from English, otherwise use English
      if (translation && translation[key] !== undefined && translation[key] !== english[key]) {
        result[key] = translation[key];
      } else {
        result[key] = english[key];
      }
    }
  }
  
  return result;
}

// Process each translation file
const languages = ['fr', 'it', 'de', 'es', 'ar', 'ko'];

languages.forEach(lang => {
  const translationPath = path.join(__dirname, `../src/config/strings/translations/${lang}.ts`);
  
  if (!fs.existsSync(translationPath)) {
    console.log(`Skipping ${lang} - file does not exist`);
    return;
  }
  
  console.log(`\nProcessing ${lang}...`);
  
  try {
    // Read the translation file
    const content = fs.readFileSync(translationPath, 'utf8');
    
    // Extract the translation object
    const match = content.match(/export const \w+ = (\{[\s\S]*\});/);
    if (!match) {
      console.error(`Could not extract object from ${lang}.ts`);
      return;
    }
    
    // Parse the translation object
    const translationObj = parseObjectString(match[1]);
    if (!translationObj) {
      console.error(`Failed to parse ${lang}.ts`);
      return;
    }
    
    // Count how many translations are actually translated
    let translatedCount = 0;
    let totalCount = 0;
    
    function countTranslations(enObj, transObj, path = '') {
      for (const key in enObj) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof enObj[key] === 'string') {
          totalCount++;
          if (transObj && transObj[key] && transObj[key] !== enObj[key]) {
            translatedCount++;
          }
        } else if (typeof enObj[key] === 'object' && enObj[key] !== null && !Array.isArray(enObj[key])) {
          countTranslations(enObj[key], transObj && transObj[key], fullPath);
        }
      }
    }
    
    countTranslations(enObj, translationObj);
    console.log(`  - Found ${translatedCount}/${totalCount} translated strings (${Math.round(translatedCount/totalCount*100)}%)`);
    
    // Merge with English structure
    const mergedObj = deepMerge(enObj, translationObj);
    
    // Generate new TypeScript code
    const header = `// Auto-generated translation file for ${lang.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Structure aligned with English base file
// Translations: ${translatedCount}/${totalCount} (${Math.round(translatedCount/totalCount*100)}%)

`;
    
    const tsCode = `export const ${lang} = {\n${generateTsCode(mergedObj)}\n};\n`;
    
    // Write the updated file
    fs.writeFileSync(translationPath, header + tsCode);
    console.log(`  ✓ Updated ${lang}.ts with aligned structure`);
    
  } catch (error) {
    console.error(`Error processing ${lang}.ts:`, error.message);
  }
});

console.log('\n✨ Translation alignment complete!');