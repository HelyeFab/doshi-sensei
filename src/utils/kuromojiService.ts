// Kuromoji service for Japanese morphological analysis
import kuromoji from '@sglkc/kuromoji';
import FallbackTokenizer from './fallbackTokenizer';

export interface TokenFeatures {
  word_id: number;
  word_type: string;
  word_position: number;
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
  pos_detail_3: string;
  conjugated_type: string;
  conjugated_form: string;
  basic_form: string;
  reading?: string;
  pronunciation?: string;
}

export interface TokenWithHighlight extends TokenFeatures {
  highlightClass?: string;
  color?: string;
}

// Part of speech mapping to English categories
const POS_MAPPING: Record<string, string> = {
  '名詞': 'noun',           // Noun
  '動詞': 'verb',           // Verb
  '形容詞': 'adjective',    // I-adjective
  '形容動詞': 'adjective',  // Na-adjective
  '副詞': 'adverb',         // Adverb
  '助詞': 'particle',       // Particle
  '助動詞': 'auxiliary',    // Auxiliary verb
  '接続詞': 'conjunction',  // Conjunction
  '感動詞': 'interjection', // Interjection
  '連体詞': 'adnominal',    // Adnominal
  '接頭詞': 'prefix',       // Prefix
  '記号': 'symbol',         // Symbol/punctuation
  'フィラー': 'filler',     // Filler
  'その他': 'other',        // Other
};

// Color scheme for different parts of speech
export const POS_COLORS: Record<string, string> = {
  noun: '#3b82f6',       // Blue
  verb: '#ef4444',       // Red
  adjective: '#10b981',  // Green
  adverb: '#f59e0b',     // Amber
  particle: '#8b5cf6',   // Purple
  auxiliary: '#ec4899',  // Pink
  conjunction: '#06b6d4', // Cyan
  interjection: '#f97316', // Orange
  adnominal: '#6366f1',  // Indigo
  prefix: '#84cc16',     // Lime
  symbol: '#6b7280',     // Gray
  filler: '#a78bfa',     // Light purple
  other: '#9ca3af',      // Light gray
};

class KuromojiService {
  private static instance: KuromojiService;
  private tokenizer: any = null;
  private fallbackTokenizer: FallbackTokenizer | null = null;
  private initPromise: Promise<void> | null = null;
  private useFallback = false;

  private constructor() {
    this.fallbackTokenizer = new FallbackTokenizer();
  }

  static getInstance(): KuromojiService {
    if (!KuromojiService.instance) {
      KuromojiService.instance = new KuromojiService();
    }
    return KuromojiService.instance;
  }

  async initialize(): Promise<void> {
    if (this.tokenizer) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      const builder = kuromoji.builder({
        dicPath: '/dict/', // Dictionary files served from public directory
      });

      builder.build((err: any, tokenizer: any) => {
        if (err) {
          console.error('Failed to initialize Kuromoji, using fallback:', err);
          this.useFallback = true;
          resolve(); // Resolve anyway, we'll use fallback
        } else {
          this.tokenizer = tokenizer;

          resolve();
        }
      });
    });

    return this.initPromise;
  }

  async tokenize(text: string): Promise<TokenWithHighlight[]> {
    if (!this.tokenizer && !this.useFallback) {
      await this.initialize();
    }

    let tokens: TokenFeatures[];
    
    if (this.useFallback && this.fallbackTokenizer) {
      // Use fallback tokenizer
      const fallbackTokens = this.fallbackTokenizer.tokenize(text);
      tokens = fallbackTokens.map(token => ({
        word_id: 0,
        word_type: 'KNOWN',
        word_position: 0,
        surface_form: token.surface_form,
        pos: token.pos,
        pos_detail_1: '*',
        pos_detail_2: '*',
        pos_detail_3: '*',
        conjugated_type: '*',
        conjugated_form: '*',
        basic_form: token.basic_form,
        reading: token.reading,
        pronunciation: token.reading
      }));
    } else if (this.tokenizer) {
      tokens = this.tokenizer.tokenize(text);
    } else {
      return [];
    }
    
    // Map tokens with highlight information
    return tokens.map(token => {
      const englishPos = POS_MAPPING[token.pos] || 'other';
      return {
        ...token,
        highlightClass: `pos-${englishPos}`,
        color: POS_COLORS[englishPos],
      } as TokenWithHighlight;
    });
  }

  getPartOfSpeech(token: TokenFeatures): string {
    return POS_MAPPING[token.pos] || 'other';
  }

  isContentWord(token: TokenFeatures): boolean {
    const pos = this.getPartOfSpeech(token);
    return ['noun', 'verb', 'adjective', 'adverb', 'adnominal'].includes(pos);
  }

  isGrammarWord(token: TokenFeatures): boolean {
    const pos = this.getPartOfSpeech(token);
    return ['particle', 'auxiliary', 'conjunction'].includes(pos);
  }
}

export default KuromojiService;