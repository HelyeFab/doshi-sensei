const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    console.log('🧪 Debugging Watanoc structure...');
    
    // First, get the homepage
    const response = await fetch('https://watanoc.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000)
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Debug homepage structure
    const homeDebug = {
      title: $('title').text(),
      articlesFound: $('article').length,
      linksFound: $('a[href*="watanoc.com/post"]').length,
      h2Count: $('h2').length,
      h3Count: $('h3').length
    };
    
    // Find article links
    const articleLinks = [];
    $('a[href*="watanoc.com/post"]').each((i, el) => {
      if (i < 3) {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && text) {
          articleLinks.push({ href, text });
        }
      }
    });
    
    // If we found article links, fetch the first one
    let articleDebug = null;
    if (articleLinks.length > 0) {
      const firstArticleUrl = articleLinks[0].href;
      console.log(`📄 Fetching first article: ${firstArticleUrl}`);
      
      const articleResponse = await fetch(firstArticleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000)
      });
      
      const articleHtml = await articleResponse.text();
      const $article = cheerio.load(articleHtml);
      
      // Debug article structure
      articleDebug = {
        url: firstArticleUrl,
        title: $article('h1').first().text().trim() || $article('title').text(),
        hasEntryContent: $article('.entry-content').length > 0,
        hasPostContent: $article('.post-content').length > 0,
        hasArticleContent: $article('.article-content').length > 0,
        hasTheContent: $article('.the-content').length > 0,
        hasMainTag: $article('main').length > 0,
        hasArticleTag: $article('article').length > 0,
        totalParagraphs: $article('p').length,
        imageCount: $article('img').length
      };
      
      // Try to find content container
      const contentSelectors = [
        '.entry-content',
        '.post-content',
        '.article-content',
        '.the-content',
        '.content',
        'article .content',
        'main .content',
        '.single-content',
        '.page-content'
      ];
      
      articleDebug.contentContainers = {};
      for (const selector of contentSelectors) {
        const container = $article(selector);
        if (container.length > 0) {
          articleDebug.contentContainers[selector] = {
            found: true,
            textLength: container.text().trim().length,
            paragraphs: container.find('p').length
          };
        }
      }
      
      // Get some actual content
      let sampleContent = '';
      
      // Method 1: Try entry-content first
      const entryContent = $article('.entry-content');
      if (entryContent.length > 0) {
        sampleContent = entryContent.text().trim().substring(0, 500);
      }
      
      // Method 2: Try to get paragraphs with Japanese text
      if (!sampleContent) {
        $article('p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
            sampleContent += text + '\n\n';
            if (sampleContent.length > 500) return false;
          }
        });
      }
      
      articleDebug.sampleContent = sampleContent.substring(0, 500);
      articleDebug.hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(sampleContent);
      
      // Check for comments section
      const hasComments = $article('.comments, .comment-list, #comments').length > 0;
      articleDebug.hasCommentsSection = hasComments;
      
      // Look for the actual article body
      const articleBody = $article('article').first();
      if (articleBody.length > 0) {
        // Remove comments and other non-content elements
        const bodyClone = articleBody.clone();
        bodyClone.find('.comments, .comment-list, #comments, .share, .related').remove();
        
        const cleanContent = bodyClone.text().trim();
        articleDebug.articleBodyContent = {
          length: cleanContent.length,
          preview: cleanContent.substring(0, 300)
        };
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        homepage: homeDebug,
        articleLinks: articleLinks,
        articleDebug: articleDebug,
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