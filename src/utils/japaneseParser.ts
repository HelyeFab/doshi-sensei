/**
 * Japanese text parsing utilities
 */

export interface ParsedWord {
  word: string;
  reading?: string;
  type?: string;
}

/**
 * Parse Japanese text and extract words with readings
 */
export function parseJapaneseText(text: string): ParsedWord[] {
  // Simple implementation - can be enhanced with proper morphological analysis
  const words: ParsedWord[] = [];
  
  // Extract ruby elements
  const rubyRegex = /<ruby>([^<]+)<rt>([^<]+)<\/rt><\/ruby>/g;
  let match;
  
  while ((match = rubyRegex.exec(text)) !== null) {
    words.push({
      word: match[1],
      reading: match[2]
    });
  }
  
  return words;
}

/**
 * Process text with furigana - adds or removes furigana based on settings
 */
export function processTextWithFurigana(text: string, showFurigana: boolean): string {
  if (showFurigana) {
    return text;
  }
  
  // Remove ruby tags but keep the base text
  return text.replace(/<ruby>([^<]+)<rt>[^<]+<\/rt><\/ruby>/g, '$1');
}