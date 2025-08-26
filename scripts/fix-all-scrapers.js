#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// The working Firebase initialization code
const firebaseInitCode = `// Global variables for Firebase
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

// List of scraping functions to update
const scraperFiles = [
  'scrape-todaii-next.js',
  'scrape-nhk-easy.js',
  'scrape-nhk-improved.js',
  'scrape-yahoo-news.js',
  'scrape-mainichi-shogakusei.js',
  'scrape-mainichi-news.js',
  'scrape-news-scheduled-enhanced.js',
  'validate-articles-scheduled.js'
];

const functionsDir = path.join(__dirname, '../netlify/functions');

scraperFiles.forEach(file => {
  const filePath = path.join(functionsDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found, skipping...`);
    return;
  }
  
  console.log(`📝 Updating ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find where to insert the initialization code
  // Look for patterns like "let firebaseInitialized" or "if (!admin.apps.length)"
  
  // First, check if it already has initializeFirebase function
  if (content.includes('async function initializeFirebase()')) {
    console.log(`  ✅ ${file} already has initializeFirebase function`);
    return;
  }
  
  // Find the position after the imports and before the first function/handler
  const adminImportMatch = content.match(/const admin = require\(['"]firebase-admin['"]\);/);
  if (!adminImportMatch) {
    console.log(`  ⚠️  ${file} doesn't import firebase-admin, skipping...`);
    return;
  }
  
  // Find where the old Firebase init code starts
  const oldInitPattern = /\/\/ Global variables for Firebase[\s\S]*?(?=\/\/ |async function|function |exports\.|$)/;
  const oldInitMatch = content.match(oldInitPattern);
  
  if (oldInitMatch) {
    // Replace old initialization with new one
    content = content.replace(oldInitPattern, firebaseInitCode + '\n\n');
    console.log(`  ✅ Replaced old Firebase initialization`);
  } else {
    // Find a good place to insert after imports
    const lastImportIndex = content.lastIndexOf('require(');
    const insertPosition = content.indexOf('\n', lastImportIndex) + 1;
    content = content.substring(0, insertPosition) + '\n' + firebaseInitCode + '\n' + content.substring(insertPosition);
    console.log(`  ✅ Inserted new Firebase initialization`);
  }
  
  // Now update the handler to call initializeFirebase()
  // Look for the exports.handler pattern
  const handlerPattern = /exports\.handler\s*=\s*async\s*\([^)]*\)\s*=>\s*{/;
  const handlerMatch = content.match(handlerPattern);
  
  if (handlerMatch) {
    // Find where to add the initialization call
    const handlerStart = handlerMatch.index + handlerMatch[0].length;
    
    // Check if it already calls initializeFirebase
    if (!content.includes('await initializeFirebase()')) {
      // Find the first console.log or try block after the handler start
      const afterHandler = content.substring(handlerStart);
      const tryMatch = afterHandler.match(/\n\s*try\s*{/);
      const consoleMatch = afterHandler.match(/\n\s*console\.log/);
      
      let insertPoint = handlerStart;
      if (tryMatch || consoleMatch) {
        const match = tryMatch || consoleMatch;
        insertPoint = handlerStart + match.index + 1;
        
        // Insert the initialization call
        const indent = '  ';
        const initCall = `${indent}// Initialize Firebase if needed\n${indent}await initializeFirebase();\n\n`;
        content = content.substring(0, insertPoint) + initCall + content.substring(insertPoint);
        console.log(`  ✅ Added initializeFirebase() call to handler`);
      }
    }
  }
  
  // Write the updated file
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ ${file} updated successfully`);
});

console.log('\n✅ All scraper files updated!');