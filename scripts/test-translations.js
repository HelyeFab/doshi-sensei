#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load a language file and parse it
function loadLanguageFile(langCode) {
  const filePath = langCode === 'en' 
    ? path.join(__dirname, '../src/config/strings/en.ts')
    : path.join(__dirname, '../src/config/strings/translations', `${langCode}.ts`);
    
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Extract the export
    const match = content.match(/export const \w+ = (\{[\s\S]*\});?\s*$/);
    if (!match) return null;
    
    const evalFunc = new Function(`return ${match[1]}`);
    return evalFunc();
  } catch (e) {
    console.error(`Error parsing ${langCode}:`, e.message);
    return null;
  }
}

// Test specific strings
function testTranslations() {
  const languages = ['en', 'es', 'ar', 'ko', 'fr', 'de', 'it'];
  const testKeys = [
    'appName',
    'nav.home',
    'home.title',
    'settings.language',
    'common.save'
  ];
  
  console.log('Translation Test Results');
  console.log('=======================\n');
  
  // Load all languages
  const translations = {};
  languages.forEach(lang => {
    translations[lang] = loadLanguageFile(lang);
  });
  
  // Test each key
  testKeys.forEach(key => {
    console.log(`\nKey: ${key}`);
    console.log('-'.repeat(50));
    
    languages.forEach(lang => {
      const value = key.split('.').reduce((obj, k) => obj?.[k], translations[lang]);
      console.log(`${lang.toUpperCase()}: ${value || 'MISSING'}`);
    });
  });
  
  // Count total keys
  console.log('\n\nTotal Key Count');
  console.log('===============');
  
  function countKeys(obj) {
    let count = 0;
    
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'string') {
        count++;
      } else if (Array.isArray(value)) {
        count++;
      } else if (typeof value === 'object' && value !== null) {
        count += countKeys(value);
      }
    }
    
    return count;
  }
  
  languages.forEach(lang => {
    const count = translations[lang] ? countKeys(translations[lang]) : 0;
    console.log(`${lang.toUpperCase()}: ${count} keys`);
  });
}

testTranslations();