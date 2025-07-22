#!/usr/bin/env node

// Test just the scraping logic without Firebase
const cheerio = require('cheerio');

async function scrapeMainichi() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Mainichi homepage...');
    const response = await fetch('https://mainichi.jp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters\n`);

    const $ = cheerio.load(html);
    const articleLinks = [];
    const seenUrls = new Set();
    
    // Find article links
    const selectors = [
      'article a[href*="/articles/"]',
      '.articlelist a[href*="/articles/"]',
      '.top-news a[href*="/articles/"]',
      '.news-list a[href*="/articles/"]',
      'h2 a[href*="/articles/"]',
      'h3 a[href*="/articles/"]',
      'a.c-article-card__link',
      'a.p-article-card__link'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        if (articleLinks.length >= 3) return false; // Just get 3 for testing
        
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        
        // Skip paid articles
        if (text.includes('有料記事') || href?.includes('premier')) {
          console.log(`⏭️ Skipping paid article: ${text.substring(0, 50)}...`);
          return;
        }
        
        if (href && !seenUrls.has(href)) {
          // Fix URL construction
          let fullUrl = href;
          if (!href.startsWith('http')) {
            fullUrl = href.startsWith('/') ? `https://mainichi.jp${href}` : `https://mainichi.jp/${href}`;
          }
          
          if (fullUrl.includes('mainichi.jp/articles/')) {
            seenUrls.add(fullUrl);
            articleLinks.push({
              url: fullUrl,
              title: text || 'No title'
            });
          }
        }
      });
    });

    console.log(`📰 Found ${articleLinks.length} article links\n`);

    // Fetch content for first article
    if (articleLinks.length > 0) {
      const article = articleLinks[0];
      console.log(`📄 Testing content extraction for:`);
      console.log(`   ${article.title}`);
      console.log(`   ${article.url}\n`);
      
      const articleResponse = await fetch(article.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (articleResponse.ok) {
        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Extract data
        let title = $article('h1').first().text().trim() || 
                   $article('meta[property="og:title"]').attr('content') || '';
        
        let content = '';
        
        // Try our updated selectors
        const contentSelectors = [
          '.articledetail-body',
          'section.articledetail-body',
          '.l-contents'
        ];
        
        for (const selector of contentSelectors) {
          const contentElem = $article(selector);
          if (contentElem.length > 0) {
            console.log(`   Found content in: ${selector}`);
            
            // Check for paywall
            if (contentElem.hasClass('is-mustpay') || contentElem.find('.is-mustpay').length > 0) {
              console.log(`   ⚠️ Paywall detected!`);
              continue;
            }
            
            // Extract paragraphs
            contentElem.find('p').each((idx, elem) => {
              const text = $article(elem).text().trim();
              if (text && text.length > 20 && !text.includes('有料記事')) {
                content += text + '\n\n';
              }
            });
            
            if (content.length > 100) break;
          }
        }
        
        console.log(`\n📊 Extraction Results:`);
        console.log(`   Title: ${title}`);
        console.log(`   Content length: ${content.length} characters`);
        
        if (content) {
          console.log(`\n📝 Content Preview (first 500 chars):`);
          console.log('─'.repeat(60));
          console.log(content.substring(0, 500) + '...');
          console.log('─'.repeat(60));
        } else {
          console.log(`\n❌ No content extracted!`);
        }
      }
    }
    
    // Show all found articles
    console.log(`\n📋 All articles found:`);
    articleLinks.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title}`);
      console.log(`   ${article.url}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the test
console.log('🧪 Testing Mainichi Scraper (without Firebase)\n');
scrapeMainichi();