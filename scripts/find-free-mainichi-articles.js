#!/usr/bin/env node

// Script to find free articles on Mainichi
const cheerio = require('cheerio');

async function findFreeArticles() {
  console.log('🔍 Searching for free articles on Mainichi...\n');
  
  try {
    // Try different sections that might have free content
    const sections = [
      { url: 'https://mainichi.jp/', name: 'Homepage' },
      { url: 'https://mainichi.jp/english/', name: 'English' },
      { url: 'https://mainichi.jp/ch/', name: 'Local News' },
      { url: 'https://mainichi.jp/shakai/', name: 'Society' },
      { url: 'https://mainichi.jp/sports/', name: 'Sports' }
    ];
    
    for (const section of sections) {
      console.log(`\n📂 Checking ${section.name} section...`);
      console.log(`   URL: ${section.url}`);
      
      try {
        const response = await fetch(section.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ja,en;q=0.9',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          console.log(`   ❌ Failed: HTTP ${response.status}`);
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Find all article links
        const articles = [];
        $('a[href*="/articles/"]').each((i, elem) => {
          const href = $(elem).attr('href');
          const text = $(elem).text().trim();
          
          if (href && text && !articles.find(a => a.url === href)) {
            const isPaid = text.includes('有料記事') || 
                          text.includes('有料会員') ||
                          href.includes('premier') ||
                          $(elem).find('.paid').length > 0 ||
                          $(elem).closest('.paid').length > 0;
            
            articles.push({
              url: href.startsWith('http') ? href : `https://mainichi.jp${href}`,
              title: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
              isPaid
            });
          }
        });
        
        const freeArticles = articles.filter(a => !a.isPaid);
        const paidArticles = articles.filter(a => a.isPaid);
        
        console.log(`   ✅ Found ${articles.length} articles total`);
        console.log(`   📰 Free: ${freeArticles.length}`);
        console.log(`   💴 Paid: ${paidArticles.length}`);
        
        if (freeArticles.length > 0) {
          console.log(`\n   Free articles:`);
          freeArticles.slice(0, 3).forEach((article, idx) => {
            console.log(`   ${idx + 1}. ${article.title}`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Now test a specific free article if we found one
    console.log('\n' + '='.repeat(60));
    console.log('📄 Testing content extraction on a sports article...\n');
    
    const testUrl = 'https://mainichi.jp/sports/';
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find first article link in sports
    let articleUrl = null;
    $('a[href*="/articles/"]').each((i, elem) => {
      if (articleUrl) return false;
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      if (href && !text.includes('有料') && href.includes('/sports/')) {
        articleUrl = href.startsWith('http') ? href : `https://mainichi.jp${href}`;
        console.log(`Found sports article: ${text.substring(0, 60)}...`);
        console.log(`URL: ${articleUrl}`);
        return false;
      }
    });
    
    if (articleUrl) {
      console.log('\nFetching article content...');
      const articleRes = await fetch(articleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      const articleHtml = await articleRes.text();
      const $article = cheerio.load(articleHtml);
      
      // Check for various content containers
      const containers = [
        '.articledetail-body:not(.is-mustpay)',
        '.article-body:not(.paid)',
        '.content-body',
        'article',
        'main'
      ];
      
      let found = false;
      for (const selector of containers) {
        const elem = $article(selector).first();
        if (elem.length > 0) {
          const paragraphs = elem.find('p');
          console.log(`\n✅ Found content in: ${selector}`);
          console.log(`   Paragraphs: ${paragraphs.length}`);
          
          if (paragraphs.length > 0) {
            console.log(`   First paragraph: ${paragraphs.first().text().substring(0, 100)}...`);
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        console.log('\n❌ No content found in standard containers');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the search
findFreeArticles();