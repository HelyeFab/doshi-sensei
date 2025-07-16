// Test script to verify scrapers are working locally
// Run with: node scripts/test-scrapers.js

const scrapers = [
  { name: 'NHK Easy', url: 'http://localhost:8888/.netlify/functions/scrape-nhk-easy' },
  { name: 'NHK Easy Puppeteer', url: 'http://localhost:8888/.netlify/functions/scrape-nhk-easy-puppeteer' },
  { name: 'Todaii', url: 'http://localhost:8888/.netlify/functions/scrape-todaii-next' },
  { name: 'Todaii Puppeteer', url: 'http://localhost:8888/.netlify/functions/scrape-todaii-puppeteer' },
  { name: 'Watanoc', url: 'http://localhost:8888/.netlify/functions/scrape-watanoc-next' },
  { name: 'Watanoc Puppeteer', url: 'http://localhost:8888/.netlify/functions/scrape-watanoc-puppeteer' }
];

async function testScraper(scraper) {
  console.log(`\n🧪 Testing ${scraper.name}...`);
  
  try {
    const response = await fetch(scraper.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ ${scraper.name}: Success!`);
      console.log(`   - Articles scraped: ${data.articlesCount}`);
      console.log(`   - Execution time: ${data.executionTime}ms`);
      
      // If we have article details, show the first one
      if (data.articles && data.articles.length > 0) {
        const firstArticle = data.articles[0];
        console.log(`   - Sample article: "${firstArticle.title}" (${firstArticle.difficulty || 'N/A'})`);
      }
    } else {
      console.log(`❌ ${scraper.name}: Failed`);
      console.log(`   - Error: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ ${scraper.name}: Network error`);
    console.log(`   - Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting scraper tests...');
  console.log('Make sure you have Netlify Dev running (npm run dev:netlify)');
  
  for (const scraper of scrapers) {
    await testScraper(scraper);
  }
  
  console.log('\n✨ All tests completed!');
}

// Run the tests
runTests().catch(console.error);