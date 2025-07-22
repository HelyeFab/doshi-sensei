#!/usr/bin/env node

/**
 * Test script to run the Mainichi scraper Netlify function locally
 * Run with: node scripts/test-mainichi-function.js
 */

console.log('🧪 Testing Mainichi Scraper Netlify Function\n');

async function testMainichiFunction() {
  try {
    // Check if running locally with Netlify CLI
    const isNetlifyDev = process.env.NETLIFY_DEV === 'true';
    const baseUrl = isNetlifyDev ? 'http://localhost:8888' : 'http://localhost:8888';
    
    console.log('📡 Testing function endpoint...');
    console.log(`   URL: ${baseUrl}/.netlify/functions/scrape-mainichi-news\n`);
    
    // Make request to the function
    const response = await fetch(`${baseUrl}/.netlify/functions/scrape-mainichi-news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('📊 Function Response:');
    console.log('   Success:', result.success ? '✅' : '❌');
    console.log('   Articles scraped:', result.articlesCount || 0);
    console.log('   Articles saved:', result.savedCount || 0);
    console.log('   Source:', result.source);
    
    if (result.articles && result.articles.length > 0) {
      console.log('\n📰 Articles Found:');
      result.articles.forEach((article, index) => {
        console.log(`\n   ${index + 1}. ${article.title}`);
        console.log(`      URL: ${article.url}`);
        console.log(`      Content: ${article.contentLength} characters`);
      });
    }
    
    if (result.error) {
      console.log('\n❌ Error:', result.error);
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 Make sure you are running the Netlify dev server:');
    console.log('   npm run dev:netlify');
    console.log('   or');
    console.log('   netlify dev');
  }
}

// Check if Firebase environment variables are set
console.log('🔐 Checking environment variables...');
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables:', missingVars.join(', '));
  console.log('   Make sure your .env file contains all Firebase credentials\n');
} else {
  console.log('✅ All required environment variables are set\n');
}

// Run the test
testMainichiFunction();