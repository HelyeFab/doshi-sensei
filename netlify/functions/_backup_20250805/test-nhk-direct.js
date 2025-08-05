const cheerio = require('cheerio');

// Direct test of NHK Easy
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    // Try the main NHK Easy page to find article links
    console.log('🧪 Fetching NHK Easy homepage...');
    const response = await fetch('https://www3.nhk.or.jp/news/easy/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Look for article links
    const articleLinks = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      // NHK Easy articles usually have pattern like k10[numbers]
      if (href && href.includes('k10') && text && text.length > 10) {
        const fullUrl = href.startsWith('http') ? href : `https://www3.nhk.or.jp${href}`;
        articleLinks.push({
          url: fullUrl,
          text: text.substring(0, 100)
        });
      }
    });
    
    const results = {
      homepageStatus: response.status,
      htmlLength: html.length,
      pageTitle: $('title').text(),
      articleLinksFound: articleLinks.length,
      firstThreeLinks: articleLinks.slice(0, 3)
    };
    
    // Try to fetch a known working NHK Easy article
    const testArticleUrl = 'https://www3.nhk.or.jp/news/easy/k10014654221000/k10014654221000.html';
    console.log(`📄 Testing known article: ${testArticleUrl}`);
    
    try {
      const articleResponse = await fetch(testArticleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (articleResponse.ok) {
        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Look for content
        let content = '';
        
        // Try various selectors
        const selectors = [
          '.article-main-text',
          '.article-body',
          '#js-article-body',
          '.news-textbody',
          'article',
          'main'
        ];
        
        for (const selector of selectors) {
          const element = $article(selector);
          if (element.length > 0) {
            const text = element.text().trim();
            if (text && text.length > 50) {
              content = text;
              results.foundWithSelector = selector;
              break;
            }
          }
        }
        
        // If no content, just get all text
        if (!content) {
          content = $article('body').text().trim();
        }
        
        results.testArticle = {
          status: articleResponse.status,
          htmlLength: articleHtml.length,
          title: $article('h1').first().text().trim(),
          contentLength: content.length,
          contentPreview: content.substring(0, 500).replace(/\s+/g, ' '),
          hasJapanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content)
        };
      } else {
        results.testArticle = {
          status: articleResponse.status,
          error: 'Article not found'
        };
      }
    } catch (error) {
      results.testArticle = { error: error.message };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
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