/**
 * Mnemonic Service for Kanji Learning
 * Uses OpenAI API for generating mnemonics with Firebase caching
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, serverTimestamp } from 'firebase/firestore';

export interface KanjiMnemonic {
  kanji: string;
  mnemonic: string;
  meaning?: string;
  simplified?: string;
  alike?: string[];
  reference?: string[];
  source: 'openai' | 'huggingface' | 'huggingface-fallback' | 'rtega' | 'rtk' | 'wanikani' | 'custom' | 'community' | 'user';
  contributor?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fetchedAt?: Date;
  accessCount?: number;
  lastAccessed?: Date;
}

class MnemonicService {
  private cache: Map<string, KanjiMnemonic> = new Map();
  private readonly COLLECTION_NAME = 'mnemonics';

  /**
   * Get mnemonic for a specific kanji using OpenAI API with Firebase caching
   */
  async getMnemonic(kanji: string, meaning?: string, readings?: any): Promise<KanjiMnemonic | null> {
    // Check memory cache first
    if (this.cache.has(kanji)) {
      console.log(`[Mnemonic] Using memory cache for ${kanji}`);
      return this.cache.get(kanji) || null;
    }

    try {
      // Check Firebase cache
      const docRef = doc(db, this.COLLECTION_NAME, kanji);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log(`[Mnemonic] Found in Firebase cache for ${kanji}`);
        const data = docSnap.data() as KanjiMnemonic;
        
        // Update access count and last accessed time
        await setDoc(docRef, {
          accessCount: (data.accessCount || 0) + 1,
          lastAccessed: serverTimestamp()
        }, { merge: true });

        // Cache in memory
        this.cache.set(kanji, data);
        return data;
      }

      console.log(`[Mnemonic] Not in cache, calling OpenAI API for ${kanji}`);

      // Not in cache, call our API route
      const response = await fetch('/api/mnemonics/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kanji,
          meaning,
          readings
        }),
      });

      if (!response.ok) {
        console.error('Failed to generate mnemonic:', response.status);
        return null;
      }

      const data = await response.json();

      const mnemonic: KanjiMnemonic = {
        kanji: data.kanji,
        mnemonic: data.mnemonic,
        meaning: data.meaning,
        source: data.source || 'openai',
        fetchedAt: new Date(),
        createdAt: new Date(),
        accessCount: 1,
        lastAccessed: new Date()
      };

      // Save to Firebase (accessible to all users including guests)
      await setDoc(docRef, {
        ...mnemonic,
        createdAt: serverTimestamp(),
        fetchedAt: serverTimestamp(),
        lastAccessed: serverTimestamp()
      });

      console.log(`[Mnemonic] Saved to Firebase cache for ${kanji}`);

      // Cache in memory
      this.cache.set(kanji, mnemonic);

      return mnemonic;
    } catch (error) {
      console.error('Error fetching mnemonic:', error);
      return null;
    }
  }

  /**
   * Get multiple mnemonics
   */
  async getMnemonics(kanjiList: string[]): Promise<Map<string, KanjiMnemonic>> {
    const results = new Map<string, KanjiMnemonic>();
    
    for (const kanji of kanjiList) {
      const mnemonic = await this.getMnemonic(kanji);
      if (mnemonic) {
        results.set(kanji, mnemonic);
      }
    }
    
    return results;
  }

  /**
   * Add or update a custom mnemonic
   */
  async saveCustomMnemonic(mnemonic: Omit<KanjiMnemonic, 'source' | 'fetchedAt'>): Promise<void> {
    const fullMnemonic: KanjiMnemonic = {
      ...mnemonic,
      source: 'user',
      updatedAt: new Date()
    };
    
    if (!fullMnemonic.createdAt) {
      fullMnemonic.createdAt = new Date();
    }
    
    this.cache.set(fullMnemonic.kanji, fullMnemonic);
    // Future: Save to Firestore or other persistent storage
  }

  /**
   * Search mnemonics by keyword
   */
  async searchMnemonics(keyword: string): Promise<KanjiMnemonic[]> {
    const results: KanjiMnemonic[] = [];
    
    for (const [_, mnemonic] of this.cache) {
      if (mnemonic.mnemonic.toLowerCase().includes(keyword.toLowerCase()) ||
          mnemonic.meaning?.toLowerCase().includes(keyword.toLowerCase())) {
        results.push(mnemonic);
      }
    }
    
    return results;
  }

  /**
   * Check if a mnemonic exists for a kanji
   */
  async hasMnemonic(kanji: string): Promise<boolean> {
    if (this.cache.has(kanji)) {
      return true;
    }
    
    const mnemonic = await this.getMnemonic(kanji);
    return mnemonic !== null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const mnemonicService = new MnemonicService();