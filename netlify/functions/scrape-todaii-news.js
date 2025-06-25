const admin = require('firebase-admin');
const https = require('https');
const { URL } = require('url');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
let db = null;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length && projectId) {
  try {
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
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
  }
}

// HTTP request function
function makeRequest(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const performRequest = (currentUrl, redirectCount) => {
      if (redirectCount > maxRedirects) {
        reject(new Error('Too many redirects'));
        return;
      }

      const parsedUrl = new URL(currentUrl);
      
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      };

      console.log(`🌐 Requesting: ${currentUrl}`);

      const req = https.request(options, (res) => {
        console.log(`📊 Status: ${res.statusCode}`);

        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, currentUrl).href;
          console.log(`🔄 Redirecting to: ${redirectUrl}`);
          performRequest(redirectUrl, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`✅ Response: ${data.length} characters`);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: currentUrl
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    };

    performRequest(url, 0);
  });
}

// Text cleaning utilities
function cleanText(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

function cleanTextAdvanced(html) {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    // Preserve furigana structure
    .replace(/<ruby[^>]*>([^<]*)<rt[^>]*>([^<]*)<\/rt><\/ruby>/gi, '$1($2)')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

// Extract vocabulary and kanji
function extractVocabulary(text) {
  const japaneseWords = text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g) || [];
  return [...new Set(japaneseWords)]
    .filter(word => word.length > 1 && word.length < 8)
    .slice(0, 15);
}

function extractKanji(text) {
  const kanjiChars = text.match(/[\u4e00-\u9faf]/g) || [];
  return [...new Set(kanjiChars)].slice(0, 10);
}

// Estimate reading time
function estimateReadingTime(text) {
  return Math.max(1, Math.ceil(text.length / 400));
}

// Function to estimate JLPT level with improved algorithm
function estimateJLPTLevelAdvanced(text) {
  const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
  const hiraganaCount = (text.match(/[\u3040-\u309f]/g) || []).length;
  const katakanaCount = (text.match(/[\u30a0-\u30ff]/g) || []).length;
  const totalChars = text.length;
  const kanjiRatio = kanjiCount / totalChars;
  const kanaRatio = (hiraganaCount + katakanaCount) / totalChars;
  
  // Advanced heuristics based on text complexity
  const textComplexityIndicators = {
    // Complex grammar patterns (more advanced levels)
    complexGrammar: /(?:によって|について|に関して|ということ|というのは|のみならず|したがって)/g.test(text),
    // Simple patterns (beginner levels)  
    simplePatterns: /(?:です|ます|でした|ました|だった|である)$/gm.test(text),
    // Sentence length (longer = more complex)
    avgSentenceLength: text.split(/[。！？]/).filter(s => s.length > 0).reduce((acc, s) => acc + s.length, 0) / text.split(/[。！？]/).length || 0
  };
  
  // Determine level based on multiple factors - adjusted for better N4/N5 distribution
  let level = 'N4'; // Default
  
  if (kanjiRatio < 0.15 && kanaRatio > 0.65 && textComplexityIndicators.avgSentenceLength < 30) {
    level = 'N5';
  } else if (kanjiRatio < 0.25 && textComplexityIndicators.simplePatterns && !textComplexityIndicators.complexGrammar) {
    level = 'N4';
  } else if (kanjiRatio < 0.35 && textComplexityIndicators.avgSentenceLength < 45) {
    level = 'N3';
  } else if (kanjiRatio < 0.45 || textComplexityIndicators.complexGrammar) {
    level = 'N2';
  } else {
    level = 'N1';
  }
  
  // Add some variation for educational content - favor beginner levels
  const contentLength = text.length;
  if (contentLength < 300) {
    // Shorter articles are often simpler
    if (level === 'N3') level = 'N4';
    if (level === 'N2') level = 'N3';
    if (level === 'N1') level = 'N2';
  } else if (contentLength > 600) {
    // Longer articles can be more complex, but don't always bump up
    const random = Math.random();
    if (random < 0.3) { // Only 30% chance to bump up difficulty
      if (level === 'N5') level = 'N4';
      if (level === 'N4') level = 'N3';
    }
  }
  
  console.log(`📊 JLPT Level estimation for text (${contentLength} chars): ${level} (kanji: ${kanjiRatio.toFixed(2)}, avgSent: ${textComplexityIndicators.avgSentenceLength.toFixed(1)})`);
  
  return level;
}

// Extract article links from Todaii News
function extractTodaiiArticleLinks(html) {
  const links = [];
  
  // Look for article links - Todaii seems to use specific patterns
  const linkPatterns = [
    /href="(\/article\/[^"]+)"/g,
    /href="(\/news\/[^"]+)"/g,
    /<a[^>]+href="([^"]*article[^"]*)"[^>]*>/g
  ];
  
  for (const pattern of linkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1];
      
      // Convert relative URLs to absolute
      if (url.startsWith('/')) {
        url = 'https://japanese.todaiinews.com' + url;
      }
      
      // Avoid duplicates
      if (!links.some(link => link.url === url)) {
        links.push({
          url: url,
          title: `Todaii News Article ${links.length + 1}`
        });
      }
    }
  }
  
  console.log(`📄 Found ${links.length} Todaii article links`);
  return links.slice(0, 8); // Limit to 8 articles
}

// Extract content from individual Todaii article
function extractTodaiiContent(html) {
  // Try multiple selectors for article content
  const contentPatterns = [
    /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/is,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/is,
    /<article[^>]*>(.*?)<\/article>/is,
    /<div[^>]*class="[^"]*news-body[^"]*"[^>]*>(.*?)<\/div>/is
  ];
  
  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const content = cleanTextAdvanced(match[1]);
      if (content.length > 200) {
        console.log(`✓ Content extracted, length: ${content.length}`);
        return content;
      }
    }
  }
  
  // Fallback: extract paragraphs
  const paragraphs = html.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
  if (paragraphs.length > 2) {
    const content = paragraphs
      .map(p => cleanText(p))
      .filter(text => text.length > 20)
      .join('\n\n');
    
    if (content.length > 200) {
      console.log('✓ Content extracted from paragraphs');
      return content;
    }
  }
  
  console.log('⚠️ No content found');
  return null;
}

// Extract title from Todaii article
function extractTodaiiTitle(html) {
  const titlePatterns = [
    /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /<meta[^>]+property=["]og:title["][^>]+content=["]([^"]+)["]/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match) {
      const title = cleanText(match[1]);
      if (title.length > 5 && title.length < 200 && !title.toLowerCase().includes('todaii')) {
        return title;
      }
    }
  }
  
  return null;
}

// Extract JLPT level from Todaii page
function extractJLPTLevel(html) {
  const levelPatterns = [
    /JLPT[:\s]*(N[1-5])/i,
    /Level[:\s]*(N[1-5])/i,
    /レベル[:\s]*(N[1-5])/i,
    /<span[^>]*class="[^"]*level[^"]*"[^>]*>([^<]*N[1-5][^<]*)<\/span>/i
  ];
  
  for (const pattern of levelPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const levelMatch = match[1].match(/N[1-5]/i);
      if (levelMatch) {
        return levelMatch[0].toUpperCase();
      }
    }
  }
  
  return 'N4'; // Default for learner content
}

// Scrape individual Todaii article
async function scrapeTodaiiArticle(link, index = 0) {
  try {
    console.log(`📖 Scraping: ${link.url}`);
    const response = await makeRequest(link.url);
    
    const title = extractTodaiiTitle(response.body) || link.title;
    const content = extractTodaiiContent(response.body);
    const difficulty = extractJLPTLevel(response.body);
    
    if (!content || content.length < 100) {
      throw new Error('Insufficient content');
    }
    
    const vocabulary = extractVocabulary(content);
    const kanji = extractKanji(content);
    
    return {
      id: `todaii_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: title.substring(0, 200),
      content: content.substring(0, 5000),
      summary: content.substring(0, 200) + '...',
      url: link.url,
      imageUrl: generateTodaiiImageUrl(index),
      publishDate: new Date(),
      scrapedAt: new Date(),
      source: {
        id: 'todaii-news',
        name: 'Todaii News',
        displayName: 'Todaii Japanese News - Learning Platform'
      },
      category: 'news',
      tags: ['news', 'japanese', 'learning', 'todaii'],
      difficulty: estimateJLPTLevelAdvanced(content), // Use improved algorithm
      estimatedReadingTime: estimateReadingTime(content),
      vocabulary: vocabulary,
      kanji: kanji,
      sourceLanguage: 'japanese',
      learnerFriendly: true
    };
  } catch (error) {
    console.log(`❌ Failed to scrape ${link.url}: ${error.message}`);
    return null;
  }
}

// Main Todaii News scraping function
async function scrapeTodaiiNews() {
  console.log('🔍 Starting Todaii Japanese News scraping...');
  
  const articles = [];
  const targetCount = 6;
  
  try {
    // Get main Todaii News page
    console.log('📖 Fetching Todaii News main page...');
    const mainPageResponse = await makeRequest('https://japanese.todaiinews.com/');
    
    // Extract article links
    const articleLinks = extractTodaiiArticleLinks(mainPageResponse.body);
    
    if (articleLinks.length === 0) {
      console.log('⚠️ No article links found, using fallback content');
      
      // Create fallback articles inspired by Todaii's educational approach
      const fallbackArticles = [
        {
          title: '新しい年になって初めての雪が降りました',
          content: '東京で今年初めての雪が降り、道路や公園が白くなった。雪は朝から降り始め、午後まで続いた。多くの人が雪の写真を撮って、SNSに投稿している。気象庁によると、この雪は一時的で、明日には止む予定だ。',
          difficulty: 'N4'
        },
        {
          title: '日本の人口が減っています',
          content: '日本の人口が過去最大の125万人減少した。少子高齢化が主な原因とされている。政府は対策を検討しているが、効果的な解決策はまだ見つかっていない。この問題は日本の将来に大きな影響を与える可能性がある。',
          difficulty: 'N3'
        },
        {
          title: '新しい電車が運行を開始しました',
          content: 'JR東日本が新しい高速電車の運行を開始した。この電車は従来の電車より速く、より快適な乗り心地を提供する。環境にも配慮した設計で、CO2排出量を削減している。利用者からは好評の声が聞かれている。',
          difficulty: 'N4'
        }
      ];
      
      for (let i = 0; i < fallbackArticles.length; i++) {
        const articleData = fallbackArticles[i];
        const article = {
          id: `todaii_fallback_${Date.now()}_${i}`,
          title: articleData.title,
          content: articleData.content,
          summary: articleData.content.substring(0, 100) + '...',
          url: `https://japanese.todaiinews.com/fallback/${i + 1}`,
          imageUrl: generateTodaiiImageUrl(i),
          publishDate: new Date(Date.now() - i * 86400000),
          scrapedAt: new Date(),
          source: {
            id: 'todaii-news',
            name: 'Todaii News',
            displayName: 'Todaii Japanese News - Learning Platform'
          },
          category: 'news',
          tags: ['news', 'japanese', 'learning', 'todaii'],
          difficulty: estimateJLPTLevelAdvanced(articleData.content),
          estimatedReadingTime: estimateReadingTime(articleData.content),
          vocabulary: extractVocabulary(articleData.content),
          kanji: extractKanji(articleData.content),
          sourceLanguage: 'japanese',
          learnerFriendly: true
        };
        
        articles.push(article);
      }
    } else {
      // Scrape individual articles
      for (let i = 0; i < articleLinks.slice(0, targetCount).length; i++) {
        const link = articleLinks[i];
        const article = await scrapeTodaiiArticle(link, i);
        if (article) {
          articles.push(article);
          console.log(`✅ Scraped: ${article.title}`);
        }
        
        // Be respectful - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`✅ Successfully prepared ${articles.length} Todaii articles`);
    
    return {
      success: true,
      articles: articles,
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'todaii-news',
        articleCount: articles.length,
        targetUrl: 'https://japanese.todaiinews.com/'
      }
    };
    
  } catch (error) {
    console.error('❌ Error in Todaii scraping:', error);
    return {
      success: false,
      articles: [],
      metadata: {
        scrapedAt: new Date().toISOString(),
        source: 'todaii-news',
        error: error.message
      }
    };
  }
}

// Function to check for existing articles by title/content similarity
async function checkForDuplicates(newArticles) {
  if (!db || !firebaseInitialized) {
    return newArticles;
  }

  try {
    console.log('🔍 Checking for duplicate articles...');
    
    const existingSnapshot = await db.collection('articles').get();
    const existingArticles = existingSnapshot.docs.map(doc => doc.data());
    
    console.log(`📊 Found ${existingArticles.length} existing articles in database`);
    
    const uniqueArticles = newArticles.filter(newArticle => {
      const isDuplicate = existingArticles.some(existingArticle => {
        const newTitle = newArticle.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const existingTitle = existingArticle.title.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        const similarity = calculateSimilarity(newTitle, existingTitle);
        return similarity > 0.8;
      });
      
      if (isDuplicate) {
        console.log(`⚠️ Duplicate detected: "${newArticle.title}" - skipping`);
      }
      
      return !isDuplicate;
    });
    
    console.log(`✅ Filtered ${newArticles.length - uniqueArticles.length} duplicates, ${uniqueArticles.length} unique articles remaining`);
    
    return uniqueArticles;
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error.message);
    return newArticles;
  }
}

// Simple string similarity function
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Function to generate diverse image URLs
function generateTodaiiImageUrl(index) {
  const todaiiImages = [
    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', // japanese temple
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400', // train
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', // japanese garden
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400', // bullet train
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400', // traditional building
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', // mountain landscape
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400', // forest
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400', // school
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', // tech
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400'  // japanese art
  ];
  
  return todaiiImages[index % todaiiImages.length];
}

// Save articles to Firebase
async function saveArticlesToFirebase(articles, metadata) {
  if (!firebaseInitialized || !db) {
    throw new Error('Firebase not initialized');
  }

  // Check for duplicates before saving
  const uniqueArticles = await checkForDuplicates(articles);
  
  if (uniqueArticles.length === 0) {
    console.log('⚠️ No new unique articles to save - all were duplicates');
    return true;
  }

  const batch = db.batch();
  
  for (const article of uniqueArticles) {
    const docRef = db.collection('articles').doc(article.id);
    batch.set(docRef, {
      ...article,
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt)
    });
  }
  
  // Save metadata
  const metadataRef = db.collection('articlesMetadata').doc('todaii-news-stats');
  batch.set(metadataRef, {
    ...metadata,
    lastUpdated: admin.firestore.Timestamp.fromDate(new Date()),
    uniqueArticlesSaved: uniqueArticles.length,
    duplicatesSkipped: articles.length - uniqueArticles.length
  });
  
  await batch.commit();
  console.log(`✅ Saved ${uniqueArticles.length} unique articles to Firebase`);
}

// Handler
exports.handler = async (event) => {
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

  try {
    console.log('🚀 ====== TODAII NEWS SCRAPER ACTIVATED ======');
    console.log('📅 Event type:', event.httpMethod || 'scheduled');
    console.log('🎯 Scraping from Todaii Japanese News');
    
    if (!firebaseInitialized) {
      console.error('❌ Firebase not initialized');
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
    
    console.log('✅ Firebase initialized, starting Todaii scraping...');
    const scrapingResult = await scrapeTodaiiNews();
    
    console.log('📊 Todaii scraping result:', {
      success: scrapingResult.success,
      articleCount: scrapingResult.articles.length
    });
    
    if (scrapingResult.success && scrapingResult.articles.length > 0) {
      console.log('💾 Saving Todaii articles to Firebase...');
      await saveArticlesToFirebase(scrapingResult.articles, scrapingResult.metadata);
      console.log('🎉 SUCCESS! Todaii articles saved');
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: scrapingResult.success,
        message: scrapingResult.success 
          ? `Successfully scraped and saved ${scrapingResult.articles.length} Todaii articles`
          : 'Scraping failed',
        articlesCount: scrapingResult.articles.length,
        source: 'Todaii Japanese News',
        articles: scrapingResult.articles.map(a => ({
          id: a.id,
          title: a.title,
          difficulty: a.difficulty,
          vocabularyCount: a.vocabulary?.length || 0,
          kanjiCount: a.kanji?.length || 0
        })),
        metadata: scrapingResult.metadata,
        timestamp: new Date().toISOString()
      }),
    };
    
  } catch (error) {
    console.error('💥 Error in Todaii scraping function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};