#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the English file to get the structure
function getEnglishStructure() {
  const enPath = 'src/config/strings/en.ts';
  const content = fs.readFileSync(enPath, 'utf8');
  
  // Extract the object
  const match = content.match(/export const en = ({[\s\S]*});/);
  if (!match) {
    throw new Error('Could not parse en.ts');
  }
  
  // Evaluate to get the object
  const enObj = eval(`(${match[1]})`);
  return enObj;
}

// Read a translation file
function readTranslationFile(langCode) {
  const filePath = `src/config/strings/translations/${langCode}.ts`;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the object
  const match = content.match(new RegExp(`export const ${langCode} = ({[\\s\\S]*});`));
  if (!match) {
    throw new Error(`Could not parse ${langCode}.ts`);
  }
  
  // Evaluate to get the object
  const obj = eval(`(${match[1]})`);
  return obj;
}

// Create nested structure matching English
function createNestedStructure(enStructure, flatTranslations) {
  const nested = JSON.parse(JSON.stringify(enStructure)); // Deep clone
  
  // Helper function to set nested value
  function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
  
  // Helper function to traverse and update
  function traverse(obj, path = '') {
    for (const key in obj) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key], fullPath);
      } else {
        // Try to find a matching translation
        // First try exact path match
        let translatedValue = null;
        
        // Try different key formats
        const possibleKeys = [
          fullPath,
          fullPath.replace(/\./g, '_'),
          `components_${fullPath.replace(/\./g, '_')}`,
          `app_${fullPath.replace(/\./g, '_')}`,
          key
        ];
        
        for (const possibleKey of possibleKeys) {
          if (flatTranslations[possibleKey]) {
            translatedValue = flatTranslations[possibleKey];
            break;
          }
        }
        
        if (translatedValue) {
          obj[key] = translatedValue;
        }
        // If no translation found, keep the English value
      }
    }
  }
  
  // Add the extracted translations that might not be in the English structure
  if (flatTranslations.extracted) {
    nested.extracted = flatTranslations.extracted;
  }
  
  // Process the nested structure
  traverse(nested);
  
  // Also add any extracted keys that don't exist in the English structure
  for (const [key, value] of Object.entries(flatTranslations)) {
    if (key.startsWith('components_') || key.startsWith('app_') || key.includes('_page_')) {
      if (!nested.extracted) {
        nested.extracted = {};
      }
      nested.extracted[key] = value;
    }
  }
  
  return nested;
}

// Save the updated translation file
function saveTranslation(langCode, langName, nestedObj) {
  const content = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Structure matched with English base file

export const ${langCode} = ${JSON.stringify(nestedObj, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;

  const filePath = `src/config/strings/translations/${langCode}.ts`;
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${langCode}.ts with nested structure`);
}

// Main function
function main() {
  console.log('🔧 Fixing translation file structure...\n');
  
  const languages = {
    'fr': 'French',
    'it': 'Italian',
    'de': 'German',
    'es': 'Spanish',
    'ar': 'Arabic',
    'ko': 'Korean'
  };
  
  try {
    // Get English structure
    const enStructure = getEnglishStructure();
    console.log('📋 Loaded English structure');
    
    // Process each language
    for (const [langCode, langName] of Object.entries(languages)) {
      console.log(`\n🔄 Processing ${langName}...`);
      
      try {
        // Read flat translations
        const flatTranslations = readTranslationFile(langCode);
        
        // Create nested structure
        const nestedTranslations = createNestedStructure(enStructure, flatTranslations);
        
        // Save updated file
        saveTranslation(langCode, langName, nestedTranslations);
        
      } catch (error) {
        console.error(`❌ Error processing ${langName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Translation structure fixed!');
    console.log('\n🎯 Next steps:');
    console.log('1. Test the app with different languages');
    console.log('2. The nested structure should now match the English file');
    console.log('3. Components accessing nested properties should work');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Run the script
main();