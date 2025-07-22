// Detailed test script for Mainichi scraper - shows full article content
const cheerio = require('cheerio');

async function testMainichiDetailed() {
  console.log('🧪 Detailed Mainichi News Scraper Test\n');
  
  try {
    // Step 1: Fetch homepage
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
    console.log(`✅ Fetched homepage (${html.length} characters)\n`);

    // Step 2: Extract first few article links
    const $ = cheerio.load(html);
    const articleLinks = [];
    const seenUrls = new Set();
    
    // Find article links
    $('a[href*="/articles/"]').each((i, elem) => {
      if (articleLinks.length >= 3) return false; // Just get 3 for testing
      
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      // Skip paid articles
      if (text.includes('有料記事') || href?.includes('premier')) {
        console.log(`⏭️ Skipping paid: ${text.substring(0, 50)}...`);
        return;
      }
      
      if (href && href.includes('/articles/')) {
        // Fix the URL construction
        let fullUrl = href;
        if (!href.startsWith('http')) {
          // Remove leading slash if present to avoid double slashes
          fullUrl = href.startsWith('/') ? `https://mainichi.jp${href}` : `https://mainichi.jp/${href}`;
        }
        
        if (!seenUrls.has(fullUrl)) {
          seenUrls.add(fullUrl);
          articleLinks.push({
            url: fullUrl,
            title: text || 'No title'
          });
          console.log(`Found: ${text.substring(0, 60)}...`);
          console.log(`URL: ${fullUrl}\n`);
        }
      }
    });

    console.log(`\n📊 Found ${articleLinks.length} articles to test\n`);
    console.log('='*80 + '\n');

    // Step 3: Fetch and display full content for each article
    for (let i = 0; i < articleLinks.length; i++) {
      const article = articleLinks[i];
      console.log(`📄 Article ${i + 1}/${articleLinks.length}: ${article.title.substring(0, 60)}...`);
      console.log(`URL: ${article.url}\n`);
      
      try {
        const articleResponse = await fetch(article.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ja,en;q=0.9',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!articleResponse.ok) {
          console.log(`❌ Failed to fetch: HTTP ${articleResponse.status}\n`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Extract all the data
        const extractedData = {
          title: '',
          date: '',
          image: '',
          content: '',
          category: '',
          author: ''
        };
        
        // Title
        const titleSelectors = [
          'h1.p-article__title',
          'h1.article-title',
          'h1[class*="article"]',
          'meta[property="og:title"]',
          'h1'
        ];
        
        for (const sel of titleSelectors) {
          if (sel.includes('meta')) {
            extractedData.title = $article(sel).attr('content') || '';
          } else {
            extractedData.title = $article(sel).first().text().trim();
          }
          if (extractedData.title) break;
        }
        
        // Date
        const dateSelectors = [
          'time[datetime]',
          'meta[property="article:published_time"]',
          '.date',
          '.published-date',
          '[class*="date"]'
        ];
        
        for (const sel of dateSelectors) {
          if (sel.includes('meta')) {
            extractedData.date = $article(sel).attr('content') || '';
          } else if (sel === 'time[datetime]') {
            extractedData.date = $article(sel).attr('datetime') || $article(sel).text().trim();
          } else {
            extractedData.date = $article(sel).first().text().trim();
          }
          if (extractedData.date) break;
        }
        
        // Image
        extractedData.image = $article('meta[property="og:image"]').attr('content') || 
                            $article('article img').first().attr('src') || 
                            $article('figure img').first().attr('src') || '';
        
        // Category/Tags
        extractedData.category = $article('.category').text().trim() ||
                                $article('[class*="category"]').first().text().trim() ||
                                $article('.tag').first().text().trim() || '';
        
        // Author
        extractedData.author = $article('.author').text().trim() ||
                              $article('[class*="author"]').text().trim() || '';
        
        // Content - try multiple strategies
        let content = '';
        
        // Strategy 1: Look for article body containers
        const bodySelectors = [
          '.p-article__body',
          '.article-body',
          '.article__body',
          '[class*="article-body"]',
          '.entry-content',
          'div[itemprop="articleBody"]',
          '.content-body',
          'main article'
        ];
        
        for (const sel of bodySelectors) {
          const bodyElem = $article(sel).first();
          if (bodyElem.length > 0) {
            // Clean up
            bodyElem.find('script, style, .ad, .advertisement, aside').remove();
            
            // Get paragraphs
            bodyElem.find('p').each((idx, p) => {
              const text = $article(p).text().trim();
              if (text && text.length > 10 && !text.includes('有料記事')) {
                content += text + '\n\n';
              }
            });
            
            if (content.length > 100) break;
          }
        }
        
        // Strategy 2: If no content yet, try all paragraphs in main/article
        if (content.length < 100) {
          $article('main p, article p').each((idx, p) => {
            const text = $article(p).text().trim();
            if (text && text.length > 20 && 
                !text.includes('有料記事') && 
                !text.includes('ログイン') &&
                !text.includes('会員登録')) {
              content += text + '\n\n';
            }
          });
        }
        
        extractedData.content = content.trim();
        
        // Display results
        console.log('📊 Extracted Data:');
        console.log('─'.repeat(60));
        console.log(`Title: ${extractedData.title || '❌ Not found'}`);
        console.log(`Date: ${extractedData.date || '❌ Not found'}`);
        console.log(`Category: ${extractedData.category || '❌ Not found'}`);
        console.log(`Author: ${extractedData.author || 'Not found'}`);
        console.log(`Image: ${extractedData.image ? '✅ Found' : '❌ Not found'}`);
        console.log(`Content Length: ${extractedData.content.length} characters`);
        
        if (extractedData.content) {
          console.log('\n📝 Content Preview (first 500 chars):');
          console.log('─'.repeat(60));
          console.log(extractedData.content.substring(0, 500) + '...');
          
          // Check for paywall indicators
          if (extractedData.content.includes('有料記事') || 
              extractedData.content.includes('有料会員') ||
              extractedData.content.includes('続きを読む')) {
            console.log('\n⚠️  WARNING: This might be a paid/partial article!');
          }
        } else {
          console.log('\n❌ No content extracted!');
          
          // Debug: Show what we're seeing in the HTML
          console.log('\n🔍 Debug - Looking for content in HTML:');
          const allText = $article('p').map((i, el) => $article(el).text().trim()).get();
          console.log(`Found ${allText.length} paragraphs total`);
          if (allText.length > 0) {
            console.log('First few paragraphs:');
            allText.slice(0, 5).forEach((text, idx) => {
              console.log(`  ${idx + 1}: ${text.substring(0, 100)}...`);
            });
          }
        }
        
      } catch (error) {
        console.log(`❌ Error fetching article: ${error.message}`);
      }
      
      console.log('\n' + '='*80 + '\n');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMainichiDetailed();