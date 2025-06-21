// DeepL Translation utility for Japanese to English translation

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

export class TranslationManager {
  private static apiKey: string | null = null;
  private static cache = new Map<string, string>();
  private static isInitialized = false;

  /**
   * Initialize translation manager
   */
  static initialize(): void {
    try {
      this.apiKey = process?.env?.NEXT_PUBLIC_DEEPL_API_KEY ||
                   (typeof window !== 'undefined' ? localStorage.getItem('deepl_api_key') : null);
      this.isInitialized = true;

      if (this.apiKey) {
        console.log('✅ DeepL Translation initialized');
      } else {
        console.log('⚠️ DeepL API key not found. Translation features disabled.');
      }
    } catch (error) {
      console.error('❌ DeepL Translation initialization failed:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if translation is available
   */
  static isAvailable(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  /**
   * Set API key manually
   */
  static setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    if (typeof window !== 'undefined') {
      localStorage.setItem('deepl_api_key', apiKey);
    }
    this.isInitialized = true;
  }

  /**
   * Translate Japanese text to English using DeepL API
   */
  static async translateText(text: string): Promise<TranslationResult> {
    if (!this.isAvailable()) {
      console.log('🔍 DeepL Translation not available - API key not configured');
      return {
        translatedText: 'Translation service not configured',
        detectedLanguage: 'ja'
      };
    }

    // Check cache first
    const cacheKey = text.trim();
    if (this.cache.has(cacheKey)) {
      return {
        translatedText: this.cache.get(cacheKey)!,
        detectedLanguage: 'ja'
      };
    }

    try {
      console.log(`🔄 Translating: "${text.substring(0, 50)}..."`);
      const startTime = performance.now();

      // Use server-side API route to avoid CORS and keep API key secure
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          source_lang: 'JA',
          target_lang: 'EN'
        })
      });

      const data = await response.json();
      const apiTime = performance.now() - startTime;

      if (response.ok && data.success && data.translation) {
        console.log(`✅ Translation successful! API call took ${apiTime.toFixed(2)}ms`);

        const translatedText = data.translation;

        // Cache the result
        this.cache.set(cacheKey, translatedText);

        return {
          translatedText,
          detectedLanguage: data.detected_language || 'ja',
          confidence: data.confidence
        };
      } else {
        const errorMsg = data.error || 'Translation failed';
        console.error('❌ DeepL Translation failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Translation API call failed:', error);
      throw error;
    }
  }

  /**
   * Translate multiple sentences in batch
   */
  static async translateBatch(sentences: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const uncachedSentences: string[] = [];

    // Check cache first
    for (const sentence of sentences) {
      const cacheKey = sentence.trim();
      if (this.cache.has(cacheKey)) {
        results.set(sentence, this.cache.get(cacheKey)!);
      } else {
        uncachedSentences.push(sentence);
      }
    }

    // Translate uncached sentences one by one (DeepL free tier has rate limits)
    for (const sentence of uncachedSentences) {
      try {
        const result = await this.translateText(sentence);
        results.set(sentence, result.translatedText);

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to translate sentence: "${sentence}"`, error);
        results.set(sentence, '[Translation failed]');
      }
    }

    return results;
  }

  /**
   * Clear translation cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()).map(k => k.substring(0, 30) + '...')
    };
  }

  /**
   * Test translation with a simple phrase
   */
  static async test(): Promise<boolean> {
    try {
      console.log('🧪 Testing DeepL translation...');
      const result = await this.translateText('こんにちは、元気ですか？');
      console.log('✅ DeepL test successful!', result);
      return true;
    } catch (error) {
      console.error('❌ DeepL test failed:', error);
      return false;
    }
  }
}

// Initialize on import
if (typeof window !== 'undefined') {
  TranslationManager.initialize();
}

export default TranslationManager;
