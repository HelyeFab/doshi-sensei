const cheerio = require('cheerio');

// Debug function to see what content is actually being scraped
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    // Test with a specific Watanoc article
    const articleUrl = 'https://watanoc.com/post-1610-nikutama';
    
    console.log(`📄 Fetching article: ${articleUrl}`);
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000)
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Debug: Check what we can find
    const debug = {
      title: $('h1').first().text().trim() || 'No h1 found',
      entryContent: $('.entry-content').length > 0 ? 'Found .entry-content' : 'No .entry-content',
      articleContent: $('.article-content').length > 0 ? 'Found .article-content' : 'No .article-content',
      mainContent: $('main').length > 0 ? 'Found main' : 'No main',
      articleTag: $('article').length > 0 ? 'Found article' : 'No article',
      allParagraphs: $('p').length,
      firstParagraph: $('p').first().text().substring(0, 200)
    };
    
    // Try to get all paragraphs
    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
        paragraphs.push({
          index: i,
          text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          length: text.length
        });
      }
    });
    
    // Try specific selectors
    let content = '';
    
    // Method 1: Entry content
    const entryContent = $('.entry-content');
    if (entryContent.length > 0) {
      content = entryContent.text().trim();
    }
    
    // Method 2: If no content, try article body
    if (!content) {
      const articleBody = $('.article-body, .post-content, article .content');
      if (articleBody.length > 0) {
        content = articleBody.text().trim();
      }
    }
    
    // Method 3: If still no content, get all p tags in main/article
    if (!content) {
      const mainContent = $('main p, article p');
      mainContent.each((_, el) => {
        const text = $(el).text().trim();
        if (text && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
          content += text + '\n\n';
        }
      });
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        articleUrl: articleUrl,
        debug: debug,
        paragraphsFound: paragraphs.length,
        firstThreeParagraphs: paragraphs.slice(0, 3),
        extractedContent: {
          method: content ? 'Found content' : 'No content found',
          length: content.length,
          preview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
          hasJapanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content)
        },
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