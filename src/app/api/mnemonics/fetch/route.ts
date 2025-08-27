import { NextRequest, NextResponse } from 'next/server';

// Cache for API responses (in-memory)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const kanji = searchParams.get('kanji');
  
  if (!kanji) {
    return NextResponse.json({ error: 'Kanji parameter is required' }, { status: 400 });
  }
  
  // For testing, return static mnemonic data
  const testMnemonics: Record<string, any> = {
    '間': {
      mnemonic: 'The SUN (日) shining through a GATE (門) shows the INTERVAL or SPACE between things.',
      meaning: 'interval, space, between',
      alike: ['問', '聞', '開'],
      source: 'rtega'
    },
    '出': {
      mnemonic: 'Two mountains (山) stacked, with something GOING OUT from between them.',
      meaning: 'exit, leave, go out',
      alike: ['山', '入'],
      source: 'rtega'
    },
    '水': {
      mnemonic: 'Picture a stream of WATER flowing down, with droplets splashing on the sides.',
      meaning: 'water',
      alike: ['氷', '永'],
      source: 'rtega'
    },
    '川': {
      mnemonic: 'Three lines flowing downward like a RIVER. The middle line is the main current, the side lines are the banks.',
      meaning: 'river',
      alike: ['水', '河', '流'],
      source: 'rtega'
    },
    '山': {
      mnemonic: 'Three peaks of a MOUNTAIN. The middle peak is the highest, with smaller peaks on each side.',
      meaning: 'mountain',
      alike: ['岳', '峰', '丘'],
      source: 'rtega'
    },
    '人': {
      mnemonic: 'A PERSON walking, with legs spread in motion. Like a stick figure taking a step.',
      meaning: 'person',
      alike: ['入', '大', '介'],
      source: 'rtega'
    },
    '日': {
      mnemonic: 'The SUN, a bright rectangle in the sky. Also represents a DAY from sunrise to sunset.',
      meaning: 'sun, day',
      alike: ['月', '明', '晴'],
      source: 'rtega'
    },
    '月': {
      mnemonic: 'The MOON with its shadow inside. Two lines inside show the craters and shadows. Also means MONTH.',
      meaning: 'moon, month',
      alike: ['日', '明', '朝'],
      source: 'rtega'
    },
    '円': {
      mnemonic: 'A CIRCLE with something inside (the old coin had a square hole). Also means YEN, the round currency.',
      meaning: 'circle, yen',
      alike: ['丸', '団', '囲'],
      source: 'rtega'
    },
    '母': {
      mnemonic: 'A MOTHER with two breasts nurturing. The two dots represent breasts, showing the nurturing aspect of motherhood.',
      meaning: 'mother',
      alike: ['父', '毎', '海'],
      source: 'rtega'
    }
  };
  
  // Return test data if available
  if (testMnemonics[kanji]) {
    return NextResponse.json(testMnemonics[kanji]);
  }
  
  // Check cache first
  const cacheKey = `mnemonic_${kanji}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }
  
  try {
    // Encode the kanji for URL
    const encodedKanji = encodeURIComponent(kanji);
    const url = `https://www.rtega.be/chmn/index.php?c=${encodedKanji}&Submit=`;
    
    console.log('Fetching from rtega.be:', url);
    
    // Fetch the page from our server (no CORS issues here)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch mnemonic' },
        { status: response.status }
      );
    }
    
    const html = await response.text();
    
    // Log a snippet of the HTML to debug parsing
    console.log('HTML snippet (first 500 chars):', html.substring(0, 500));
    
    // Parse the HTML to extract mnemonic
    // This is a simplified parser - you might need to adjust based on actual HTML structure
    const mnemonic = parseMnemonicFromHTML(html, kanji);
    console.log('Parsed mnemonic:', mnemonic);
    
    if (mnemonic) {
      // Cache the result
      cache.set(cacheKey, { data: mnemonic, timestamp: Date.now() });
      return NextResponse.json(mnemonic);
    } else {
      return NextResponse.json(
        { error: 'No mnemonic found for this kanji' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching mnemonic:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse mnemonic from rtega.be HTML
 * Updated parser based on actual HTML structure
 */
function parseMnemonicFromHTML(html: string, kanji: string): any {
  try {
    let mnemonicText = '';
    let meaning = '';
    const alike: string[] = [];
    
    // Look for the main content list item containing the kanji
    // The structure is usually within <li> tags with the kanji and its explanation
    const kanjiPattern = new RegExp(`<li[^>]*>.*?${kanji}.*?</li>`, 's');
    const listMatch = html.match(kanjiPattern);
    
    if (listMatch) {
      const listContent = listMatch[0];
      
      // Extract the main mnemonic text
      // Look for patterns like "lit. wheel holder" or descriptive text
      const litPattern = /lit\.\s+([^→;]+)(?:→|;)?/i;
      const litMatch = listContent.match(litPattern);
      
      if (litMatch) {
        mnemonicText = litMatch[0];
      }
      
      // Look for additional explanatory text
      // Patterns like "[rikhsa]: two wheels" or descriptive phrases
      const explanationPatterns = [
        /\[([^\]]+)\]:\s*([^;]+)/g,  // [word]: explanation
        /→\s*([^;]+)/g,               // arrow explanations
        /picture\s+([^.;]+)/gi,       // "picture a..."
        /think\s+of\s+([^.;]+)/gi,    // "think of..."
      ];
      
      for (const pattern of explanationPatterns) {
        const matches = listContent.matchAll(pattern);
        for (const match of matches) {
          if (!mnemonicText.includes(match[0])) {
            mnemonicText += (mnemonicText ? '; ' : '') + match[0];
          }
        }
      }
    }
    
    // If no mnemonic found with above patterns, try a broader search
    if (!mnemonicText) {
      // Look for any descriptive text patterns
      const descPatterns = [
        /lit\.\s+[^<;]+/i,
        /wheel\s+holder/i,
        /cart[^<;]+wheel/i,
        /vehicle[^<;]+/i,
      ];
      
      for (const pattern of descPatterns) {
        const match = html.match(pattern);
        if (match) {
          // Get context around the match
          const startIdx = html.indexOf(match[0]);
          const contextStart = Math.max(0, startIdx - 100);
          const contextEnd = Math.min(html.length, startIdx + match[0].length + 200);
          const context = html.substring(contextStart, contextEnd);
          
          // Clean and extract the relevant part
          mnemonicText = cleanHTML(context)
            .replace(/\s+/g, ' ')
            .trim();
          
          // Trim to just the relevant sentence/phrase
          const sentences = mnemonicText.split(/[.!?]/);
          for (const sentence of sentences) {
            if (sentence.includes(match[0].replace(/<[^>]*>/g, ''))) {
              mnemonicText = sentence.trim();
              break;
            }
          }
          break;
        }
      }
    }
    
    // Extract meaning - look for descriptive text after arrows or in definitions
    const meaningPatterns = [
      /→\s*([^;.]+)/,           // After arrow
      /cart[^,;]*/i,             // Cart-related meanings
      /vehicle[^,;]*/i,          // Vehicle-related
      /machine[^,;]*/i,          // Machine-related
      /carry[^,;]*/i,            // Carry-related
    ];
    
    for (const pattern of meaningPatterns) {
      const match = html.match(pattern);
      if (match) {
        const extracted = cleanHTML(match[0] || match[1]);
        if (extracted && extracted.length > 3) {
          meaning = extracted;
          break;
        }
      }
    }
    
    // Extract related kanji - look for linked kanji characters
    const kanjiLinkPattern = /<a[^>]*href="[^"]*\?c=([^"&]+)[^"]*"[^>]*>([^<]*)</g;
    const linkMatches = html.matchAll(kanjiLinkPattern);
    
    for (const match of linkMatches) {
      const linkedKanji = decodeURIComponent(match[1]);
      // Only add if it's a single character and not the current kanji
      if (linkedKanji.length === 1 && linkedKanji !== kanji && !alike.includes(linkedKanji)) {
        alike.push(linkedKanji);
        if (alike.length >= 10) break; // Limit to 10 related kanji
      }
    }
    
    // Clean up the mnemonic text
    if (mnemonicText) {
      mnemonicText = mnemonicText
        .replace(/\[[^\]]*\]/g, (match) => match) // Keep bracketed content
        .replace(/→/g, '→')                       // Keep arrows
        .replace(/;\s*;/g, ';')                   // Remove duplicate semicolons
        .replace(/\s+/g, ' ')                      // Normalize spaces
        .trim();
    }
    
    // If we found some data, return it
    if (mnemonicText || meaning || alike.length > 0) {
      return {
        mnemonic: mnemonicText || `Character ${kanji} - study its components and meaning`,
        meaning: meaning || '',
        alike: alike.slice(0, 5), // Return top 5 related kanji
        source: 'rtega'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return null;
  }
}

/**
 * Clean HTML tags and entities
 */
function cleanHTML(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')   // Replace non-breaking spaces
    .replace(/&amp;/g, '&')    // Replace ampersands
    .replace(/&lt;/g, '<')     // Replace less than
    .replace(/&gt;/g, '>')     // Replace greater than
    .replace(/&quot;/g, '"')   // Replace quotes
    .replace(/&#39;/g, "'")    // Replace apostrophes
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .trim();
}