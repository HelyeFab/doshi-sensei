// Test script to verify scraping functions
require('dotenv').config({ path: '../../.env' });

console.log('Testing environment variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set');

const scrapeFunc = require('./scrape-nhk-easy.js');

// Simulate Netlify event
const event = {
  httpMethod: 'GET',
  headers: {},
  body: null
};

const context = {};

// Call the handler
console.log('\n🚀 Testing NHK Easy scraping function...\n');
scrapeFunc.handler(event, context).then(result => {
  console.log('\n📊 Response:');
  console.log('Status:', result.statusCode);
  const body = JSON.parse(result.body);
  console.log('Success:', body.success);
  
  if (body.success) {
    console.log('Message:', body.message);
    console.log('Articles scraped:', body.articlesCount);
    if (body.articles && body.articles.length > 0) {
      console.log('\n📄 First article:');
      console.log('- Title:', body.articles[0].title);
      console.log('- Content length:', body.articles[0].contentLength);
    }
  } else {
    console.log('Error:', body.error);
  }
}).catch(err => {
  console.error('Handler error:', err.message);
  console.error(err.stack);
});