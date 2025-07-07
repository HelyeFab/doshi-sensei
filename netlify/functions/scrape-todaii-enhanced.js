const admin = require('firebase-admin');
const cheerio = require('cheerio');

// Global variables for Firebase (same pattern as working functions)
let firebaseInitialized = false;
let db = null;

// Initialize Firebase at module level (critical for Netlify Functions)
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    db = admin.firestore();
    console.log('✅ Firebase Admin SDK initialized at module level (Enhanced Todaii)');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK at module level:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Enhanced Todaii scraping with actual content extraction
async function scrapeTodaii() {
  const articles = [];
  
  try {
    console.log('📖 [Enhanced] Fetching Todaii homepage...');
    const response = await fetch('https://japanese.todaiinews.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ [Enhanced] Fetched ${html.length} characters`);

    // Use Cheerio for proper HTML parsing
    const $ = cheerio.load(html);
    const articleData = [];

    // Find article links using enhanced selectors
    $('a[href*="/detail/"]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      
      if (!href) return;
      
      const fullUrl = href.startsWith('http') ? href : `https://japanese.todaiinews.com${href}`;
      
      // Extract title from the link text or nearby elements
      let title = $link.text().trim();
      
      // If title is empty or too short, look for title in parent elements
      if (!title || title.length < 10) {
        title = $link.closest('div').find('h3, h4, .title').text().trim();
      }
      
      // Skip if still no proper title
      if (!title || title.length < 5) return;
      
      // Clean title
      title = title.replace(/\\s+/g, ' ').trim();
      
      // Look for metadata in parent container
      const parentDiv = $link.closest('div, article');
      const levelMatch = parentDiv.text().match(/N([1-5])/i);
      const level = levelMatch ? `N${levelMatch[1]}` : 'N4';
      
      // Look for source (CNN, NHK, Asahi, etc.)
      const sourceMatch = parentDiv.text().match(/(CNN|NHK|Asahi|Reuters|BBC|AP)/i);
      const source = sourceMatch ? sourceMatch[1] : 'Todaii';
      
      // Look for image
      const imageElement = parentDiv.find('img').first();
      let imageUrl = imageElement.attr('src');
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://japanese.todaiinews.com${imageUrl}`;
      }
      
      articleData.push({
        url: fullUrl,
        title,
        level,
        source,
        imageUrl
      });
    });

    console.log(`✅ [Enhanced] Found ${articleData.length} articles to process`);

    // Remove duplicates and limit
    const uniqueArticles = articleData.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    ).slice(0, 5);

    // Now fetch actual content for each article
    for (let i = 0; i < uniqueArticles.length; i++) {
      const data = uniqueArticles[i];
      
      try {
        console.log(`📄 [Enhanced] Fetching article content: ${data.title}`);
        
        const articleResponse = await fetch(data.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000)
        });

        if (!articleResponse.ok) {
          console.warn(`Failed to fetch article ${i + 1}: HTTP ${articleResponse.status}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);
        
        // Enhanced content extraction
        let content = '';
        
        // Try multiple selectors for content
        const contentSelectors = [
          '.content',
          '.article-content',
          '.news-content', 
          'main .content',
          '#content',
          '.main-content'
        ];
        
        let $contentArea = null;
        for (const selector of contentSelectors) {
          $contentArea = $article(selector).first();
          if ($contentArea.length) {
            console.log(`Found content using selector: ${selector}`);
            break;
          }
        }
        
        if ($contentArea && $contentArea.length) {
          // Remove unwanted elements
          $contentArea.find('script, style, .ad, .advertisement, .share, nav, header, footer').remove();
          
          // Extract text content
          content = $contentArea.text().trim();
          
          // Comprehensive content cleaning (based on scraping-next)
          content = content
            .replace(/\\s+/g, ' ')
            // Remove complete English sentences
            .replace(/[A-Z][a-zA-Z\\s,.'"\\-!?:;0-9()]+[.!?]\\s*/g, '')
            // Remove sentences starting with common English words
            .replace(/\\b(The|This|That|These|Those|A|An|About|After|Before|When|Where|How|Why|What|Who|Which|Scientists|Researchers|They|We|You|He|She|It|People|Many|Some|All|Most|Several|Both|Every|Each|Other|Another|First|Second|Third|Last|Next|Previous|Today|Yesterday|Tomorrow|Now|Then|Here|There|From|For|With|Without|Under|Over|Above|Below|Between|Among|During|Through|Since|Until|Before|After|While|Although|Because|However|Therefore|Moreover|Furthermore|Nevertheless|Meanwhile|Finally|Vocabulary|Kanji|Grammar|Sentence|Reading|Listening|Speaking|Writing|JLPT|Level|Test|Exam|Study|Practice|Exercise|Example|Meaning|Translation|English|Japanese)\\b[^。！？]*[.!?]/gi, '')
            // Remove standalone English words and phrases
            .replace(/\\b[a-zA-Z]{2,}\\b/g, '')
            // Remove any remaining English punctuation patterns
            .replace(/[""'']/g, '')
            // Remove patterns like "N1", "N2" etc when followed by English
            .replace(/N[1-5]\\s*[a-zA-Z\\s]+/g, '')
            // Remove URLs and web-related text
            .replace(/https?:\\/\\/[^\\s]+/g, '')
            .replace(/www\\.[^\\s]+/g, '')
            // Clean up parentheses with English content
            .replace(/\\([^)]*[a-zA-Z][^)]*\\)/g, '')
            // Remove remaining single letters and short fragments
            .replace(/\\b[a-zA-Z]\\b/g, '')
            // Clean up extra spaces and formatting
            .replace(/\\s+/g, ' ')
            .replace(/\\s*。\\s*/g, '。\\n\\n')
            .replace(/\\s*！\\s*/g, '！\\n\\n')
            .replace(/\\s*？\\s*/g, '？\\n\\n')
            .replace(/\\n\\n\\n+/g, '\\n\\n')
            .replace(/^\\s+|\\s+$/g, '')
            .trim();
        }

        // If no content found or too short, create meaningful fallback
        if (!content || content.length < 50) {
          console.warn(`⚠️ Insufficient content for article ${i + 1}, using enhanced fallback`);
          const title = $article('h1').first().text().trim() || data.title;
          content = `この記事について：${title}\\n\\nこの記事は${data.source}から配信されたニュース記事です。日本語学習者向けに${data.level}レベルで書かれています。\\n\\n詳しい内容については元の記事をご覧ください：${data.url}\\n\\n※この記事は日本語の読解練習に適しています。`;
        }

        const article = {
          id: `todaii_enhanced_${Date.now()}_${i}`,
          title: data.title,
          content: content,
          summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
          url: data.url,
          imageUrl: data.imageUrl || null,
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'todaii',
            name: 'Todaii Enhanced',
            displayName: 'Todaii - Enhanced Content Extraction'
          },
          category: 'news',
          tags: ['japanese-learning', 'todaii', data.level.toLowerCase(), 'enhanced'],
          difficulty: data.level,
          estimatedReadingTime: Math.ceil((content?.length || 500) / 500),
          vocabulary: [],
          kanji: []
        };
        
        articles.push(article);
        console.log(`✅ [Enhanced] Extracted article ${i + 1}: ${data.title} (${content?.length || 0} chars)`);
        
        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`⚠️ [Enhanced] Failed to fetch content for article ${i + 1}: ${error.message}`);
        
        // Create fallback article with available data
        const fallbackArticle = {
          id: `todaii_enhanced_fallback_${Date.now()}_${i}`,
          title: data.title,
          content: `この記事について：${data.title}\\n\\nこの記事は東大生が運営するTodaiiニュースサイトから取得されました。${data.level}レベルの日本語学習に適した内容です。\\n\\n記事の詳細な内容を取得中にエラーが発生しました。元の記事をご覧ください：${data.url}\\n\\n※この記事は日本語の読解練習に最適です。`,
          summary: data.title,
          url: data.url,
          imageUrl: data.imageUrl || null,
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'todaii',
            name: 'Todaii Enhanced',
            displayName: 'Todaii - Enhanced Content Extraction (Fallback)'
          },
          category: 'news',
          tags: ['japanese-learning', 'todaii', data.level.toLowerCase(), 'fallback'],
          difficulty: data.level,
          estimatedReadingTime: 3,
          vocabulary: [],
          kanji: []
        };
        
        articles.push(fallbackArticle);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ [Enhanced] Error scraping Todaii:', error);
    return [];
  }
}

// Save to Firebase (same as working function)
async function saveArticlesToFirebase(articles) {
  if (!db || !firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  const batch = db.batch();
  const articlesRef = db.collection('articles');

  for (const article of articles) {
    const docRef = articlesRef.doc(article.id);
    batch.set(docRef, {
      ...article,
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
    });
  }

  await batch.commit();
  console.log(`✅ [Enhanced] Successfully saved ${articles.length} articles to Firebase`);
  return true;
}

// HTTP endpoint handler (same pattern as working function)
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  const startTime = Date.now();

  try {
    console.log('🚀 [Enhanced] Todaii HTTP endpoint triggered');

    // Check if Firebase is properly initialized at module level
    if (!firebaseInitialized || !db) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Firebase Admin SDK not configured',
          timestamp: new Date().toISOString()
        }),
      };
    }

    // Add timeout protection for the whole scraping process
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 30000) // 30 seconds max
    );
    
    const articles = await Promise.race([
      scrapeTodaii(),
      timeoutPromise
    ]);
    console.log(`📊 [Enhanced] Scraped ${articles.length} articles`);

    // Save articles to Firebase
    if (articles.length > 0) {
      await saveArticlesToFirebase(articles);
    }

    const elapsed = Date.now() - startTime;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully saved ${articles.length} Todaii articles (ENHANCED HTTP ENDPOINT)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ 
          id: a.id, 
          title: a.title, 
          difficulty: a.difficulty,
          contentLength: a.content?.length || 0,
          source: a.source?.name || 'Todaii'
        })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'enhanced'
      }),
    };

  } catch (error) {
    console.error('💥 [Enhanced] Function error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'enhanced'
      }),
    };
  }
};