const admin = require('firebase-admin');

// Global variables for Firebase
let db = null;

// Simple HTML parsing for Todaii without external dependencies
function extractTodaiiArticles(html) {
  const articles = [];
  
  try {
    // Find article links that contain "/detail/"
    const linkRegex = /<a[^>]*href="([^"]*\/detail\/[^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;
    const urls = new Set(); // Prevent duplicates
    let count = 0;
    
    while ((match = linkRegex.exec(html)) && count < 3) {
      const href = match[1];
      const linkText = match[2];
      
      // Make full URL
      const fullUrl = href.startsWith('http') ? href : `https://japanese.todaiinews.com${href}`;
      
      // Skip if we've already found this URL
      if (urls.has(fullUrl)) continue;
      urls.add(fullUrl);
      
      // Extract title from link text or surrounding context
      let title = linkText.replace(/<[^>]*>/g, '').trim();
      
      // If title is too short, look for better title in surrounding HTML
      if (title.length < 10) {
        const surroundingMatch = html.match(new RegExp(`([\\s\\S]{0,200})${href.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}([\\s\\S]{0,200})`, 'i'));
        if (surroundingMatch) {
          const context = surroundingMatch[0];
          const titleMatch = context.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|title="([^"]+)"|>([^<]{20,})<\/[^>]*>/);
          if (titleMatch) {
            title = (titleMatch[1] || titleMatch[2] || titleMatch[3]).trim();
          }
        }
      }
      
      // Skip if still no good title
      if (!title || title.length < 5) continue;
      
      // Clean title
      title = title.replace(/\\s+/g, ' ').trim();
      
      // Look for JLPT level
      const levelMatch = title.match(/N([1-5])/i) || html.match(/N([1-5])/i);
      const level = levelMatch ? `N${levelMatch[1]}` : 'N4';
      
      // Look for source
      const sourceMatch = title.match(/(CNN|NHK|Asahi|Reuters|BBC)/i);
      const source = sourceMatch ? sourceMatch[1] : 'Todaii';
      
      // Create excerpt
      const excerpt = title.length > 100 ? title.substring(0, 100) + '...' : title;
      
      const article = {
        id: `todaii_fixed_${Date.now()}_${count}`,
        title: title,
        content: excerpt,
        summary: excerpt,
        url: fullUrl,
        imageUrl: `https://images.unsplash.com/photo-1500000000001?w=400`,
        publishDate: new Date(),
        scrapedAt: new Date(),
        source: {
          id: 'todaii',
          name: 'Todaii',
          displayName: 'Todaii - Japanese News'
        },
        category: 'news',
        tags: ['japanese-learning', 'todaii', level.toLowerCase()],
        difficulty: level,
        estimatedReadingTime: 4,
        vocabulary: [],
        kanji: [],
        audioUrl: null,
        author: source
      };
      
      articles.push(article);
      count++;
    }
    
    return articles;
  } catch (error) {
    console.error('Error parsing Todaii articles:', error);
    return [];
  }
}

async function scrapeTodaii() {
  try {
    console.log('🚀 Scraping Todaii with native parsing...');
    
    const response = await fetch('https://japanese.todaiinews.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched HTML: ${html.length} characters`);
    
    const articles = extractTodaiiArticles(html);
    console.log(`✅ Extracted ${articles.length} articles`);
    
    return articles;
  } catch (error) {
    console.error('Error scraping Todaii:', error);
    throw new Error(`Failed to scrape Todaii: ${error.message}`);
  }
}

async function saveArticlesToFirebase(articles) {
  if (!db) {
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

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  const startTime = Date.now();

  try {
    console.log('🚀 FIXED Todaii scraping function (no external deps)');

    // Initialize Firebase
    if (!admin.apps.length) {
      try {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n'),
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
        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error.message);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Firebase initialization failed: ' + error.message,
            timestamp: new Date().toISOString()
          }),
        };
      }
    }

    db = admin.firestore();

    // Scrape articles with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Scraping timeout')), 12000)
    );
    
    const articles = await Promise.race([
      scrapeTodaii(),
      timeoutPromise
    ]);

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
        message: `Successfully saved ${articles.length} Todaii articles to Firebase (FIXED VERSION - NO DEPS)`,
        articlesCount: articles.length,
        articles: articles.map(a => ({ id: a.id, title: a.title, difficulty: a.difficulty })),
        timestamp: new Date().toISOString(),
        timeElapsed: Math.round(elapsed / 1000),
        version: 'fixed'
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
        timeElapsed: Math.round(elapsed / 1000),
        version: 'fixed'
      }),
    };
  }
};