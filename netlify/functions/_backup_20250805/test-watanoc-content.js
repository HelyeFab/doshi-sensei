// Test function to show actual Watanoc scraped content
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    console.log('🧪 Testing Watanoc article content extraction...');
    
    // Fetch Watanoc homepage
    const response = await fetch('https://watanoc.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000)
    });

    const html = await response.text();
    
    // Extract first article URL using regex (as the original does)
    const articleRegex = /<article[^>]*class="[^"]*loop-article[^"]*"[^>]*>([\s\S]*?)<\/article>/i;
    const match = articleRegex.exec(html);
    
    if (!match) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'No articles found on homepage'
        })
      };
    }
    
    const articleHtml = match[1];
    const urlMatch = articleHtml.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/);
    const titleMatch = articleHtml.match(/title="([^"]+)"/);
    
    if (!urlMatch || !titleMatch) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Could not extract article URL or title'
        })
      };
    }
    
    const articleUrl = urlMatch[1];
    const articleTitle = titleMatch[1].replace(/\s*\(n[1-5]\).*$/i, '');
    
    // Fetch the actual article
    console.log(`📄 Fetching article: ${articleUrl}`);
    const articleResponse = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000)
    });
    
    const articleContent = await articleResponse.text();
    
    // Extract content using the enhanced pattern from the scraper
    let content = '';
    const contentMatch = articleContent.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)(?:<\/div>[\s\S]*?<(?:footer|div[^>]*class="[^"]*(?:share|comment|related|navigation)))/i);
    
    if (contentMatch && contentMatch[1]) {
      content = contentMatch[1];
      
      // Clean up HTML
      content = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Remove English text
      content = content
        .replace(/\b[A-Z][a-zA-Z\s,.'"\-!?:;0-9()]+[.!?]\s*/g, ' ')
        .replace(/\b[a-zA-Z]{3,}\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Extract first 1000 characters for preview
    const preview = content.substring(0, 1000);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        source: 'Watanoc Test',
        articleUrl: articleUrl,
        articleTitle: articleTitle,
        contentLength: content.length,
        contentPreview: preview + (content.length > 1000 ? '...' : ''),
        hasJapaneseContent: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content),
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