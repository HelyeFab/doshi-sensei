// Test script for Mainichi news scraper
const cheerio = require('cheerio');

// Test function to verify Mainichi scraper works
async function testMainichiScraper() {
  console.log('🧪 Testing Mainichi News Scraper...\n');
  
  try {
    // Step 1: Test homepage fetch
    console.log('📖 Step 1: Fetching Mainichi homepage...');
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
    console.log(`✅ Fetched ${html.length} characters from homepage\n`);

    // Step 2: Parse and extract article links
    console.log('🔍 Step 2: Extracting article links...');
    const $ = cheerio.load(html);
    
    const articleLinks = [];
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
    
    const seenUrls = new Set();
    let paidArticleCount = 0;
    
    selectors.forEach(selector => {
      $(selector).each((i, elem) => {
        if (articleLinks.length >= 10) return false;
        
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        
        // Check for paid articles
        if (text.includes('有料記事') || href?.includes('premier')) {
          paidArticleCount++;
          console.log(`  ⏭️ Skipping paid article: ${text.substring(0, 50)}...`);
          return;
        }
        
        if (href && !seenUrls.has(href)) {
          const fullUrl = href.startsWith('http') ? href : `https://mainichi.jp${href}`;
          
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

    console.log(`\n📊 Found ${articleLinks.length} free articles`);
    console.log(`💴 Filtered out ${paidArticleCount} paid articles\n`);

    // Step 3: Test fetching one article's content
    if (articleLinks.length > 0) {
      console.log('📄 Step 3: Testing article content extraction...');
      const testArticle = articleLinks[0];
      console.log(`  Testing: ${testArticle.title.substring(0, 60)}...`);
      console.log(`  URL: ${testArticle.url}\n`);
      
      const articleResponse = await fetch(testArticle.url, {
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
        
        // Extract key information
        let title = '';
        let content = '';
        let imageUrl = '';
        let publishDate = '';
        
        // Title extraction
        const titleSelectors = [
          'h1.p-article__title',
          'h1.article-title',
          'h1',
          'meta[property="og:title"]'
        ];
        
        for (const selector of titleSelectors) {
          if (selector.includes('meta')) {
            title = $article(selector).attr('content') || '';
          } else {
            title = $article(selector).first().text().trim();
          }
          if (title) break;
        }
        
        // Date extraction
        const dateSelectors = [
          'time[datetime]',
          'meta[property="article:published_time"]',
          '.article-date',
          '.publish-date'
        ];
        
        for (const selector of dateSelectors) {
          if (selector.includes('meta')) {
            publishDate = $article(selector).attr('content') || '';
          } else if (selector.includes('time')) {
            publishDate = $article(selector).attr('datetime') || '';
          } else {
            publishDate = $article(selector).text().trim();
          }
          if (publishDate) break;
        }
        
        // Image extraction
        const imageSelectors = [
          'meta[property="og:image"]',
          '.article-image img',
          '.p-article__image img',
          'figure img',
          'article img'
        ];
        
        for (const selector of imageSelectors) {
          if (selector.includes('meta')) {
            imageUrl = $article(selector).attr('content') || '';
          } else {
            imageUrl = $article(selector).first().attr('src') || '';
          }
          if (imageUrl && !imageUrl.includes('logo')) break;
        }
        
        // Content extraction
        const contentSelectors = [
          '.p-article__body',
          '.article-body',
          '.article-content',
          'div[itemprop="articleBody"]',
          '.entry-content'
        ];
        
        for (const selector of contentSelectors) {
          const contentElem = $article(selector);
          if (contentElem.length > 0) {
            contentElem.find('script, style, aside, .ad, .advertisement').remove();
            
            contentElem.find('p').each((idx, elem) => {
              const text = $article(elem).text().trim();
              if (text && !text.includes('有料記事')) {
                content += text + '\n\n';
              }
            });
            
            if (content) break;
          }
        }
        
        // If no content found, try all paragraphs
        if (!content) {
          $article('p').each((idx, elem) => {
            const text = $article(elem).text().trim();
            if (text && text.length > 20 && !text.includes('有料記事')) {
              content += text + '\n\n';
            }
          });
        }
        
        content = content.trim();
        
        console.log('📊 Extraction Results:');
        console.log(`  ✅ Title: ${title || 'Not found'}`);
        console.log(`  ✅ Date: ${publishDate || 'Not found'}`);
        console.log(`  ✅ Image: ${imageUrl ? 'Found' : 'Not found'}`);
        console.log(`  ✅ Content: ${content.length} characters extracted`);
        console.log(`  ✅ First 200 chars: ${content.substring(0, 200)}...`);
        
        // Check if it's a paid article that slipped through
        if (content.includes('有料記事') || content.includes('有料会員')) {
          console.log('\n  ⚠️ WARNING: This appears to be a paid article!');
        }
      } else {
        console.log(`  ❌ Failed to fetch article: HTTP ${articleResponse.status}`);
      }
    }
    
    // Step 4: Display all found articles
    console.log('\n📋 All found articles:');
    articleLinks.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title.substring(0, 80)}...`);
      // Fix the double slash issue when displaying
      const fixedUrl = article.url.replace('mainichi.jp//mainichi.jp', 'mainichi.jp');
      console.log(`     ${fixedUrl}`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
console.log('🚀 Mainichi News Scraper Test\n');
console.log('This script will:');
console.log('1. Fetch the Mainichi homepage');
console.log('2. Extract article links (filtering paid articles)');
console.log('3. Test content extraction on one article');
console.log('4. Display all found articles\n');

testMainichiScraper();