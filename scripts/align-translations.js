const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read and parse the English file
const enPath = path.join(__dirname, '../src/config/strings/en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Create a temporary file to compile the English module
const tempEnPath = path.join(__dirname, 'temp-en.ts');
fs.writeFileSync(tempEnPath, enContent);

// Import the English object
delete require.cache[require.resolve(tempEnPath)];
const { en: enObj } = require(tempEnPath);

// Clean up temp file
fs.unlinkSync(tempEnPath);

// Function to deep merge objects, preserving English structure
function deepMerge(english, translation) {
  const result = {};
  
  for (const key in english) {
    if (typeof english[key] === 'object' && english[key] !== null && !Array.isArray(english[key])) {
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

// Function to generate clean TypeScript code
function generateTsCode(obj, indent = '  ') {
  const lines = [];
  const keys = Object.keys(obj);
  
  keys.forEach((key, index) => {
    const value = obj[key];
    const isLast = index === keys.length - 1;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${indent}${key}: {`);
      lines.push(generateTsCode(value, indent + '  '));
      lines.push(`${indent}}${isLast ? '' : ','}`);
    } else if (Array.isArray(value)) {
      const arrayStr = JSON.stringify(value, null, 2)
        .split('\n')
        .map((line, i) => i === 0 ? line : indent + line)
        .join('\n');
      lines.push(`${indent}${key}: ${arrayStr}${isLast ? '' : ','}`);
    } else {
      const escapedValue = typeof value === 'string' 
        ? JSON.stringify(value)
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
  
  try {
    // Create temp file for the translation
    const tempPath = path.join(__dirname, `temp-${lang}.ts`);
    const content = fs.readFileSync(translationPath, 'utf8');
    
    // Wrap in a module.exports for CommonJS
    const wrappedContent = content.replace(/export const \w+ =/, 'module.exports =');
    fs.writeFileSync(tempPath, wrappedContent);
    
    // Import the translation object
    delete require.cache[require.resolve(tempPath)];
    const translationObj = require(tempPath);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
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
    
  } catch (error) {
    console.error(`Error processing ${lang}.ts:`, error.message);
  }
});

console.log('\nTranslation alignment complete!');
console.log('Now running type check...');