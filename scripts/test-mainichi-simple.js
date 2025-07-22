#!/usr/bin/env node

// Simple test of the Mainichi scraper function
const { handler } = require('../netlify/functions/scrape-mainichi-news.js');

async function testMainichiScraper() {
  console.log('🧪 Testing Mainichi News Scraper Function\n');
  
  // Mock the event object
  const event = {
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ test: true })
  };
  
  const context = {};
  
  try {
    console.log('📡 Calling scraper function...\n');
    const result = await handler(event, context);
    
    console.log('📊 Response Status:', result.statusCode);
    
    if (result.body) {
      const body = JSON.parse(result.body);
      console.log('✅ Success:', body.success);
      console.log('📰 Articles scraped:', body.articlesCount || 0);
      console.log('💾 Articles saved:', body.savedCount || 0);
      console.log('📍 Source:', body.source);
      
      if (body.articles && body.articles.length > 0) {
        console.log('\n📋 Articles Found:');
        body.articles.forEach((article, index) => {
          console.log(`\n${index + 1}. ${article.title}`);
          console.log(`   URL: ${article.url}`);
          console.log(`   Content: ${article.contentLength} characters`);
        });
      }
      
      if (body.error) {
        console.log('\n❌ Error:', body.error);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Check environment variables
console.log('🔐 Checking Firebase credentials...');
const hasFirebaseCreds = !!(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL
);

if (!hasFirebaseCreds) {
  console.log('⚠️  Firebase credentials not found in environment variables');
  console.log('   The scraper will work but won\'t save to Firebase\n');
} else {
  console.log('✅ Firebase credentials found\n');
}

// Run the test
testMainichiScraper();