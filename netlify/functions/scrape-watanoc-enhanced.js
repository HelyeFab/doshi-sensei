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
    console.log('✅ Firebase Admin SDK initialized at module level (Enhanced Watanoc)');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK at module level:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Enhanced Watanoc scraping with Cheerio-based content extraction
async function scrapeWatanoc() {
  const articles = [];
  
  try {
    console.log('📖 [Enhanced] Fetching Watanoc homepage...');
    const response = await fetch('https://watanoc.com', {
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

    // Extract article links and metadata using Cheerio
    $('article.loop-article').each((_, element) => {
      const $article = $(element);
      
      const titleElement = $article.find('.entry-title a');
      const title = titleElement.text().trim();
      const url = titleElement.attr('href');
      
      if (!title || !url) return;
      
      // Extract additional metadata
      const excerpt = $article.find('.loop-excerpt').text().trim();
      const author = $article.find('.meta-author .fn').text().trim();
      const dateTime = $article.find('.loop-date time').attr('datetime');
      const dateText = $article.find('.loop-date time').text().trim();
      const date = dateTime || dateText;
      const imageUrl = $article.find('.loop-post-thumb img').attr('src');
      
      // Extract JLPT level from title
      const levelMatch = title.match(/\\(n(\\d)\\)/);
      const level = levelMatch ? `N${levelMatch[1]}` : 'N4';
      
      // Clean title (remove level indicator)
      const cleanTitle = title.replace(/\\.\\.\\.\\(n\\d\\).*$/, '').trim();
      
      articleData.push({
        url,
        title: cleanTitle,
        rawTitle: title,
        excerpt,
        author,
        date,
        imageUrl,
        level
      });
    });

    console.log(`✅ [Enhanced] Found ${articleData.length} articles to process`);

    // Now fetch actual content for each article using enhanced extraction
    for (let i = 0; i < Math.min(articleData.length, 3); i++) {
      const data = articleData[i];
      
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
        
        // Enhanced content extraction using Cheerio
        let content = '';
        let furigana = {};
        
        // Find the main content area
        let $contentArea = $article('.entry-content').first();
        if (!$contentArea.length) {
          $contentArea = $article('.content').first();
        }
        if (!$contentArea.length) {
          $contentArea = $article('#content').first();
        }
        if (!$contentArea.length) {
          $contentArea = $article('article').first();
        }
        
        if ($contentArea.length) {
          // Process ruby tags for furigana first
          $contentArea.find('ruby').each((_, ruby) => {
            const $ruby = $article(ruby);
            const kanji = $ruby.find('rb').text() || $ruby.contents().not('rt').text();
            const reading = $ruby.find('rt').text();
            if (kanji && reading) {
              furigana[kanji] = reading;
              // Keep furigana in content as 漢字（かんじ） format
              $ruby.replaceWith(`${kanji}（${reading}）`);
            }
          });
          
          // Remove unwanted elements
          $contentArea.find('script, style, .ad, .advertisement, .social-share, .related-articles').remove();
          
          // Extract clean text content
          content = $contentArea.text().trim();
          
          // Enhanced content cleaning
          content = content
            .replace(/\\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/。\\s*/g, '。\\n\\n')  // Add line breaks after Japanese periods
            .replace(/！\\s*/g, '！\\n\\n')  // Add line breaks after exclamation marks
            .replace(/？\\s*/g, '？\\n\\n')  // Add line breaks after question marks
            .replace(/\\n\\n\\n+/g, '\\n\\n')  // Remove excessive line breaks
            .trim();
          
          // Remove level indicators and audio URLs from content
          content = content.replace(/\\.\\.\\.\\(n\\d\\)/gi, '').trim();
          content = content.replace(/https:\\/\\/watanoc\\.com\\/wp-content\\/uploads\\/[^\\s]+\\.mp3/gi, '').trim();
          
          // Final cleanup
          content = content.replace(/\\s+/g, ' ').replace(/。\\s*/g, '。\\n\\n').replace(/\\n\\n\\n+/g, '\\n\\n').trim();
        }

        // Only proceed if we have substantial content
        if (!content || content.length < 50) {
          console.warn(`⚠️ Insufficient content for article ${i + 1}, using fallback`);
          content = `この記事の内容：${data.title}\\n\\n${data.excerpt || 'この記事についてもっと詳しい情報は元のサイトをご確認ください。'}\\n\\n元の記事：${data.url}`;
        }

        const article = {
          id: `watanoc_enhanced_${Date.now()}_${i}`,
          title: data.title,
          content: content,
          summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
          url: data.url,
          imageUrl: data.imageUrl || `https://images.unsplash.com/photo-${1500000000000 + i}?w=400`,
          publishDate: new Date(data.date || Date.now()),
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc Enhanced',
            displayName: 'Watanoc - Enhanced Content Extraction'
          },
          category: 'general',
          tags: ['japanese-learning', 'watanoc', data.level.toLowerCase(), 'enhanced'],
          difficulty: data.level,
          estimatedReadingTime: Math.ceil((content?.length || 500) / 500),
          vocabulary: [],
          kanji: [],
          furigana: furigana
        };
        
        articles.push(article);
        console.log(`✅ [Enhanced] Extracted article ${i + 1}: ${data.title} (${content?.length || 0} chars)`);
        
        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn(`⚠️ [Enhanced] Failed to fetch content for article ${i + 1}: ${error.message}`);
        
        // Create fallback article with available data
        const fallbackArticle = {
          id: `watanoc_enhanced_fallback_${Date.now()}_${i}`,
          title: data.title,
          content: `この記事について：${data.title}\\n\\n${data.excerpt || '記事の詳細な内容を取得中にエラーが発生しました。'}\\n\\n元の記事をご覧ください：${data.url}`,
          summary: data.excerpt || data.title,
          url: data.url,
          imageUrl: data.imageUrl || `https://images.unsplash.com/photo-${1500000000000 + i}?w=400`,
          publishDate: new Date(data.date || Date.now()),
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc Enhanced',
            displayName: 'Watanoc - Enhanced Content Extraction (Fallback)'
          },
          category: 'general',
          tags: ['japanese-learning', 'watanoc', data.level.toLowerCase(), 'fallback'],
          difficulty: data.level,
          estimatedReadingTime: 2,
          vocabulary: [],
          kanji: []
        };
        
        articles.push(fallbackArticle);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ [Enhanced] Error scraping Watanoc:', error);
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
    console.log('🚀 [Enhanced] Watanoc HTTP endpoint triggered');

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
      setTimeout(() => reject(new Error('Scraping timeout')), 25000) // 25 seconds max
    );
    
    const articles = await Promise.race([
      scrapeWatanoc(),
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
        message: `Successfully saved ${articles.length} Watanoc articles (ENHANCED HTTP ENDPOINT)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ 
          id: a.id, 
          title: a.title, 
          difficulty: a.difficulty,
          contentLength: a.content?.length || 0,
          furiganaCount: Object.keys(a.furigana || {}).length
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