/**
 * Utility functions for Japanese text conversion
 */

// Romaji to Hiragana mapping
const romajiToHiraganaMap: { [key: string]: string } = {
  // Vowels
  'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
  
  // K-group
  'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
  'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
  
  // G-group
  'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
  'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
  
  // S-group
  'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
  'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
  
  // Z-group
  'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
  'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
  
  // T-group
  'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
  'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
  
  // D-group
  'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
  
  // N-group
  'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
  'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
  
  // H-group
  'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
  'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
  
  // B-group
  'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
  'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
  
  // P-group
  'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
  
  // M-group
  'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
  'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
  
  // Y-group
  'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
  
  // R-group
  'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
  'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
  
  // W-group
  'wa': 'わ', 'wi': 'ゐ', 'we': 'ゑ', 'wo': 'を',
  
  // N
  'n': 'ん',
  
  // Small tsu (for doubled consonants)
  'kk': 'っk', 'ss': 'っs', 'tt': 'っt', 'pp': 'っp',
  'hh': 'っh', 'mm': 'っm', 'yy': 'っy', 'rr': 'っr',
  'ww': 'っw', 'gg': 'っg', 'zz': 'っz', 'dd': 'っd',
  'bb': 'っb',
  
  // Long vowels
  'aa': 'ああ', 'ii': 'いい', 'uu': 'うう', 'ee': 'ええ', 'oo': 'おお',
  'ou': 'おう',
};

// Romaji to Katakana mapping (derived from hiragana)
const romajiToKatakanaMap: { [key: string]: string } = Object.entries(romajiToHiraganaMap).reduce(
  (acc, [romaji, hiragana]) => ({
    ...acc,
    [romaji]: hiragana.replace(/[ぁ-ん]/g, (char) => 
      String.fromCharCode(char.charCodeAt(0) + 0x60)
    ),
  }),
  {}
);

/**
 * Convert romaji to hiragana
 */
export function romajiToHiragana(text: string): string {
  let result = text.toLowerCase();
  
  // Sort keys by length (longest first) to handle multi-character mappings
  const sortedKeys = Object.keys(romajiToHiraganaMap).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    result = result.replace(new RegExp(key, 'g'), romajiToHiraganaMap[key]);
  }
  
  return result;
}

/**
 * Convert romaji to katakana
 */
export function romajiToKatakana(text: string): string {
  let result = text.toLowerCase();
  
  // Sort keys by length (longest first) to handle multi-character mappings
  const sortedKeys = Object.keys(romajiToKatakanaMap).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    result = result.replace(new RegExp(key, 'g'), romajiToKatakanaMap[key]);
  }
  
  return result;
}

/**
 * Convert hiragana to katakana
 */
export function hiraganaToKatakana(text: string): string {
  return text.replace(/[ぁ-ん]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

/**
 * Convert katakana to hiragana
 */
export function katakanaToHiragana(text: string): string {
  return text.replace(/[ァ-ン]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}

/**
 * Check if a string contains romaji characters
 */
export function containsRomaji(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/**
 * Check if strings match considering romaji/hiragana/katakana conversion
 * This is the main function for answer validation
 */
export function japaneseTextMatches(userInput: string, correctAnswer: string): boolean {
  const normalizedInput = userInput.trim().toLowerCase();
  const normalizedAnswer = correctAnswer.trim().toLowerCase();
  
  // Direct match
  if (normalizedInput === normalizedAnswer) return true;
  
  // Check if user input contains romaji
  if (containsRomaji(normalizedInput)) {
    // Try converting romaji to both hiragana and katakana
    const inputAsHiragana = romajiToHiragana(normalizedInput);
    const inputAsKatakana = romajiToKatakana(normalizedInput);
    
    if (inputAsHiragana === normalizedAnswer || inputAsKatakana === normalizedAnswer) {
      return true;
    }
    
    // Also check if the answer can be converted to match
    const answerAsHiragana = katakanaToHiragana(normalizedAnswer);
    const answerAsKatakana = hiraganaToKatakana(normalizedAnswer);
    
    if (inputAsHiragana === answerAsHiragana || inputAsKatakana === answerAsKatakana) {
      return true;
    }
  } else {
    // User typed in Japanese - check hiragana/katakana conversion
    const inputAsHiragana = katakanaToHiragana(normalizedInput);
    const inputAsKatakana = hiraganaToKatakana(normalizedInput);
    const answerAsHiragana = katakanaToHiragana(normalizedAnswer);
    const answerAsKatakana = hiraganaToKatakana(normalizedAnswer);
    
    if (normalizedInput === answerAsHiragana || normalizedInput === answerAsKatakana ||
        inputAsHiragana === normalizedAnswer || inputAsKatakana === normalizedAnswer ||
        inputAsHiragana === answerAsHiragana || inputAsKatakana === answerAsKatakana) {
      return true;
    }
  }
  
  return false;
}