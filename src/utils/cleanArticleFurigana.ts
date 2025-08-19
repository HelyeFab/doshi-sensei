/**
 * Utility to clean furigana annotations from article content
 * This removes furigana in parentheses format to prevent duplication
 * when the frontend applies ruby tags for display
 */

/**
 * Remove furigana annotations from article text
 * Handles multiple formats:
 * - 漢字(かんじ) -> 漢字
 * - 漢字（かんじ） -> 漢字  
 * - 漢字[かんじ] -> 漢字
 * - 漢字【かんじ】-> 漢字
 * @param text - Text that may contain furigana in parentheses
 * @returns Clean text without furigana annotations
 */
export function cleanArticleFurigana(text: string): string {
  if (!text) return '';

  // Pattern to match kanji followed by furigana in various bracket types
  // Matches: kanji characters followed by brackets containing hiragana
  const patterns = [
    // Standard parentheses: 漢字(ひらがな)
    /([一-龯々]+)\([ぁ-んー]+\)/g,
    // Full-width parentheses: 漢字（ひらがな）
    /([一-龯々]+)（[ぁ-んー]+）/g,
    // Square brackets: 漢字[ひらがな]
    /([一-龯々]+)\[[ぁ-んー]+\]/g,
    // Full-width square brackets: 漢字【ひらがな】
    /([一-龯々]+)【[ぁ-んー]+】/g,
    // Mixed kanji-kana with furigana: 行く(いく)
    /([一-龯々]+[ぁ-んー]*)\([ぁ-んー]+\)/g,
    /([一-龯々]+[ぁ-んー]*)（[ぁ-んー]+）/g,
  ];

  let cleanedText = text;
  
  // Apply each pattern to remove furigana
  patterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '$1');
  });

  // Also clean up any standalone hiragana in parentheses that might be left
  // This handles cases where furigana might be separated from kanji
  cleanedText = cleanedText.replace(/\([ぁ-んー]+\)/g, '');
  cleanedText = cleanedText.replace(/（[ぁ-んー]+）/g, '');
  cleanedText = cleanedText.replace(/\[[ぁ-んー]+\]/g, '');
  cleanedText = cleanedText.replace(/【[ぁ-んー]+】/g, '');

  // Clean up any double spaces that might result
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

  return cleanedText;
}

/**
 * Check if text contains furigana annotations
 * @param text - Text to check
 * @returns True if furigana is detected
 */
export function hasFuriganaAnnotations(text: string): boolean {
  if (!text) return false;

  const patterns = [
    /[一-龯々]+\([ぁ-んー]+\)/,
    /[一-龯々]+（[ぁ-んー]+）/,
    /[一-龯々]+\[[ぁ-んー]+\]/,
    /[一-龯々]+【[ぁ-んー]+】/,
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * Process article content to ensure no duplicate furigana
 * This should be used when displaying articles to users
 * @param content - Article content that may have furigana
 * @returns Cleaned content ready for frontend furigana application
 */
export function prepareArticleForDisplay(content: string): string {
  // First clean any existing furigana annotations
  const cleaned = cleanArticleFurigana(content);
  
  // The frontend will apply proper ruby tags for furigana display
  // based on user preferences
  return cleaned;
}