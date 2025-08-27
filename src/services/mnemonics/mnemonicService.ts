/**
 * Mnemonic Service for Kanji Learning
 * Fetches mnemonics from rtega.be and caches them locally
 */

import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface KanjiMnemonic {
  kanji: string;
  mnemonic: string;
  meaning?: string;
  simplified?: string;
  alike?: string[];
  reference?: string[];
  source: 'rtega' | 'rtk' | 'wanikani' | 'custom' | 'community';
  contributor?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fetchedAt?: Date;
}

class MnemonicService {
  private cache: Map<string, KanjiMnemonic> = new Map();
  private readonly CACHE_COLLECTION = 'mnemonicsCache';
  // Use Google Cloud Function for better reliability
  private readonly API_BASE = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL 
    ? `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/fetchMnemonic`
    : 'https://us-central1-doshi-sensei.cloudfunctions.net/fetchMnemonic';

  /**
   * Get mnemonic for a specific kanji
   * First checks cache, then Firestore, then fetches from rtega.be
   */
  async getMnemonic(kanji: string): Promise<KanjiMnemonic | null> {
    console.log('getMnemonic called for:', kanji);
    
    // 1. Check memory cache
    if (this.cache.has(kanji)) {
      console.log('Found in memory cache');
      return this.cache.get(kanji) || null;
    }

    // 2. Skip Firestore for now to test the API directly
    // TODO: Re-enable Firestore caching after testing
    /*
    try {
      const docRef = doc(db, this.CACHE_COLLECTION, kanji);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as KanjiMnemonic;
        this.cache.set(kanji, data);
        
        // If data is older than 30 days, fetch fresh in background
        const fetchedAt = data.fetchedAt ? new Date(data.fetchedAt) : new Date(0);
        const daysSinceFetch = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceFetch > 30) {
          // Fetch fresh data in background (don't await)
          this.fetchAndCacheMnemonic(kanji);
        }
        
        return data;
      }
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
    }
    */

    // 3. Fetch from rtega.be via our API
    console.log('Fetching from API...');
    return await this.fetchAndCacheMnemonic(kanji);
  }

  /**
   * Fetch mnemonic from rtega.be and cache it
   */
  private async fetchAndCacheMnemonic(kanji: string): Promise<KanjiMnemonic | null> {
    try {
      console.log('Fetching mnemonic for:', kanji);
      // Call Google Cloud Function
      const response = await fetch(`${this.API_BASE}?kanji=${encodeURIComponent(kanji)}`);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        console.error('Failed to fetch mnemonic, status:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data && data.mnemonic) {
        const mnemonic: KanjiMnemonic = {
          ...data,
          kanji,
          source: 'rtega',
          fetchedAt: new Date()
        };
        
        // Cache in memory
        this.cache.set(kanji, mnemonic);
        
        // Cache in Firestore (don't await)
        // TODO: Re-enable after fixing Firestore permissions
        // this.saveMnemonicToFirestore(mnemonic);
        
        return mnemonic;
      }
    } catch (error) {
      console.error('Error fetching mnemonic:', error);
    }
    
    return null;
  }

  /**
   * Save mnemonic to Firestore
   */
  private async saveMnemonicToFirestore(mnemonic: KanjiMnemonic): Promise<void> {
    try {
      const docRef = doc(db, this.CACHE_COLLECTION, mnemonic.kanji);
      await setDoc(docRef, {
        ...mnemonic,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  }

  /**
   * Get multiple mnemonics
   */
  async getMnemonics(kanjiList: string[]): Promise<Map<string, KanjiMnemonic>> {
    const result = new Map<string, KanjiMnemonic>();
    
    // Fetch in parallel for better performance
    const promises = kanjiList.map(kanji => this.getMnemonic(kanji));
    const mnemonics = await Promise.all(promises);
    
    kanjiList.forEach((kanji, index) => {
      if (mnemonics[index]) {
        result.set(kanji, mnemonics[index]!);
      }
    });
    
    return result;
  }

  /**
   * Add or update a custom mnemonic
   */
  async saveCustomMnemonic(mnemonic: Omit<KanjiMnemonic, 'source' | 'fetchedAt'>): Promise<void> {
    const fullMnemonic: KanjiMnemonic = {
      ...mnemonic,
      source: 'custom',
      updatedAt: new Date()
    };
    
    if (!fullMnemonic.createdAt) {
      fullMnemonic.createdAt = new Date();
    }
    
    this.cache.set(fullMnemonic.kanji, fullMnemonic);
    await this.saveMnemonicToFirestore(fullMnemonic);
  }

  /**
   * Search mnemonics by keyword
   */
  async searchMnemonics(keyword: string): Promise<KanjiMnemonic[]> {
    try {
      // Search in Firestore
      const q = query(
        collection(db, this.CACHE_COLLECTION),
        where('mnemonic', '>=', keyword),
        where('mnemonic', '<=', keyword + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      const results: KanjiMnemonic[] = [];
      
      querySnapshot.forEach(doc => {
        results.push(doc.data() as KanjiMnemonic);
      });
      
      return results;
    } catch (error) {
      console.error('Error searching mnemonics:', error);
      return [];
    }
  }

  /**
   * Check if a mnemonic exists for a kanji
   */
  async hasMnemonic(kanji: string): Promise<boolean> {
    const mnemonic = await this.getMnemonic(kanji);
    return mnemonic !== null;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const mnemonicService = new MnemonicService();