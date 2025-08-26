#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix NHK improved scraper properly
function fixNHKImproved() {
  const filePath = path.join(__dirname, '..', 'netlify', 'functions', 'scrape-nhk-improved.js');
  
  // Read the complete original from old project
  const oldPath = path.join(__dirname, '..', '..', 'doshi-sensei-old', 'netlify', 'functions', 'scrape-nhk-improved.js');
  let content = fs.readFileSync(oldPath, 'utf8');
  
  // Remove all old Firebase initialization
  content = content.replace(/\/\/ Initialize Firebase[\s\S]*?(?=\/\/ Launch browser)/g, '');
  content = content.replace(/let firebaseInitialized = false;\s*let db = null;\s*/g, '');
  content = content.replace(/if \(!admin\.apps\.length\) \{[\s\S]*?\} else \{[\s\S]*?\}/g, '');
  
  // Fix duplicate require in launchBrowser
  content = content.replace(
    /const puppeteerRegular = require\('puppeteer'\);\s*const { filterArticles, quickValidate } = require\('\.\/article-quick-validation'\);/g,
    "const puppeteerRegular = require('puppeteer');"
  );
  
  // Add proper Firebase initialization after imports
  const newFirebaseInit = `
// Global variables for Firebase
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
  
  // Insert after imports
  const importEnd = content.indexOf("const { filterArticles } = require('./article-quick-validation');") + "const { filterArticles } = require('./article-quick-validation');".length;
  content = content.slice(0, importEnd) + '\n' + newFirebaseInit + '\n' + content.slice(importEnd);
  
  // Fix handler to call initializeFirebase
  content = content.replace(
    /exports\.handler = async \(event, context\) => \{[\s\S]*?const startTime = Date\.now\(\);/,
    `exports.handler = async (event, context) => {
  const startTime = Date.now();`
  );
  
  // Add initializeFirebase call after OPTIONS check
  content = content.replace(
    /if \(event\.httpMethod === 'OPTIONS'\) \{[\s\S]*?\}\s*\n/,
    match => match + '\n  // Initialize Firebase if needed\n  await initializeFirebase();\n\n'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed NHK Improved scraper');
}

// Fix Yahoo News scraper
function fixYahooNews() {
  const filePath = path.join(__dirname, '..', 'netlify', 'functions', 'scrape-yahoo-news.js');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if scrapeYahooNews function exists
  if (!content.includes('async function scrapeYahooNews()')) {
    console.log('⚠️ Yahoo News scraper missing main function, needs complete restoration');
    return false;
  }
  
  console.log('✅ Yahoo News scraper structure looks OK');
  return true;
}

// Test scraper locally
async function testScraper(scraperName) {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  console.log(`\n🧪 Testing ${scraperName}...`);
  
  try {
    // Use netlify functions:invoke to test locally
    const cmd = `cd /home/mate/Dev/NextProjects/doshi-sensei && npx netlify functions:invoke ${scraperName} --port 8888`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: 30000 });
    
    if (stdout.includes('success": true')) {
      console.log(`✅ ${scraperName} works!`);
      return true;
    } else {
      console.log(`❌ ${scraperName} failed:`, stdout.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log(`❌ ${scraperName} error:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔧 Final fixes for scrapers...\n');

fixNHKImproved();
fixYahooNews();

console.log('\n✨ Fixes complete!');
console.log('\n📝 Ready to test with: netlify dev');