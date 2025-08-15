import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, Timestamp } from 'firebase/firestore';

interface TranslationCache {
  originalText: string;
  translatedText: string;
  language: string;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
}

interface SentenceTranslation {
  original: string;
  translation: string;
  index: number;
}

class TranslationService {
  private googleApiKey: string;
  private cacheCollection = 'translations';

  constructor() {
    this.googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_API_KEY || '';
  }

  /**
   * Generate a consistent cache key for translations
   */
  private generateCacheKey(text: string, targetLang: string = 'en'): string {
    // Create a hash of the text to use as a document ID
    const hash = this.simpleHash(text);
    return `${targetLang}_${hash}`;
  }

  /**
   * Simple hash function for generating cache keys
   */
  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get translation from cache or Google Translate
   */
  async translateText(text: string, targetLang: string = 'en'): Promise<string> {
    if (!text || text.trim().length === 0) {
      return '';
    }

    const cacheKey = this.generateCacheKey(text, targetLang);
    
    // Try to get from cache first
    try {
      const cachedTranslation = await this.getFromCache(cacheKey);
      if (cachedTranslation) {
        // Update last accessed time
        await this.updateLastAccessed(cacheKey);
        return cachedTranslation.translatedText;
      }
    } catch (error) {

    }

    // If not in cache, translate using Google
    try {
      const translation = await this.translateWithGoogle(text, targetLang);
      
      // Save to cache for future use
      await this.saveToCache(cacheKey, text, translation, targetLang);
      
      return translation;
    } catch (error) {
      console.error('Translation failed:', error);
      throw new Error('Failed to translate text');
    }
  }

  /**
   * Translate multiple sentences (for shadowing practice)
   */
  async translateSentences(sentences: string[], targetLang: string = 'en'): Promise<SentenceTranslation[]> {
    const translations: SentenceTranslation[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      try {
        const translation = await this.translateText(sentences[i], targetLang);
        translations.push({
          original: sentences[i],
          translation,
          index: i
        });
      } catch (error) {
        console.error(`Failed to translate sentence ${i}:`, error);
        translations.push({
          original: sentences[i],
          translation: 'Translation unavailable',
          index: i
        });
      }
    }
    
    return translations;
  }

  /**
   * Get translation from Firebase cache
   */
  private async getFromCache(cacheKey: string): Promise<TranslationCache | null> {
    try {
      const docRef = doc(db, this.cacheCollection, cacheKey);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as TranslationCache;
      }
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Save translation to Firebase cache
   */
  private async saveToCache(
    cacheKey: string, 
    originalText: string, 
    translatedText: string, 
    language: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.cacheCollection, cacheKey);
      await setDoc(docRef, {
        originalText,
        translatedText,
        language,
        createdAt: Timestamp.now(),
        lastAccessed: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Update last accessed time for cached translation
   */
  private async updateLastAccessed(cacheKey: string): Promise<void> {
    try {
      const docRef = doc(db, this.cacheCollection, cacheKey);
      await setDoc(docRef, { lastAccessed: Timestamp.now() }, { merge: true });
    } catch (error) {
      console.error('Error updating last accessed:', error);
    }
  }

  /**
   * Translate using Google Translate API
   */
  private async translateWithGoogle(text: string, targetLang: string): Promise<string> {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${this.googleApiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'ja',
        target: targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  /**
   * Clean text before translation (remove furigana, etc.)
   */
  cleanTextForTranslation(text: string): string {
    // Remove ruby tags
    let cleaned = text.replace(/<ruby>([^<]+)<rt>[^<]+<\/rt><\/ruby>/g, '$1');
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Remove furigana in brackets
    cleaned = cleaned.replace(/[\[［]([^\]］]+)[\]］]/g, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Split text into sentences for Japanese
   */
  splitIntoSentences(text: string): string[] {
    // Japanese sentence endings
    const sentenceEndings = /[。！？\n]/g;
    
    // Split by sentence endings
    const sentences = text.split(sentenceEndings)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }
}

// Export singleton instance
export const translationService = new TranslationService();