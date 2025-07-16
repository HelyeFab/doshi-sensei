const cheerio = require('cheerio');

// Test function to show actual scraped content
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    // Test Todaii article fetching
    console.log('🧪 Testing Todaii article content extraction...');
    
    // Fetch Todaii homepage
    const response = await fetch('https://japanese.todaiinews.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(15000)
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find first article link
    const firstArticleLink = $('a[href*="/detail/"]').first();
    const articleUrl = firstArticleLink.attr('href');
    const articleTitle = firstArticleLink.text().trim();
    
    if (!articleUrl) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'No articles found on homepage'
        })
      };
    }
    
    const fullUrl = articleUrl.startsWith('http') ? articleUrl : `https://japanese.todaiinews.com${articleUrl}`;
    
    // Fetch the actual article
    console.log(`📄 Fetching article: ${fullUrl}`);
    const articleResponse = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    const articleHtml = await articleResponse.text();
    const $article = cheerio.load(articleHtml);
    
    // Extract content
    let content = '';
    
    // Try different selectors
    const contentSelectors = [
      '.article-content p',
      '.entry-content p',
      '.post-content p',
      'article p',
      'main p'
    ];
    
    for (const selector of contentSelectors) {
      const paragraphs = $article(selector);
      if (paragraphs.length > 0) {
        paragraphs.each((_, el) => {
          const text = $article(el).text().trim();
          if (text && text.length > 20) {
            content += text + '\n\n';
          }
        });
        if (content) break;
      }
    }
    
    // Get image
    const imageUrl = $article('article img, .article-image img, main img').first().attr('src');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: 'Todaii Test',
        articleUrl: fullUrl,
        articleTitle: articleTitle || 'No title found',
        contentLength: content.length,
        contentPreview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        fullContent: content,
        imageUrl: imageUrl || 'No image found',
        timestamp: new Date().toISOString()
      }, null, 2)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};