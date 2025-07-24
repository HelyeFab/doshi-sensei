const admin = require('firebase-admin');
const cheerio = require('cheerio');

// Function to get Unsplash image for articles without covers
async function getUnsplashImage(keyword = 'japan news') {
  try {
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashAccessKey) {
      console.log('⚠️ Unsplash API key not configured, skipping image fetch');
      return null;
    }
    
    const response = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape&content_filter=high`, {
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`,
        'Accept-Version': 'v1'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      console.warn('❌ Unsplash API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Unsplash image fetched:', data.urls.regular);
    return data.urls.regular;
  } catch (error) {
    console.warn('⚠️ Failed to fetch Unsplash image:', error.message);
    return null;
  }
}

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

// Enhanced scraping function with actual content extraction
async function scrapeWatanoc() {
  const articles = [];
  
  try {
    console.log('📖 Fetching Watanoc homepage...');
    const response = await fetch('https://watanoc.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters`);

    // Extract article URLs and metadata
    const articleRegex = /<article[^>]*class="[^"]*loop-article[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;
    let count = 0;
    const articleData = [];

    while ((match = articleRegex.exec(html)) && count < 5) {
      const articleHtml = match[1];
      
      const urlMatch = articleHtml.match(/href="(https:\/\/watanoc\.com\/[^"]+)"/);
      const titleMatch = articleHtml.match(/title="([^"]+)"/);
      
      if (urlMatch && titleMatch) {
        articleData.push({
          url: urlMatch[1],
          title: titleMatch[1].replace(/\s*\(n[1-5]\).*$/i, ''),
          rawTitle: titleMatch[1]
        });
        count++;
      }
    }

    // Now fetch actual content for each article
    for (let i = 0; i < articleData.length; i++) {
      const data = articleData[i];
      
      try {
        console.log(`📄 Fetching article content: ${data.title}`);
        
        const articleResponse = await fetch(data.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!articleResponse.ok) {
          console.warn(`Failed to fetch article ${i + 1}: HTTP ${articleResponse.status}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        
        // Extract content and image from the article page
        let content = '';
        let imageUrl = '';
        
        // Extract article image first
        const imageSelectors = [
          /<img[^>]*class="[^"]*(?:featured|thumbnail|article|post)[^"]*"[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]+)"[^>]*class="[^"]*(?:featured|thumbnail|article|post)[^"]*"/i,
          /<div[^>]*class="[^"]*(?:featured|thumbnail|post)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i,
          /<img[^>]*src="([^"]+)"[^>]*(?:width|height)="[^"]*"/i
        ];
        
        for (const selector of imageSelectors) {
          const imageMatch = articleHtml.match(selector);
          if (imageMatch && imageMatch[1]) {
            imageUrl = imageMatch[1].startsWith('http') ? imageMatch[1] : `https://watanoc.com${imageMatch[1]}`;
            console.log(`✅ [Enhanced] Article image found: ${imageUrl}`);
            break;
          }
        }
        
        // Use cheerio for better content extraction
        const $ = cheerio.load(articleHtml);
        
        // Extract the actual article content from entry-content
        // This should be just the article text, not comments
        const entryContent = $('.entry-content').first();
        
        if (entryContent.length > 0) {
          // Remove any nested divs that might contain ads or other non-content
          entryContent.find('div.sharedaddy, div.jp-relatedposts, div.ads').remove();
          
          // Get the text content
          content = entryContent.text().trim();
          console.log(`✅ [Watanoc] Extracted article content from .entry-content (${content.length} chars)`);
        } else {
          // Fallback: try other selectors
          const contentSelectors = ['.post-content', '.article-content', '.the-content', 'article > p'];
          
          for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
              content = element.text().trim();
              if (content.length > 50) {
                console.log(`✅ [Watanoc] Extracted content using fallback selector: ${selector}`);
                break;
              }
            }
          }
        }

        // Enhanced content cleaning
        if (content) {
          console.log(`🧹 [Enhanced] Cleaning content (${content.length} chars before cleaning)`);
          
          // Remove unwanted elements first
          content = content
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
            .replace(/<div[^>]*class="[^"]*(?:ad|advertisement|banner|share|comment|related|navigation|sidebar)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
          
          // Process ruby tags for furigana before removing HTML
          content = content.replace(/<ruby[^>]*>(.*?)<rt[^>]*>(.*?)<\/rt>.*?<\/ruby>/gi, '$1（$2）');
          
          // Remove all remaining HTML tags
          content = content.replace(/<[^>]*>/g, ' ');
          
          // Clean up HTML entities and formatting
          content = content
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#\d+;/g, '') // Remove numeric entities
            .replace(/\s+/g, ' ') // Collapse multiple spaces
            .replace(/\s*([。！？])\s*/g, '$1\n\n') // Add line breaks after Japanese punctuation
            .replace(/\n\n\n+/g, '\n\n') // Remove excessive line breaks
            .trim();
          
          // Enhanced URL and English text removal
          content = content
            .replace(/https?:\/\/[^\s]+/gi, '') // Remove URLs
            .replace(/www\.[^\s]+/gi, '') // Remove www URLs
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '') // Remove email addresses
            .replace(/\b[A-Z][a-zA-Z\s,.'"\-!?:;0-9()]+[.!?]\s*/g, ' ') // Remove English sentences
            .replace(/\b[a-zA-Z]{3,}\b/g, ' ') // Remove English words 3+ characters
            .replace(/\([^)]*[a-zA-Z][^)]*\)/g, ' ') // Remove parentheses with English
            .replace(/[""'']/g, '') // Remove English quotes
            .replace(/\b[a-zA-Z]\b/g, ' ') // Remove single English letters
            .replace(/\s+/g, ' ') // Clean up extra spaces
            .trim();
          
          console.log(`✅ [Enhanced] Content cleaned (${content.length} chars after cleaning)`);
        }

        // Extract JLPT level
        const levelMatch = data.rawTitle.match(/\(n([1-5])\)/i);
        const difficulty = levelMatch ? `N${levelMatch[1].toUpperCase()}` : 'N4';

        // Ensure we have meaningful content
        if (!content || content.length < 50) {
          console.log(`⚠️ [Enhanced] Insufficient content extracted, creating fallback content`);
          content = `この記事について：${data.title}\n\nこの記事はWatanocから取得された日本語学習記事です。${difficulty}レベルの内容となっています。\n\n詳しい内容については元の記事をご覧ください。\n\n※この記事は日本語の読解練習に適しています。`;
        }

        const article = {
          id: `watanoc_improved_${Date.now()}_${i}`,
          title: data.title,
          content: content,
          summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
          url: data.url,
          imageUrl: imageUrl || await getUnsplashImage('japan news'),
          publishDate: new Date(),
          scrapedAt: new Date(),
          source: {
            id: 'watanoc',
            name: 'Watanoc',
            displayName: 'Watanoc - Japanese Learning Articles'
          },
          category: 'general',
          tags: ['japanese-learning', 'watanoc', difficulty.toLowerCase()],
          difficulty: difficulty,
          estimatedReadingTime: Math.ceil((content?.length || 500) / 500),
          vocabulary: [],
          kanji: []
        };
        
        articles.push(article);
        console.log(`✅ Extracted article ${i + 1}: ${data.title} (${content?.length || 0} chars)`);
        
        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch content for article ${i + 1}: ${error.message}`);
      }
    }
    
    return articles;
  } catch (error) {
    console.error('❌ Error scraping Watanoc:', error);
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
    console.log('🚀 Watanoc HTTP endpoint triggered');

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
      setTimeout(() => reject(new Error('Scraping timeout')), 20000) // 20 seconds max
    );
    
    const articles = await Promise.race([
      scrapeWatanoc(),
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
        message: `Successfully saved ${articles.length} Watanoc articles (HTTP ENDPOINT)`,
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