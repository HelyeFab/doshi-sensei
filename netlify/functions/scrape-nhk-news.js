// Netlify Function for NHK Easy News Scraping using Puppeteer
const puppeteer = require('puppeteer');

// Rate limiting cache (in-memory for serverless)
const rateLimitCache = new Map();

// Rate limiter for serverless environment
function checkRateLimit(sourceId, requestsPerMinute = 2) {
  const now = Date.now();
  const key = `rate_${sourceId}`;
  const requests = rateLimitCache.get(key) || [];

  // Remove requests older than 1 minute
  const recentRequests = requests.filter(time => now - time < 60000);

  if (recentRequests.length >= requestsPerMinute) {
    return false; // Rate limit exceeded
  }

  // Add current request
  recentRequests.push(now);
  rateLimitCache.set(key, recentRequests);
  return true;
}

// Main handler function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET and POST methods
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only GET and POST methods are allowed'
        }
      })
    };
  }

  let browser = null;

  try {
    console.log('🔄 Starting NHK Easy news scraping...');

    // Check rate limiting
    if (!checkRateLimit('nhk-easy', 2)) {
      console.log('⚠️ Rate limit exceeded for NHK Easy');
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please wait before trying again.'
          }
        })
      };
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const maxArticles = parseInt(queryParams.limit) || 5; // Limit to 5 for serverless
    const testMode = queryParams.test === 'true';

    // For testing, return mock data
    if (testMode) {
      console.log('🧪 Test mode - returning mock data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: await getMockArticles(maxArticles),
          meta: {
            scrapedAt: new Date().toISOString(),
            source: 'nhk-easy',
            cached: false,
            testMode: true
          }
        })
      };
    }

    // Launch Puppeteer browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to NHK Easy main page
    console.log('📖 Navigating to NHK Easy...');
    await page.goto('https://www3.nhk.or.jp/news/easy/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Extract article links from the main page
    console.log('🔍 Extracting article links...');
    const articleLinks = await page.evaluate(() => {
      const links = [];
      const linkElements = document.querySelectorAll('.color-box .content a, .top-box a, .news-list a');

      for (let i = 0; i < Math.min(linkElements.length, 10); i++) {
        const link = linkElements[i];
        const href = link.href;
        const titleElement = link.querySelector('.title, h3, .news-title') || link;
        const title = titleElement.textContent?.trim();

        if (href && title && href.includes('/news/easy/')) {
          links.push({
            url: href,
            title: title
          });
        }
      }

      return links.slice(0, 5); // Limit to 5 articles for serverless performance
    });

    console.log(`📚 Found ${articleLinks.length} article links`);

    // Scrape individual articles
    const articles = [];
    for (let i = 0; i < Math.min(articleLinks.length, maxArticles); i++) {
      const link = articleLinks[i];

      try {
        console.log(`📄 Scraping article ${i + 1}: ${link.title}`);

        // Navigate to individual article
        await page.goto(link.url, {
          waitUntil: 'networkidle2',
          timeout: 20000
        });

        // Extract article content
        const articleData = await page.evaluate((linkData) => {
          const title = document.querySelector('h1.article-title, .article-header h1, h1')?.textContent?.trim() || linkData.title;

          // Extract content paragraphs
          const contentElements = document.querySelectorAll('.article-body p, .article-main p, .content p');
          const content = Array.from(contentElements)
            .map(p => p.textContent?.trim())
            .filter(text => text && text.length > 10)
            .join('\n');

          // Extract metadata
          const dateElement = document.querySelector('.article-date, .date, time');
          const dateText = dateElement?.textContent?.trim() || dateElement?.getAttribute('datetime');

          const imageElement = document.querySelector('.article-img img, .content-image img, .main-image img');
          const imageUrl = imageElement?.src;

          // Extract category if available
          const categoryElement = document.querySelector('.category-tag, .article-category, .tag');
          const category = categoryElement?.textContent?.trim();

          return {
            title,
            content: content || 'コンテンツを取得できませんでした。',
            url: linkData.url,
            dateText,
            imageUrl,
            category
          };
        }, link);

        // Process and format the article
        const article = {
          id: `nhk-easy-${Date.now()}-${i}`,
          title: articleData.title,
          content: articleData.content,
          summary: articleData.content.substring(0, 100) + '...',
          url: articleData.url,
          imageUrl: articleData.imageUrl,
          publishDate: parseNHKDate(articleData.dateText) || new Date().toISOString(),
          scrapedAt: new Date().toISOString(),
          source: {
            id: 'nhk-easy',
            name: 'NHK Easy',
            displayName: 'NHK NEWS WEB EASY',
            difficulty: 'beginner'
          },
          category: categorizeContent(articleData.category, articleData.title, articleData.content),
          tags: extractTags(articleData.title, articleData.content),
          difficulty: estimateDifficulty(articleData.content),
          estimatedReadingTime: Math.ceil(articleData.content.length / 300), // Rough estimate
          vocabulary: [], // Will be populated by client-side processing
          kanji: [] // Will be populated by client-side processing
        };

        articles.push(article);
        console.log(`✅ Successfully scraped: ${article.title}`);

        // Small delay between articles to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (articleError) {
        console.error(`❌ Error scraping article ${link.title}:`, articleError.message);
        // Continue with other articles
      }
    }

    console.log(`🎉 Successfully scraped ${articles.length} articles`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: articles,
        meta: {
          scrapedAt: new Date().toISOString(),
          source: 'nhk-easy',
          cached: false,
          articlesRequested: maxArticles,
          articlesScraped: articles.length
        }
      })
    };

  } catch (error) {
    console.error('❌ Scraping error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SCRAPING_ERROR',
          message: error.message
        }
      })
    };

  } finally {
    // Always close the browser
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser closed');
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
};

// Helper function to parse NHK date format
function parseNHKDate(dateText) {
  if (!dateText) return null;

  try {
    // NHK Easy often uses format like "1月15日 10時00分"
    const match = dateText.match(/(\d+)月(\d+)日/);
    if (match) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const year = new Date().getFullYear();
      return new Date(year, month - 1, day).toISOString();
    }

    // Try parsing as regular date
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (error) {
    console.warn('Date parsing error:', error);
  }

  return null;
}

// Helper function to categorize content
function categorizeContent(category, title, content) {
  if (category) return category;

  const text = (title + ' ' + content).toLowerCase();

  if (text.includes('天気') || text.includes('雨') || text.includes('雪')) return 'weather';
  if (text.includes('政治') || text.includes('選挙') || text.includes('政府')) return 'politics';
  if (text.includes('経済') || text.includes('株価') || text.includes('企業')) return 'economics';
  if (text.includes('スポーツ') || text.includes('試合') || text.includes('選手')) return 'sports';
  if (text.includes('技術') || text.includes('ai') || text.includes('ロボット')) return 'technology';
  if (text.includes('社会') || text.includes('人口') || text.includes('教育')) return 'society';

  return 'general';
}

// Helper function to extract tags
function extractTags(title, content) {
  const commonTags = ['東京', '日本', '政府', '会社', '学校', '病院', '技術', '経済', '社会'];
  const text = title + ' ' + content;

  return commonTags.filter(tag => text.includes(tag)).slice(0, 5);
}

// Helper function to estimate difficulty
function estimateDifficulty(content) {
  const length = content.length;
  const kanjiCount = (content.match(/[\u4e00-\u9faf]/g) || []).length;
  const kanjiRatio = kanjiCount / length;

  if (length < 200 && kanjiRatio < 0.3) return 'N5';
  if (length < 400 && kanjiRatio < 0.4) return 'N4';
  if (length < 600 && kanjiRatio < 0.5) return 'N3';
  return 'N4'; // NHK Easy is generally N4-N3 level
}

// Mock data for testing
async function getMockArticles(maxArticles) {
  const mockArticles = [
    {
      id: 'nhk-easy-mock-1',
      title: '新しい年になって初めての雪が降りました',
      content: '今日、東京で新しい年になって初めての雪が降りました。雪は朝から降り始めて、午後まで続きました。道路や公園は白くなりました。気象庁は、明日も雪が降る可能性があると発表しました。車を運転する人は気をつけてください。',
      summary: '東京で今年初めての雪が降り、道路や公園が白くなった。',
      url: 'https://www3.nhk.or.jp/news/easy/k12345678901/k12345678901.html',
      publishDate: new Date().toISOString(),
      scrapedAt: new Date().toISOString(),
      source: {
        id: 'nhk-easy',
        name: 'NHK Easy',
        displayName: 'NHK NEWS WEB EASY',
        difficulty: 'beginner'
      },
      category: 'weather',
      tags: ['雪', '天気', '東京'],
      difficulty: 'N4',
      estimatedReadingTime: 2,
      vocabulary: [],
      kanji: []
    },
    {
      id: 'nhk-easy-mock-2',
      title: '日本の人口が減っています',
      content: '日本の人口は毎年減っています。去年、日本の人口は約125万人減りました。これは今までで一番多い減少です。出生率が低くなっていることと、高齢化が進んでいることが原因です。政府は人口減少を止めるための対策を考えています。',
      summary: '日本の人口が過去最大の125万人減少した。',
      url: 'https://www3.nhk.or.jp/news/easy/k12345678902/k12345678902.html',
      publishDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      scrapedAt: new Date().toISOString(),
      source: {
        id: 'nhk-easy',
        name: 'NHK Easy',
        displayName: 'NHK NEWS WEB EASY',
        difficulty: 'beginner'
      },
      category: 'society',
      tags: ['人口', '社会', '統計'],
      difficulty: 'N3',
      estimatedReadingTime: 3,
      vocabulary: [],
      kanji: []
    }
  ];

  return mockArticles.slice(0, maxArticles);
}
