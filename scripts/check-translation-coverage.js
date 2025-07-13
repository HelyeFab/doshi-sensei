#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load and parse a language file
function loadLanguageFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the language code from the file path
  const langCode = path.basename(filePath, '.ts');
  
  // Find the export statement
  const pattern = new RegExp(`export const ${langCode} = {`);
  const startIndex = content.search(pattern);
  if (startIndex === -1) {
    return null;
  }
  
  // Count the number of string literals (basic approach)
  const stringMatches = content.match(/"[^"]*"|'[^']*'/g);
  return stringMatches ? stringMatches.length : 0;
}

// Count keys in nested object
function countKeys(obj) {
  let count = 0;
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      count++;
    } else if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'object' && value !== null) {
      count += countKeys(value);
    }
  }
  
  return count;
}

// Main function
function main() {
  console.log('Translation Coverage Report');
  console.log('===========================\n');
  
  const languages = ['en', 'fr', 'de', 'it', 'es', 'ar', 'ko'];
  const basePath = path.join(__dirname, '../src/config/strings');
  
  // Get English string count
  const enPath = path.join(basePath, 'en.ts');
  const enCount = loadLanguageFile(enPath);
  
  console.log(`English (base): ~${enCount} strings\n`);
  
  // Check each translation
  languages.slice(1).forEach(lang => {
    const langPath = path.join(basePath, 'translations', `${lang}.ts`);
    const count = loadLanguageFile(langPath);
    
    if (count === null) {
      console.log(`${lang.toUpperCase()}: File not found`);
    } else {
      const percentage = Math.round((count / enCount) * 100);
      console.log(`${lang.toUpperCase()}: ~${count} strings (${percentage}%)`);
    }
  });
}

main();