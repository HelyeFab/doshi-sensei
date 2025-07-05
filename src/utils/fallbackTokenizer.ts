// Fallback tokenizer using browser's Intl.Segmenter API
// This is used when Kuromoji dictionary files fail to load

export interface FallbackToken {
  surface_form: string;
  pos: string;
  basic_form: string;
  reading?: string;
}

export class FallbackTokenizer {
  private segmenter: Intl.Segmenter | null = null;

  constructor() {
    // Check if Intl.Segmenter is available
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      this.segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
    }
  }

  tokenize(text: string): FallbackToken[] {
    if (!this.segmenter) {
      // Fallback to character-based splitting if Segmenter is not available
      return this.characterBasedTokenize(text);
    }

    const segments = Array.from(this.segmenter.segment(text));
    return segments.map(segment => this.createToken(segment.segment));
  }

  private characterBasedTokenize(text: string): FallbackToken[] {
    // Simple regex-based tokenization for Japanese
    const tokens: FallbackToken[] = [];
    
    // Pattern to match Japanese words and particles
    const pattern = /[\u3040-\u309F]+|[\u30A0-\u30FF]+|[\u4E00-\u9FAF]+|[ぁ-んァ-ヶー一-龯]+/g;
    const matches = text.match(pattern) || [];
    
    let lastIndex = 0;
    
    for (const match of matches) {
      const index = text.indexOf(match, lastIndex);
      
      // Add any non-Japanese text before this match
      if (index > lastIndex) {
        const nonJapanese = text.substring(lastIndex, index);
        if (nonJapanese.trim()) {
          tokens.push(this.createToken(nonJapanese));
        }
      }
      
      tokens.push(this.createToken(match));
      lastIndex = index + match.length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex);
      if (remaining.trim()) {
        tokens.push(this.createToken(remaining));
      }
    }
    
    return tokens;
  }

  private createToken(text: string): FallbackToken {
    // Simple heuristic-based POS tagging
    let pos = 'その他'; // Other
    
    // Check for particles
    if (/^[はがをにでとへからまでよりもやね]$/.test(text)) {
      pos = '助詞';
    }
    // Check for hiragana-only (likely verb endings or particles)
    else if (/^[\u3040-\u309F]+$/.test(text)) {
      if (text.length > 2) {
        pos = '動詞'; // Likely a verb
      } else {
        pos = '助詞'; // Likely a particle
      }
    }
    // Check for katakana (likely noun)
    else if (/^[\u30A0-\u30FF]+$/.test(text)) {
      pos = '名詞';
    }
    // Check for kanji (likely noun or verb stem)
    else if (/[\u4E00-\u9FAF]/.test(text)) {
      pos = '名詞'; // Default to noun
    }
    // Check for common adjective endings
    else if (/[いきしちにひみりぎじぢびぴ]$/.test(text)) {
      pos = '形容詞';
    }
    
    return {
      surface_form: text,
      pos: pos,
      basic_form: text,
      reading: undefined
    };
  }
}

export default FallbackTokenizer;