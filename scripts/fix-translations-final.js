#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read and parse the English file
function getEnglishStructure() {
  const enPath = 'src/config/strings/en.ts';
  const content = fs.readFileSync(enPath, 'utf8');
  const match = content.match(/export const en = ({[\s\S]*});/);
  if (!match) throw new Error('Could not parse en.ts');
  return eval(`(${match[1]})`);
}

// Read flat translations
function readFlatTranslations(langCode) {
  const filePath = `src/config/strings/translations/${langCode}.ts`;
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(new RegExp(`export const ${langCode} = ({[\\s\\S]*});`));
  if (!match) throw new Error(`Could not parse ${langCode}.ts`);
  return eval(`(${match[1]})`);
}

// Deep clone with translation application
function applyTranslations(enObj, translations, langCode) {
  // Start with a deep clone of the English structure
  const result = JSON.parse(JSON.stringify(enObj));
  
  // For each language, we'll keep the English structure but translate specific known sections
  // This ensures all nested objects exist even if we don't have translations
  
  // Add all flat translations to an 'extracted' section
  result.extracted = translations.extracted || {};
  
  // Add any other flat translations that don't have a place in the structure
  Object.entries(translations).forEach(([key, value]) => {
    if (key !== 'extracted' && typeof value === 'string') {
      result.extracted[key] = value;
    }
  });
  
  return result;
}

// Save the translation file
function saveTranslation(langCode, langName, translationObj) {
  const content = `// Auto-generated translation file for ${langName.toUpperCase()}
// Generated on: ${new Date().toISOString()}
// Structure preserved from English base file

export const ${langCode} = ${JSON.stringify(translationObj, null, 2)};

export type ${langCode.toUpperCase()}Keys = keyof typeof ${langCode};
`;

  const filePath = `src/config/strings/translations/${langCode}.ts`;
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed ${langCode}.ts`);
}

// Main function
async function main() {
  console.log('🔧 Fixing translation files with complete English structure...\n');
  
  const languages = {
    'fr': 'French',
    'it': 'Italian',
    'de': 'German',
    'es': 'Spanish',
    'ar': 'Arabic',
    'ko': 'Korean'
  };
  
  try {
    // Get the complete English structure
    const enStructure = getEnglishStructure();
    console.log('📋 Loaded complete English structure');
    console.log(`   Found ${Object.keys(enStructure).length} top-level sections\n`);
    
    // Process each language
    for (const [langCode, langName] of Object.entries(languages)) {
      console.log(`🔄 Processing ${langName}...`);
      
      try {
        // Read current translations
        const currentTranslations = readFlatTranslations(langCode);
        
        // Apply translations to English structure
        const fixedTranslations = applyTranslations(enStructure, currentTranslations, langCode);
        
        // Save the fixed file
        saveTranslation(langCode, langName, fixedTranslations);
        
      } catch (error) {
        console.error(`❌ Error processing ${langName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ All translation files fixed!');
    console.log('\nThe app should now work with all languages.');
    console.log('All sections from the English file are preserved, so components won\'t crash.');
    console.log('\nNote: Most text will still be in English until proper translations are added.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

main();