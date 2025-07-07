const admin = require('firebase-admin');

// Global variables for Firebase
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
    console.log('✅ Firebase Admin SDK initialized at module level');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK at module level:', error.message);
    firebaseInitialized = false;
  }
} else {
  firebaseInitialized = true;
  db = admin.firestore();
}

// Simple Todaii scraping
async function scrapeTodaii() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Todaii homepage...');
    const response = await fetch('https://japanese.todaiinews.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters`);

    // Simple regex to find article links
    const linkRegex = /<a[^>]*href="([^"]*\/detail\/[^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;
    const urls = new Set();
    let count = 0;
    
    while ((match = linkRegex.exec(html)) && count < 5) {
      const href = match[1];
      const linkText = match[2];
      
      const fullUrl = href.startsWith('http') ? href : `https://japanese.todaiinews.com${href}`;
      
      if (urls.has(fullUrl)) continue;
      urls.add(fullUrl);
      
      let title = linkText.replace(/<[^>]*>/g, '').trim();
      if (!title || title.length < 5) continue;
      
      // Store article data for later content extraction
      const articleData = {
        url: fullUrl,
        title: title
      };
      
      articles.push(articleData);
      count++;
    }
    
    console.log(`✅ [Improved] Found ${articles.length} Todaii articles to process`);
    
    // Now fetch actual content for each article (reduced to 3 for Netlify limits)
    const processedArticles = [];
    for (let i = 0; i < Math.min(articles.length, 3); i++) {
      const data = articles[i];
      
      try {
        console.log(`📄 [Improved] Fetching article content: ${data.title}`);
        
        const articleResponse = await fetch(data.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          signal: AbortSignal.timeout(5000)
        });

        if (!articleResponse.ok) {
          console.warn(`Failed to fetch Todaii article ${i + 1}: HTTP ${articleResponse.status}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        
        // Extract content and image from the Todaii article page
        let content = '';
        let imageUrl = '';
        
        // Extract article image first
        const imageSelectors = [
          /<img[^>]*src="([^"]*\/images\/news\/[^"]*)"[^>]*/i,
          /<img[^>]*class="[^"]*(?:featured|thumbnail|article|news)[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]+)"[^>]*class="[^"]*(?:featured|thumbnail|article|news)[^"]*"/i,
          /<div[^>]*class="[^"]*(?:image|photo)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i
        ];
        
        for (const selector of imageSelectors) {
          const imageMatch = articleHtml.match(selector);
          if (imageMatch && imageMatch[1]) {
            imageUrl = imageMatch[1].startsWith('http') ? imageMatch[1] : `https://japanese.todaiinews.com${imageMatch[1]}`;
            console.log(`✅ [Simplified] Article image found: ${imageUrl}`);
            break;
          }
        }
        
        // Simplified content extraction for Todaii (avoiding complex regex)
        const contentSelectors = [
          // Look for main content areas
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<article[^>]*>([\s\S]*?)<\/article>/i,
          /<main[^>]*>([\s\S]*?)<\/main>/i
        ];

        for (const selector of contentSelectors) {
          const contentMatch = articleHtml.match(selector);
          if (contentMatch && contentMatch[1]) {
            content = contentMatch[1];
            console.log(`✅ [Simplified] Content extracted using selector pattern`);
            break;
          }
        }

        // Simple fallback - extract paragraphs with Japanese text
        if (!content || content.length < 100) {
          console.log('⚠️ [Simplified] Primary selectors failed, trying paragraph extraction...');
          
          const paragraphMatches = articleHtml.match(/<p[^>]*>([^<]*[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF][^<]*)<\/p>/gi);
          if (paragraphMatches && paragraphMatches.length > 0) {
            content = paragraphMatches.slice(0, 5).join('\n');
            console.log(`✅ [Simplified] Extracted ${paragraphMatches.length} paragraphs as fallback`);
          }
        }

        // Enhanced content cleaning with English removal
        if (content) {
          console.log(`🧹 [Enhanced] Cleaning Todaii content (${content.length} chars before cleaning)`);
          
          // Basic HTML removal
          content = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .replace(/\s*([。！？])\s*/g, '$1\n\n')
            .replace(/\n\n\n+/g, '\n\n')
            .trim();
          
          // Remove English text for Japanese learning focus
          content = content
            .replace(/\b[A-Z][a-zA-Z\s,.'"\-!?:;0-9()]+[.!?]\s*/g, ' ') // Remove English sentences
            .replace(/\b[a-zA-Z]{3,}\b/g, ' ') // Remove English words 3+ characters
            .replace(/\([^)]*[a-zA-Z][^)]*\)/g, ' ') // Remove parentheses with English
            .replace(/[""'']/g, '') // Remove English quotes
            .replace(/\b[a-zA-Z]\b/g, ' ') // Remove single English letters
            .replace(/\s+/g, ' ') // Clean up extra spaces
            .trim();
          
          console.log(`✅ [Enhanced] Todaii content cleaned (${content.length} chars after cleaning)`);
        }

        // Ensure we have meaningful content
        if (!content || content.length < 50) {
          console.log(`⚠️ [Simplified] Insufficient Todaii content extracted, creating fallback content`);
          content = `この記事について：${data.title}\n\nこの記事は東大生が運営するTodaiiニュースサイトから取得されました。日本語学習に適した内容で、分かりやすい表現を使用しています。\n\n詳しい内容については元の記事をご覧ください：${data.url}\n\n※この記事は日本語の読解練習に最適です。`;
        }

        const article = {
          id: `todaii_improved_${Date.now()}_${i}`,
          title: data.title,
          content: content,
          summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
          url: data.url,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1600000000000?w=400',
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'todaii',
            name: 'Todaii',
            displayName: 'Todaii - Japanese News (Improved)'
          },
          category: 'news',
          tags: ['japanese-learning', 'todaii', 'improved'],
          difficulty: 'N4',
          estimatedReadingTime: Math.ceil((content?.length || 500) / 500),
          vocabulary: [],
          kanji: []
        };
        
        processedArticles.push(article);
        console.log(`✅ [Improved] Processed Todaii article ${i + 1}: ${data.title} (${content?.length || 0} chars)`);
        
        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn(`⚠️ [Improved] Failed to fetch Todaii content for article ${i + 1}: ${error.message}`);
        
        // Create fallback article with available data
        const fallbackArticle = {
          id: `todaii_improved_fallback_${Date.now()}_${i}`,
          title: data.title,
          content: `この記事について：${data.title}\n\nこの記事は東大生が運営するTodaiiニュースサイトから取得されました。日本語学習に適した内容です。\n\n記事の詳細な内容を取得中にエラーが発生しました。元の記事をご覧ください：${data.url}\n\n※この記事は日本語の読解練習に最適です。`,
          summary: data.title,
          url: data.url,
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1600000000000?w=400',
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'todaii',
            name: 'Todaii',
            displayName: 'Todaii - Japanese News (Fallback)'
          },
          category: 'news',
          tags: ['japanese-learning', 'todaii', 'fallback'],
          difficulty: 'N4',
          estimatedReadingTime: 3,
          vocabulary: [],
          kanji: []
        };
        
        processedArticles.push(fallbackArticle);
      }
    }
    
    return processedArticles;
  } catch (error) {
    console.error('❌ Error scraping Todaii:', error);
    return [];
  }
}

// Save to Firebase
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
  console.log(`✅ Successfully saved ${articles.length} articles to Firebase`);
  return true;
}

// HTTP endpoint handler (not scheduled)
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
    console.log('🚀 Todaii HTTP endpoint triggered');

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

    const articles = await scrapeTodaii();
    console.log(`📊 Scraped ${articles.length} articles`);

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
        message: `Successfully saved ${articles.length} Todaii articles (HTTP ENDPOINT)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000)
      }),
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    const elapsed = Date.now() - startTime;

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000)
      }),
    };
  }
};