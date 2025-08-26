#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Scrapers that need to be restored and fixed
const scrapersToFix = [
  'scrape-nhk-improved.js',
  'scrape-mainichi-news.js',
  'scrape-mainichi-shogakusei.js'
];

// New Firebase initialization that works with Gist
const newFirebaseInit = `// Global variables for Firebase
let firebaseInitialized = false;
let db = null;

// Initialize Firebase function
async function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length) {
    db = admin.firestore();
    firebaseInitialized = true;
    return true;
  }
  
  try {
    // Try to fetch from GitHub Gist first (for production)
    const gistUrl = 'https://gist.githubusercontent.com/HelyeFab/4a363e7fabaa387b67fa80b5c8cb87d4/raw/firebase-config.json';
    
    console.log('🔄 Fetching Firebase credentials from secure source...');
    const response = await fetch(gistUrl);
    
    if (response.ok) {
      const serviceAccount = await response.json();
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized from secure source');
      return true;
    } else {
      throw new Error('Failed to fetch from Gist');
    }
  } catch (error) {
    // Fallback to local file for development
    try {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, 'firebase-config.json');
      
      if (fs.existsSync(configPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized from local file');
        return true;
      }
    } catch (fileError) {
      console.error('❌ Failed to read local file:', fileError.message);
    }
    
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    firebaseInitialized = false;
    return false;
  }
}`;

function restoreAndFixScraper(fileName) {
  const oldPath = path.join(__dirname, '..', '..', 'doshi-sensei-old', 'netlify', 'functions', fileName);
  const newPath = path.join(__dirname, '..', 'netlify', 'functions', fileName);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`⚠️ Old file not found: ${fileName}`);
    return;
  }
  
  // Read the old file
  let content = fs.readFileSync(oldPath, 'utf8');
  
  // Remove ALL old Firebase initialization patterns
  // Pattern 1: Module-level initialization
  content = content.replace(/\/\/ Initialize Firebase[\s\S]*?(?=\n(?:\/\/|async function|function|exports\.|const [A-Z]))/g, '');
  
  // Pattern 2: Conditional blocks
  content = content.replace(/if \(!admin\.apps\.length\) \{[\s\S]*?\} else \{[\s\S]*?\}/g, '');
  
  // Pattern 3: Simple let declarations
  content = content.replace(/let firebaseInitialized = false;\s*let db = null;\s*/g, '');
  
  // Pattern 4: Duplicate imports (for NHK improved)
  content = content.replace(/const { filterArticles, quickValidate } = require\('\.\/article-quick-validation'\);\s*/g, '');
  
  // Insert new Firebase initialization after the imports
  const lastImportMatch = content.match(/const.*require\(.*\);/g);
  if (lastImportMatch) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const insertPoint = content.indexOf(lastImport) + lastImport.length;
    content = content.slice(0, insertPoint) + '\n\n' + newFirebaseInit + '\n' + content.slice(insertPoint);
  }
  
  // Ensure initializeFirebase() is called in the handler
  const handlerPattern = /exports\.handler = async \(event, context\) => \{/;
  const handlerMatch = content.match(handlerPattern);
  
  if (handlerMatch) {
    const afterHandlerStart = handlerMatch.index + handlerMatch[0].length;
    const nextSection = content.slice(afterHandlerStart, afterHandlerStart + 1000);
    
    // Check if we need to add the initialization call
    if (!nextSection.includes('await initializeFirebase()')) {
      // Find where to insert (after headers and OPTIONS check)
      const optionsPattern = /if \(event\.httpMethod === 'OPTIONS'\) \{[\s\S]*?\}\s*\n/;
      const optionsMatch = nextSection.match(optionsPattern);
      
      if (optionsMatch) {
        const insertAt = afterHandlerStart + optionsMatch.index + optionsMatch[0].length;
        content = content.slice(0, insertAt) + 
                 '\n  const startTime = Date.now();\n  // Initialize Firebase if needed\n  await initializeFirebase();\n\n' +
                 content.slice(insertAt);
      } else {
        // Insert right after headers definition
        const headersPattern = /const headers = \{[\s\S]*?\};\s*\n/;
        const headersMatch = nextSection.match(headersPattern);
        
        if (headersMatch) {
          const insertAt = afterHandlerStart + headersMatch.index + headersMatch[0].length;
          content = content.slice(0, insertAt) + 
                   '\n  // Initialize Firebase if needed\n  await initializeFirebase();\n\n' +
                   content.slice(insertAt);
        }
      }
    }
    
    // Remove any duplicate startTime declarations
    content = content.replace(/const startTime = Date\.now\(\);\s*/g, '');
    // Add one startTime declaration at the beginning of handler
    const handlerStartIndex = handlerMatch.index + handlerMatch[0].length;
    const beforeHeaders = content.slice(0, handlerStartIndex) + '\n  const startTime = Date.now();\n';
    const afterHeaders = content.slice(handlerStartIndex);
    content = beforeHeaders + afterHeaders;
  }
  
  // Special fix for NHK improved - ensure launchBrowser is complete
  if (fileName === 'scrape-nhk-improved.js') {
    // Fix the duplicate require statement in launchBrowser
    content = content.replace(
      /const puppeteerRegular = require\('puppeteer'\);\s*const { filterArticles, quickValidate } = require\('\.\/article-quick-validation'\);/g,
      "const puppeteerRegular = require('puppeteer');"
    );
  }
  
  // Save the fixed file
  fs.writeFileSync(newPath, content);
  console.log(`✅ Restored and fixed: ${fileName}`);
}

// Process all scrapers
console.log('🔧 Restoring and fixing broken scrapers...\n');

scrapersToFix.forEach(file => {
  try {
    restoreAndFixScraper(file);
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

// Also ensure Yahoo News scraper doesn't have issues
const yahooPath = path.join(__dirname, '..', 'netlify', 'functions', 'scrape-yahoo-news.js');
if (fs.existsSync(yahooPath)) {
  let yahooContent = fs.readFileSync(yahooPath, 'utf8');
  
  // Check if it has duplicate Firebase initialization
  const firebaseInitCount = (yahooContent.match(/let firebaseInitialized = false/g) || []).length;
  if (firebaseInitCount > 1) {
    console.log('🔧 Fixing Yahoo News scraper duplicates...');
    
    // Remove ALL old initialization except the one in our new function
    yahooContent = yahooContent.replace(/\/\/ Global variables for Firebase\s*\n\s*\n\s*\n\s*/g, '');
    yahooContent = yahooContent.replace(/let firebaseInitialized = false;\s*let db = null;\s*/g, '');
    
    // Re-add it properly if needed
    if (!yahooContent.includes('async function initializeFirebase()')) {
      const lastImport = yahooContent.lastIndexOf("require('./article-quick-validation')");
      const lineEnd = yahooContent.indexOf('\n', lastImport);
      yahooContent = yahooContent.slice(0, lineEnd + 1) + '\n' + newFirebaseInit + '\n' + yahooContent.slice(lineEnd + 1);
    }
    
    fs.writeFileSync(yahooPath, yahooContent);
    console.log('✅ Fixed Yahoo News scraper');
  }
}

console.log('\n✨ All scrapers restored and fixed!');
console.log('\n📝 Next: Test each scraper locally with netlify dev');