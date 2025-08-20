const cheerio = require('cheerio');

// Debug function for NHK Easy and Todaii
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const results = {};
    
    // Test 1: NHK Easy JSON API
    console.log('🧪 Testing NHK Easy JSON API...');
    try {
      const nhkResponse = await fetch('https://www3.nhk.or.jp/news/easy/news-list.json', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www3.nhk.or.jp/news/easy/'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      results.nhkApi = {
        status: nhkResponse.status,
        ok: nhkResponse.ok,
        contentType: nhkResponse.headers.get('content-type')
      };
      
      if (nhkResponse.ok) {
        const data = await nhkResponse.json();
        const dates = Object.keys(data);
        results.nhkApi.dates = dates.slice(0, 3);
        results.nhkApi.totalDates = dates.length;
        
        // Get first article
        if (dates.length > 0 && data[dates[0]].length > 0) {
          const firstArticle = data[dates[0]][0];
          results.nhkApi.firstArticle = {
            news_id: firstArticle.news_id,
            title: firstArticle.title,
            title_with_ruby: firstArticle.title_with_ruby,
            news_prearranged_time: firstArticle.news_prearranged_time
          };
        }
      }
    } catch (error) {
      results.nhkApi = { error: error.message };
    }
    
    // Test 2: Todaii Homepage
    console.log('🧪 Testing Todaii homepage...');
    try {
      const todaiiResponse = await fetch('https://japanese.todaiinews.com', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      const todaiiHtml = await todaiiResponse.text();
      const $ = cheerio.load(todaiiHtml);
      
      // Find article links
      const articleLinks = [];
      $('a[href*="/detail/"]').each((i, el) => {
        if (i < 3) {  // Get first 3
          const href = $(el).attr('href');
          const text = $(el).text().trim();
          articleLinks.push({ href, text: text.substring(0, 100) });
        }
      });
      
      results.todaii = {
        status: todaiiResponse.status,
        htmlLength: todaiiHtml.length,
        articleLinksFound: $('a[href*="/detail/"]').length,
        firstThreeLinks: articleLinks
      };
      
      // Try to fetch first article content
      if (articleLinks.length > 0) {
        const firstArticleUrl = articleLinks[0].href.startsWith('http') 
          ? articleLinks[0].href 
          : `https://japanese.todaiinews.com${articleLinks[0].href}`;
          
        console.log(`📄 Fetching Todaii article: ${firstArticleUrl}`);
        const articleResponse = await fetch(firstArticleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000)
        });
        
        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Debug selectors
        results.todaii.articleDebug = {
          url: firstArticleUrl,
          hasArticleContent: $('.article-content').length > 0,
          hasEntryContent: $('.entry-content').length > 0,
          hasPostContent: $('.post-content').length > 0,
          totalParagraphs: $('p').length,
          h1Title: $('h1').first().text().trim().substring(0, 100)
        };
        
        // Try to extract content
        let content = '';
        
        // Method 1: Look for Japanese paragraphs anywhere
        $('p').each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
            content += text + '\n\n';
          }
        });
        
        results.todaii.articleContent = {
          contentLength: content.length,
          preview: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          hasJapanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content)
        };
      }
      
    } catch (error) {
      results.todaii = { error: error.message };
    }
    
    // Test 3: NHK Easy specific article
    if (results.nhkApi?.firstArticle?.news_id) {
      console.log('🧪 Testing NHK Easy article fetch...');
      try {
        const articleUrl = `https://www3.nhk.or.jp/news/easy/${results.nhkApi.firstArticle.news_id}/${results.nhkApi.firstArticle.news_id}.html`;
        
        const articleResponse = await fetch(articleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
          },
          signal: AbortSignal.timeout(10000)
        });
        
        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Debug selectors for NHK
        results.nhkArticle = {
          url: articleUrl,
          status: articleResponse.status,
          htmlLength: articleHtml.length,
          hasArticleBody: $('.article-body').length > 0,
          hasJsArticleBody: $('#js-article-body').length > 0,
          totalParagraphs: $('p').length,
          h1Title: $('h1').first().text().trim()
        };
        
        // Try to extract content
        let content = '';
        
        // Look for article body
        const articleBody = $('.article-body, #js-article-body, .news-article-body');
        if (articleBody.length > 0) {
          content = articleBody.text().trim();
        } else {
          // Fallback: get all p tags
          $('p').each((_, el) => {
            const text = $(el).text().trim();
            if (text && text.length > 10) {
              content += text + '\n\n';
            }
          });
        }
        
        results.nhkArticle.content = {
          length: content.length,
          preview: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
          hasJapanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content)
        };
        
      } catch (error) {
        results.nhkArticle = { error: error.message };
      }
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