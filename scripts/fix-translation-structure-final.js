const fs = require('fs');
const path = require('path');

// Read the English base file
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Extract the English object structure
const enMatch = enContent.match(/export const en = (\{[\s\S]*\});/);
if (!enMatch) {
  console.error('Could not extract English object from en.ts');
  process.exit(1);
}

// Parse the English object to get its structure
const enObjectStr = enMatch[1];
const enObj = eval('(' + enObjectStr + ')');

// Function to deep merge objects, preserving English structure
function deepMerge(english, translation) {
  const result = {};
  
  for (const key in english) {
    if (typeof english[key] === 'object' && english[key] !== null) {
      // Nested object
      result[key] = deepMerge(
        english[key], 
        translation && translation[key] && typeof translation[key] === 'object' ? translation[key] : {}
      );
    } else {
      // Use translation if available, otherwise use English
      result[key] = (translation && translation[key] !== undefined) ? translation[key] : english[key];
    }
  }
  
  return result;
}

// Function to generate TypeScript code without quotes on keys
function generateTsCode(obj, indent = '  ') {
  const lines = [];
  const keys = Object.keys(obj);
  
  keys.forEach((key, index) => {
    const value = obj[key];
    const isLast = index === keys.length - 1;
    
    if (typeof value === 'object' && value !== null) {
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

// Process each translation file
const languages = ['fr', 'it', 'de', 'es', 'ar', 'ko'];

languages.forEach(lang => {
  const translationPath = path.join(__dirname, `../src/config/strings/translations/${lang}.ts`);
  
  if (!fs.existsSync(translationPath)) {
    console.log(`Skipping ${lang} - file does not exist`);
    return;
  }
  
  console.log(`Processing ${lang}...`);
  
  // Read the translation file
  const content = fs.readFileSync(translationPath, 'utf8');
  
  // Extract the translation object
  const match = content.match(/export const \w+ = (\{[\s\S]*\});/);
  if (!match) {
    console.error(`Could not extract object from ${lang}.ts`);
    return;
  }
  
  // Parse the translation object
  let translationObj;
  try {
    // Remove quotes from keys and evaluate
    const cleanedStr = match[1]
      .replace(/"([^"]+)":/g, '$1:')  // Remove quotes from keys
      .replace(/'/g, '"');  // Replace single quotes with double quotes
    translationObj = eval('(' + cleanedStr + ')');
  } catch (e) {
    console.error(`Error parsing ${lang}.ts:`, e);
    return;
  }
  
  // Merge with English structure
  const mergedObj = deepMerge(enObj, translationObj);
  
  // Generate new TypeScript code
  const header = `// Auto-generated translation file for ${lang.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Structure aligned with English base file

`;
  
  const tsCode = `export const ${lang} = {\n${generateTsCode(mergedObj)}\n};\n`;
  
  // Write the updated file
  fs.writeFileSync(translationPath, header + tsCode);
  console.log(`✓ Updated ${lang}.ts with aligned structure`);
});

console.log('\nAll translation files have been updated with the correct structure!');