/**
 * Utility to clean furigana (ruby text) from Japanese text
 * Handles multiple formats: 部屋(へや), 部屋（へや）, 部屋[へや], 部屋【へや】
 */

/**
 * Remove furigana annotations from Japanese text
 * @param text - Text that may contain furigana in parentheses/brackets
 * @returns Clean text without furigana
 */
export function cleanFurigana(text: string): string {
  if (!text) return '';
  
  // Remove furigana patterns:
  // - (hiragana/katakana) - parentheses
  // - （hiragana/katakana） - full-width parentheses  
  // - [hiragana/katakana] - square brackets
  // - 【hiragana/katakana】 - special brackets
  let cleaned = text
    // Remove furigana in various bracket types
    .replace(/[\(（\[【][ぁ-んァ-ヶー]+[\)）\]】]/g, '')
    // Also handle cases with spaces before brackets
    .replace(/\s*[\(（\[【][ぁ-んァ-ヶー]+[\)）\]】]/g, '')
    // Handle cases where entire word might be in brackets after kanji
    .replace(/[\(（\[【][ぁ-んァ-ヶー\u4E00-\u9FAF]+[\)）\]】]/g, function(match) {
      // If the content has kanji, it's not furigana, keep it
      if (/[\u4E00-\u9FAF]/.test(match)) {
        return match;
      }
      // Otherwise it's furigana, remove it
      return '';
    });
  
  // Clean up any double spaces that might result
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Extract just the furigana reading from text
 * @param text - Text containing furigana
 * @returns The furigana reading or empty string
 */
export function extractFurigana(text: string): string {
  if (!text) return '';
  
  // Match furigana in various bracket types
  const match = text.match(/[\(（\[【]([ぁ-んァ-ヶー]+)[\)）\]】]/);
  return match ? match[1] : '';
}

/**
 * Check if text contains furigana annotations
 * @param text - Text to check
 * @returns True if furigana is present
 */
export function hasFurigana(text: string): boolean {
  if (!text) return false;
  return /[\(（\[【][ぁ-んァ-ヶー]+[\)）\]】]/.test(text);
}

/**
 * Split text into base and furigana parts
 * @param text - Text containing furigana
 * @returns Object with base text and furigana reading
 */
export function splitFurigana(text: string): { base: string; reading: string } {
  return {
    base: cleanFurigana(text),
    reading: extractFurigana(text)
  };
}