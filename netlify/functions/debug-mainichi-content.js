// Debug script to find the correct selectors for Mainichi content
const cheerio = require('cheerio');

async function debugMainichiContent() {
  console.log('🔍 Debugging Mainichi Content Extraction\n');
  
  try {
    // First, get an article URL from the homepage
    console.log('📖 Getting article URL from homepage...');
    const homepageResponse = await fetch('https://mainichi.jp/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      }
    });

    const homepageHtml = await homepageResponse.text();
    const $home = cheerio.load(homepageHtml);
    
    // Get first article URL
    let articleUrl = null;
    $home('a[href*="/articles/"]').each((i, elem) => {
      if (articleUrl) return false;
      const href = $home(elem).attr('href');
      const text = $home(elem).text().trim();
      
      if (!text.includes('有料記事') && href) {
        articleUrl = href.startsWith('http') ? href : `https://mainichi.jp${href}`;
        console.log(`Found article: ${text.substring(0, 60)}...`);
        console.log(`URL: ${articleUrl}\n`);
        return false;
      }
    });

    if (!articleUrl) {
      console.log('❌ No article URL found');
      return;
    }

    // Fetch the article
    console.log('📄 Fetching article page...');
    const articleResponse = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en;q=0.9',
      }
    });

    const articleHtml = await articleResponse.text();
    const $ = cheerio.load(articleHtml);
    console.log(`✅ Fetched ${articleHtml.length} characters\n`);

    // Debug: Show HTML structure
    console.log('🏗️ HTML Structure Analysis:');
    console.log('─'.repeat(60));
    
    // Look for common article containers
    const possibleContainers = [
      'article',
      'main',
      '.article',
      '.content',
      '.body',
      '.text',
      '.story',
      '.entry',
      '[class*="article"]',
      '[class*="content"]',
      '[class*="body"]',
      '[class*="text"]',
      '[id*="article"]',
      '[id*="content"]',
      '[id*="body"]',
      'div[class*="Body"]',
      'div[class*="Content"]',
      'div[class*="Text"]'
    ];

    console.log('Looking for article containers...\n');
    
    for (const selector of possibleContainers) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} element(s) matching: ${selector}`);
        
        // Check if it has paragraphs
        const paragraphs = elements.first().find('p');
        if (paragraphs.length > 0) {
          console.log(`   └─ Contains ${paragraphs.length} paragraph(s)`);
          
          // Show first paragraph as sample
          const firstP = paragraphs.first().text().trim();
          if (firstP.length > 20) {
            console.log(`   └─ First paragraph: "${firstP.substring(0, 100)}..."`);
          }
        }
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('🔍 Searching for paragraphs directly...\n');
    
    // Find all paragraphs and analyze
    const allParagraphs = $('p');
    console.log(`Total paragraphs found: ${allParagraphs.length}\n`);
    
    // Group paragraphs by parent
    const paragraphsByParent = {};
    allParagraphs.each((i, elem) => {
      const $p = $(elem);
      const text = $p.text().trim();
      
      if (text.length > 50) { // Only consider substantial paragraphs
        const parent = $p.parent();
        const parentTag = parent.prop('tagName');
        const parentClass = parent.attr('class') || 'no-class';
        const parentId = parent.attr('id') || 'no-id';
        const parentKey = `${parentTag}.${parentClass}#${parentId}`;
        
        if (!paragraphsByParent[parentKey]) {
          paragraphsByParent[parentKey] = [];
        }
        
        paragraphsByParent[parentKey].push({
          text: text.substring(0, 150),
          length: text.length
        });
      }
    });
    
    // Show paragraph groups
    console.log('Paragraphs grouped by parent container:');
    console.log('─'.repeat(60));
    
    Object.entries(paragraphsByParent)
      .sort((a, b) => b[1].length - a[1].length) // Sort by number of paragraphs
      .slice(0, 10) // Show top 10
      .forEach(([parent, paragraphs]) => {
        console.log(`\n📦 ${parent}`);
        console.log(`   Found ${paragraphs.length} paragraph(s)`);
        console.log(`   Sample: "${paragraphs[0].text}..."`);
        console.log(`   Lengths: ${paragraphs.map(p => p.length).join(', ')}`);
      });

    console.log('\n' + '─'.repeat(60));
    console.log('🎯 Attempting content extraction with discovered selectors...\n');
    
    // Try to extract content with most promising containers
    const contentCandidates = [];
    
    // Method 1: Look for divs with multiple paragraphs
    $('div').each((i, elem) => {
      const $div = $(elem);
      const paragraphs = $div.find('p');
      
      if (paragraphs.length >= 3) {
        let content = '';
        paragraphs.each((j, p) => {
          const text = $(p).text().trim();
          if (text.length > 20 && !text.includes('広告') && !text.includes('PR')) {
            content += text + '\n\n';
          }
        });
        
        if (content.length > 200) {
          const divClass = $div.attr('class') || 'no-class';
          const divId = $div.attr('id') || 'no-id';
          contentCandidates.push({
            selector: `div.${divClass}#${divId}`,
            content: content.trim(),
            paragraphCount: paragraphs.length
          });
        }
      }
    });
    
    // Sort by content length
    contentCandidates.sort((a, b) => b.content.length - a.content.length);
    
    console.log(`Found ${contentCandidates.length} potential content containers\n`);
    
    if (contentCandidates.length > 0) {
      console.log('🏆 Best content candidate:');
      console.log('─'.repeat(60));
      const best = contentCandidates[0];
      console.log(`Selector: ${best.selector}`);
      console.log(`Paragraphs: ${best.paragraphCount}`);
      console.log(`Content length: ${best.content.length} characters`);
      console.log(`\nContent preview:`);
      console.log('─'.repeat(60));
      console.log(best.content.substring(0, 800));
      console.log('...\n');
      
      // Check for paywall indicators
      if (best.content.includes('有料記事') || 
          best.content.includes('会員限定') ||
          best.content.includes('続きを読む')) {
        console.log('⚠️  WARNING: Content contains paywall indicators!');
      }
    }
    
    // Also check meta tags for debugging
    console.log('\n📋 Meta Information:');
    console.log('─'.repeat(60));
    console.log('Title:', $('meta[property="og:title"]').attr('content') || $('title').text());
    console.log('Description:', $('meta[property="og:description"]').attr('content'));
    console.log('URL:', $('meta[property="og:url"]').attr('content'));
    console.log('Type:', $('meta[property="og:type"]').attr('content'));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugMainichiContent();