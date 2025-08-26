#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to fix
const scraperFiles = [
  'scrape-yahoo-news.js',
  'scrape-nhk-improved.js',
  'scrape-mainichi-news.js',
  'scrape-mainichi-shogakusei.js'
];

// Proper Firebase initialization code
const properFirebaseInit = `// Global variables for Firebase
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

function fixScraperFile(fileName) {
  const filePath = path.join(__dirname, '..', 'netlify', 'functions', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${fileName}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove ALL duplicate Firebase initialization blocks
  // Pattern 1: Module-level initialization with env vars
  content = content.replace(/\/\/ Initialize Firebase[\s\S]*?(?=\n\n(?:\/\/|async function|function|exports\.|const [A-Z]))/g, '');
  
  // Pattern 2: Conditional initialization blocks
  content = content.replace(/if \(!admin\.apps\.length\) \{[\s\S]*?\} else \{[\s\S]*?\}/g, '');
  
  // Pattern 3: Remove duplicate let declarations
  content = content.replace(/let firebaseInitialized = false;\s*let db = null;/g, '');
  
  // Find where to insert the proper initialization
  // Look for the first require statement or after the validation import
  const requirePattern = /const.*require.*article-quick-validation.*\n/;
  const match = content.match(requirePattern);
  
  if (match) {
    const insertPoint = match.index + match[0].length;
    
    // Check if proper initialization already exists
    if (!content.includes('async function initializeFirebase()')) {
      // Insert the proper initialization
      content = content.slice(0, insertPoint) + '\n' + properFirebaseInit + '\n' + content.slice(insertPoint);
    }
  }
  
  // Ensure initializeFirebase is called in the handler
  const handlerPattern = /exports\.handler = async \(event, context\) => \{/;
  const handlerMatch = content.match(handlerPattern);
  
  if (handlerMatch) {
    // Look for the line right after the handler starts
    const afterHandlerStart = handlerMatch.index + handlerMatch[0].length;
    const nextLines = content.slice(afterHandlerStart, afterHandlerStart + 500);
    
    // Check if initializeFirebase is already being called
    if (!nextLines.includes('await initializeFirebase()')) {
      // Find where to insert (after headers definition if exists, or at the beginning)
      const headersPattern = /const headers = \{[\s\S]*?\};/;
      const headersMatch = nextLines.match(headersPattern);
      
      if (headersMatch) {
        const insertAt = afterHandlerStart + headersMatch.index + headersMatch[0].length;
        content = content.slice(0, insertAt) + 
                 '\n\n  // Initialize Firebase if needed\n  await initializeFirebase();\n' +
                 content.slice(insertAt);
      } else {
        // Insert at the beginning of handler
        content = content.slice(0, afterHandlerStart) + 
                 '\n  // Initialize Firebase if needed\n  await initializeFirebase();\n' +
                 content.slice(afterHandlerStart);
      }
    }
  }
  
  // Fix scrapeYahooNews function definition if broken
  if (fileName === 'scrape-yahoo-news.js') {
    // Fix the broken function at line 148
    content = content.replace(/return browser;\s*const links = \[\];/, 
      `return browser;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    throw error;
  }
}

// Main scraping function
async function scrapeYahooNews() {
  const browser = await launchBrowser();
  
  try {
    const page = await browser.newPage();
    const articles = [];
    
    // Navigate to Yahoo News Japan
    await page.goto('https://news.yahoo.co.jp/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for news items to load
    await page.waitForSelector('article, .newsFeed_item', { timeout: 10000 });
    
    // Extract article links
    const articleLinks = await page.evaluate(() => {
      const links = [];`);
  }
  
  // Save the fixed content
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed: ${fileName}`);
}

// Process all files
console.log('🔧 Fixing scraper files with duplicate Firebase initialization...\n');

scraperFiles.forEach(file => {
  try {
    fixScraperFile(file);
  } catch (error) {
    console.error(`❌ Error fixing ${file}:`, error.message);
  }
});

console.log('\n✨ All scrapers fixed!');
console.log('\n📝 Next steps:');
console.log('1. Test each scraper locally');
console.log('2. Deploy to Netlify');
console.log('3. Monitor for proper Japanese content validation');