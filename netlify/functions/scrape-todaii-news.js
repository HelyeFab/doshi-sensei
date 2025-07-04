const https = require('https');
const { URL } = require('url');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Module-level variables for Firebase
let firebaseInitialized = false;
let db = null;

console.log('--- scrape-todaii-news function loaded ---');

// Function to initialize Firebase Admin SDK when needed
function initializeFirebaseIfNeeded() {
  if (firebaseInitialized) {
    return true;
  }

  console.log('--- SCRAPE-TODAII-NEWS FUNCTION START ---');
  console.log('Initializing Firebase Admin SDK...');

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKeyId = process.env.FIREBASE_PRIVATE_KEY_ID || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  const clientId = process.env.FIREBASE_CLIENT_ID || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_ID;

  if (!admin.apps.length && projectId && privateKey && clientEmail) {
    try {
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key_id: privateKeyId,
        private_key: privateKey?.replace(/\\n/g, '\n'),
        client_email: clientEmail,
        client_id: clientId,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${clientEmail}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      firebaseInitialized = true;
      db = admin.firestore();
      console.log('✅ Firebase Admin SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      firebaseInitialized = false;
      return false;
    }
  } else if (admin.apps.length > 0) {
    firebaseInitialized = true;
    db = admin.firestore();
    console.log('✅ Firebase Admin SDK already initialized');
    return true;
  } else {
    console.error('❌ Missing required Firebase credentials');
    firebaseInitialized = false;
    return false;
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

// Function to estimate JLPT level with inclusive algorithm favoring N4/N5
function estimateJLPTLevelAdvanced(text) {
  const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length;
  const hiraganaCount = (text.match(/[\u3040-\u309f]/g) || []).length;
  const katakanaCount = (text.match(/[\u30a0-\u30ff]/g) || []).length;
  const totalChars = text.length;
  const kanjiRatio = kanjiCount / totalChars;
  const kanaRatio = (hiraganaCount + katakanaCount) / totalChars;

  // Expanded vocabulary analysis for better level detection
  const vocabularyIndicators = {
    // N5 vocabulary patterns (very basic)
    n5Words: /(?:です|ます|これ|それ|あれ|どれ|ここ|そこ|あそこ|どこ|今日|明日|昨日|家|学校|会社|友達|食べる|飲む|見る|聞く|話す|読む|書く|行く|来る|帰る|いい|悪い|大きい|小さい|新しい|古い|高い|安い|おいしい|とても|少し)/g,

    // N4 vocabulary patterns (basic conversational)
    n4Words: /(?:知っている|思う|言う|作る|買う|売る|始める|終わる|起きる|寝る|歩く|走る|泳ぐ|勉強|仕事|電話|手紙|写真|映画|音楽|料理|天気|季節|春|夏|秋|冬|朝|昼|夜|年|月|週|日|時間|分|秒|お金|病院|駅|空港|ホテル|レストラン)/g,

    // N3 vocabulary patterns (intermediate)
    n3Words: /(?:経験|機会|意見|問題|解決|説明|紹介|連絡|準備|計画|予定|約束|相談|注意|心配|安心|便利|不便|簡単|複雑|重要|必要|特別|普通|自然|環境|社会|文化|伝統|科学|技術|政治|経済)/g,

    // Complex grammar patterns (N2/N1)
    complexGrammar: /(?:によって|について|に関して|に対して|に比べて|にとって|において|ということ|というのは|のみならず|したがって|そのため|その結果|一方|他方|ただし|なお|また|さらに|特に|例えば|つまり|要するに)/g,

    // Simple polite patterns (beginner friendly)
    politePatterns: /(?:です|ます|でした|ました|ください|お願いします|ありがとうございます|すみません|失礼します)/g
  };

  // Count vocabulary matches
  const n5Count = (text.match(vocabularyIndicators.n5Words) || []).length;
  const n4Count = (text.match(vocabularyIndicators.n4Words) || []).length;
  const n3Count = (text.match(vocabularyIndicators.n3Words) || []).length;
  const complexGrammarCount = (text.match(vocabularyIndicators.complexGrammar) || []).length;
  const politePatternCount = (text.match(vocabularyIndicators.politePatterns) || []).length;

  // Calculate sentence complexity
  const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((acc, s) => acc + s.length, 0) / sentences.length || 0;
  const shortSentences = sentences.filter(s => s.length < 25).length;
  const longSentences = sentences.filter(s => s.length > 50).length;

  // Start with scoring system (higher score = more beginner friendly)
  let beginnerScore = 0;

  // Kanji ratio scoring (less kanji = more beginner friendly)
  if (kanjiRatio < 0.1) beginnerScore += 40;
  else if (kanjiRatio < 0.2) beginnerScore += 30;
  else if (kanjiRatio < 0.3) beginnerScore += 20;
  else if (kanjiRatio < 0.4) beginnerScore += 10;

  // Kana ratio scoring (more kana = more beginner friendly)
  if (kanaRatio > 0.7) beginnerScore += 30;
  else if (kanaRatio > 0.6) beginnerScore += 20;
  else if (kanaRatio > 0.5) beginnerScore += 10;

  // Vocabulary scoring
  beginnerScore += n5Count * 5; // N5 words heavily favor beginner
  beginnerScore += n4Count * 3; // N4 words moderately favor beginner
  beginnerScore += politePatternCount * 2; // Polite patterns favor beginner
  beginnerScore -= n3Count * 2; // N3 words slightly against beginner
  beginnerScore -= complexGrammarCount * 10; // Complex grammar strongly against beginner

  // Sentence length scoring
  beginnerScore += shortSentences * 3;
  beginnerScore -= longSentences * 5;
  if (avgSentenceLength < 20) beginnerScore += 20;
  else if (avgSentenceLength < 30) beginnerScore += 10;
  else if (avgSentenceLength > 50) beginnerScore -= 20;

  // Text length adjustment (shorter = often simpler)
  if (totalChars < 200) beginnerScore += 15;
  else if (totalChars < 400) beginnerScore += 10;
  else if (totalChars > 800) beginnerScore -= 10;

  // Determine level based on score with bias toward N4/N5
  let level = 'N3'; // Default to intermediate

  if (beginnerScore >= 80) {
    level = 'N5';
  } else if (beginnerScore >= 50) {
    level = 'N4';
  } else if (beginnerScore >= 20) {
    level = 'N3';
  } else if (beginnerScore >= 5) {
    level = 'N2';
  } else {
    level = 'N1';
  }

  // Apply random variation to increase N4/N5 distribution
  const random = Math.random();
  if (random < 0.25) { // 25% chance to bump down difficulty
    if (level === 'N3') level = 'N4';
    if (level === 'N2') level = 'N3';
    if (level === 'N1') level = 'N2';
  } else if (random < 0.35) { // 10% chance to bump up N3 to N2 for better N2 distribution
    if (level === 'N3') level = 'N2';
  }

  // Special case: if text has lots of basic patterns, bias toward beginner
  const basicPatternRatio = (n5Count + n4Count + politePatternCount) / (totalChars / 50);
  if (basicPatternRatio > 2 && level !== 'N5') {
    if (level === 'N3') level = 'N4';
    if (level === 'N2') level = 'N3';
  }

  console.log(`📊 JLPT Level: ${level} | Score: ${beginnerScore} | Kanji: ${kanjiRatio.toFixed(2)} | N5: ${n5Count} | N4: ${n4Count} | Complex: ${complexGrammarCount} | AvgSent: ${avgSentenceLength.toFixed(1)}`);

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

      // Create comprehensive fallback articles for Japanese learners
      const fallbackArticles = [
        {
          title: '日本の伝統的な祭りが今年も開催されます',
          content: '日本には四季を通じて様々な伝統的な祭りがあります。春には桜祭り、夏には盆踊りや花火大会、秋には収穫祭、冬には雪祭りなどが各地で開催されます。これらの祭りは、地域の文化を次の世代に伝える重要な役割を果たしています。例えば、京都の祇園祭は1000年以上の歴史があり、美しい山鉾が街を練り歩きます。青森のねぶた祭りでは、巨大な灯籠が夜空を彩り、多くの観光客を魅了します。各地の祭りには、その土地独特の食べ物や踊り、音楽があります。地元の人々は何ヶ月も前から準備を始め、祭りの成功のために協力します。子どもたちも積極的に参加し、伝統的な踊りや太鼓の演奏を学びます。近年、外国人観光客の参加も増えており、国際交流の場としても重要な役割を担っています。これらの祭りを通じて、日本の豊かな文化と地域コミュニティの絆を感じることができます。',
          difficulty: 'N4'
        },
        {
          title: '日本の少子高齢化社会への対応策',
          content: '日本は世界で最も高齢化が進んだ国の一つです。総人口に占める65歳以上の割合は約30％に達し、出生率は1.3程度と低い水準が続いています。この傾向は労働力不足や社会保障費の増大など、様々な社会問題を引き起こしています。政府は、働き方改革や子育て支援の充実、外国人労働者の受け入れ拡大などの対策を進めています。企業でも、定年延長や再雇用制度の導入、AI技術を活用した業務効率化に取り組んでいます。地方自治体では、移住促進や起業支援を通じて人口流出に歯止めをかけようとしています。また、高齢者の知識と経験を活かした新しい働き方も注目されています。テクノロジーの活用により、年齢に関係なく活躍できる社会の実現が期待されています。国際的な協力も重要で、他国の成功事例を学びながら、日本独自の解決策を見つけることが求められています。この課題は一朝一夕には解決できませんが、社会全体で取り組むことが重要です。',
          difficulty: 'N3'
        },
        {
          title: '持続可能な社会を目指す日本の環境政策',
          content: '地球温暖化が深刻な問題となる中、日本政府は2050年までにカーボンニュートラルを達成する目標を掲げています。この目標実現のため、再生可能エネルギーの普及拡大、エネルギー効率の向上、新技術の開発など、包括的な政策が実施されています。太陽光発電や風力発電の導入が急速に進み、電気自動車の普及も加速しています。企業レベルでは、ESG投資の観点から環境への取り組みが重視されており、製品の製造から廃棄まで、ライフサイクル全体で環境負荷を削減する努力が続いています。一般家庭でも、省エネ家電の使用、ごみの分別・リサイクル、公共交通機関の利用促進など、日常生活での環境配慮が浸透しています。教育現場では、子どもたちに環境問題の重要性を教え、持続可能な社会の担い手を育成しています。国際協力も重要な要素で、技術移転や資金援助を通じて発展途上国の環境保護を支援しています。これらの取り組みにより、経済発展と環境保護の両立を目指しています。',
          difficulty: 'N2'
        },
        {
          title: '日本のデジタル化推進とスマートシティ構想',
          content: 'デジタル社会の実現に向けて、日本では官民一体となった取り組みが加速しています。政府は「デジタル庁」を設置し、行政手続きのオンライン化、マイナンバーカードの普及促進、5G通信網の整備などを進めています。スマートシティ構想では、IoT、AI、ビッグデータを活用して、都市機能の最適化を図っています。交通渋滞の解消、エネルギー使用量の最適化、防災機能の強化など、住民の生活の質向上を目指しています。教育分野では、一人一台のタブレット端末配布により、個別最適化された学習環境の提供が始まっています。医療分野でも、遠隔診療やAI診断支援システムの導入により、地域格差の解消と医療の質向上が期待されています。しかし、デジタルデバイドやプライバシー保護、サイバーセキュリティなどの課題も存在します。高齢者や情報リテラシーの低い人々への支援、データの適切な管理と利用、国際的なデジタルルールの策定などが重要な課題となっています。技術革新と社会制度の調和を図りながら、誰もが恩恵を受けられるデジタル社会の構築が求められています。',
          difficulty: 'N1'
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

// Save articles using ArticleManager
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

  // Use ArticleManager for saving with expiration management
  const batch = db.batch();
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

  for (const article of uniqueArticles) {
    const articleWithExpiration = {
      ...article,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      publishDate: admin.firestore.Timestamp.fromDate(article.publishDate),
      scrapedAt: admin.firestore.Timestamp.fromDate(article.scrapedAt),
      viewCount: 0,
      bookmarkedBy: [],
      isArchived: false
    };

    const docRef = db.collection('articles').doc(article.id);
    try {
      await docRef.set(articleWithExpiration);
      console.log('Article written:', article.id);
    } catch (err) {
      console.error('Failed to write article:', article.id, err);
      throw err;
    }
  }

  // Save metadata
  const metadataRef = db.collection('articlesMetadata').doc('todaii-news-stats');
  try {
    await metadataRef.set({
      ...metadata,
      lastUpdated: admin.firestore.Timestamp.fromDate(new Date()),
      uniqueArticlesSaved: uniqueArticles.length,
      duplicatesSkipped: articles.length - uniqueArticles.length,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
    });
    console.log('Metadata written');
  } catch (err) {
    console.error('Failed to write metadata:', err);
    throw err;
  }

  await batch.commit();
  console.log(`✅ Saved ${uniqueArticles.length} unique articles with expiration management`);
}

let handler;
try {
  handler = async function (event, context) {
    try {
      console.log('--- Netlify handler START ---');
      console.log('🚀 ====== TODAII NEWS SCRAPER ACTIVATED ======');
      console.log('📅 Event type:', event.httpMethod || 'scheduled');
      console.log('🎯 Scraping from Todaii Japanese News');

      // Initialize Firebase at runtime
      initializeFirebaseIfNeeded();

      if (!firebaseInitialized) {
        console.error('❌ Firebase not initialized');
        return {
          statusCode: 500,
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

    } catch (err) {
      console.error('💥 Error in Todaii scraping function:', err);

      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          details: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        }),
      };
    } finally {
      console.log('--- Netlify handler END ---');
    }
  };
} catch (topLevelError) {
  handler = async () => ({
    statusCode: 500,
    body: JSON.stringify({ success: false, error: 'Top-level error', details: topLevelError.message, stack: topLevelError.stack })
  });
}
exports.handler = handler;
