const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.fetchMnemonic = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const kanji = req.query.kanji;
  
  if (!kanji) {
    res.status(400).json({ error: 'Kanji parameter is required' });
    return;
  }

  try {
    const encodedKanji = encodeURIComponent(kanji);
    const url = `https://www.rtega.be/chmn/index.php?c=${encodedKanji}&Submit=`;
    
    console.log('Fetching from rtega.be:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse the HTML to extract mnemonic
    const mnemonic = parseMnemonicFromHTML(html, kanji);
    
    if (mnemonic) {
      res.json(mnemonic);
    } else {
      res.status(404).json({ 
        error: 'No mnemonic found',
        kanji: kanji 
      });
    }
  } catch (error) {
    console.error('Error fetching mnemonic:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mnemonic',
      details: error.message 
    });
  }
});

function parseMnemonicFromHTML(html, kanji) {
  try {
    let mnemonicText = '';
    let meaning = '';
    const alike = [];
    
    // Look for mnemonic patterns
    const patterns = [
      /lit\.\s+([^→<;]+)/i,
      /→\s*\[([^\]]+)\]/g,
      /\[([^\]]+)\]:\s*([^<;]+)/g
    ];
    
    for (const pattern of patterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[0] && !mnemonicText.includes(match[0])) {
          mnemonicText += (mnemonicText ? '; ' : '') + match[0];
        }
      }
    }
    
    // Extract related kanji
    const kanjiLinkPattern = /<a[^>]*href="[^"]*\?c=([^"&]+)[^"]*"[^>]*>/g;
    const linkMatches = html.matchAll(kanjiLinkPattern);
    
    for (const match of linkMatches) {
      const linkedKanji = decodeURIComponent(match[1]);
      if (linkedKanji.length === 1 && linkedKanji !== kanji && !alike.includes(linkedKanji)) {
        alike.push(linkedKanji);
        if (alike.length >= 5) break;
      }
    }
    
    if (mnemonicText || alike.length > 0) {
      return {
        mnemonic: mnemonicText || `Character ${kanji} - study its components`,
        meaning: meaning,
        alike: alike,
        source: 'rtega'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return null;
  }
}