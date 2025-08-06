// Computation Worker Service - Singleton wrapper for Web Worker
// Provides type-safe interface for heavy computations

interface WorkerMessage {
  type: string;
  payload: any;
  id: string;
}

interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'READY';
  payload: any;
  id?: string;
}

class ComputationWorkerService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    
    // Initialize worker lazily
    if (typeof window !== 'undefined' && 'Worker' in window) {
      this.initWorker();
    }
  }

  private initWorker() {
    if (this.worker) return;

    try {
      this.worker = new Worker('/workers/computation.worker.js');
      
      this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
        const { type, payload, id } = event.data;
        
        if (type === 'READY') {
          this.isReady = true;
          this.readyResolve();
          return;
        }
        
        if (id && this.pendingRequests.has(id)) {
          const { resolve, reject } = this.pendingRequests.get(id)!;
          this.pendingRequests.delete(id);
          
          if (type === 'SUCCESS') {
            resolve(payload);
          } else {
            reject(new Error(payload.message || 'Worker error'));
          }
        }
      });
      
      this.worker.addEventListener('error', (error) => {
        console.error('Worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker crashed'));
        });
        this.pendingRequests.clear();
      });
      
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      this.isReady = false;
    }
  }

  private async sendMessage<T>(type: string, payload: any): Promise<T> {
    // Fallback for non-worker environments
    if (!this.worker) {
      return this.fallbackHandler(type, payload);
    }

    await this.readyPromise;

    const id = `${type}_${Date.now()}_${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker!.postMessage({
        type,
        payload,
        id
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Worker timeout for ${type}`));
        }
      }, 30000);
    });
  }

  // Fallback implementations for when Worker is not available
  private async fallbackHandler(type: string, payload: any): Promise<any> {
    switch (type) {
      case 'CLEAN_TEXT':
        return this.cleanJapaneseTextFallback(payload.text);
      case 'VALIDATE_EXAMPLE':
        return this.isValidExampleFallback(payload.example);
      case 'PROCESS_VOCABULARY':
        return this.processVocabularyFallback(payload.items);
      default:
        // For complex operations, import the original implementation
        const { searchTatoebaExamples } = await import('@/utils/tatoebaSearch');
        if (type === 'SEARCH_TATOEBA') {
          return searchTatoebaExamples(payload.word, payload.limit);
        }
        throw new Error(`No fallback for ${type}`);
    }
  }

  private cleanJapaneseTextFallback(text: string) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\[［][^\]］]+[\]］]/g, '').trim();
  }

  private isValidExampleFallback(example: any): boolean {
    if (!example || typeof example !== 'object') return false;
    if (!example.japanese || !example.english) return false;
    if (typeof example.japanese !== 'string' || typeof example.english !== 'string') return false;
    
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (!japanesePattern.test(example.japanese)) return false;
    if (/^\d+$/.test(example.japanese)) return false;
    
    return true;
  }

  private processVocabularyFallback(items: any[]) {
    return items.map(item => {
      if (item.kanji) {
        item.kanji = this.cleanJapaneseTextFallback(item.kanji);
      }
      if (item.kana) {
        item.kana = this.cleanJapaneseTextFallback(item.kana);
      }
      
      if (item.example) {
        if (this.isValidExampleFallback(item.example)) {
          item.example.japanese = this.cleanJapaneseTextFallback(item.example.japanese);
        } else {
          item.example = null;
        }
      }
      
      return item;
    });
  }

  // Public API methods
  async cleanText(text: string): Promise<string> {
    return this.sendMessage<string>('CLEAN_TEXT', { text });
  }

  async batchCleanTexts(texts: string[]): Promise<string[]> {
    return this.sendMessage<string[]>('BATCH_CLEAN_TEXTS', { texts });
  }

  async validateExample(example: any): Promise<boolean> {
    return this.sendMessage<boolean>('VALIDATE_EXAMPLE', { example });
  }

  async searchTatoeba(word: string, limit: number = 5): Promise<any[]> {
    return this.sendMessage<any[]>('SEARCH_TATOEBA', { word, limit });
  }

  async batchSearchTatoeba(words: string[], limitPerWord: number = 3): Promise<Map<string, any[]>> {
    const result = await this.sendMessage<[string, any[]][]>('BATCH_SEARCH_TATOEBA', { 
      words, 
      limitPerWord 
    });
    return new Map(result);
  }

  async processVocabulary(items: any[]): Promise<any[]> {
    return this.sendMessage<any[]>('PROCESS_VOCABULARY', { items });
  }

  async calculateFSRS(card: any, rating: number): Promise<any> {
    return this.sendMessage<any>('CALCULATE_FSRS', { card, rating });
  }

  async clearCache(): Promise<void> {
    await this.sendMessage<{ success: boolean }>('CLEAR_CACHE', {});
  }

  async getCacheSize(): Promise<{ indexChunks: number; exampleChunks: number }> {
    return this.sendMessage<{ indexChunks: number; exampleChunks: number }>('GET_CACHE_SIZE', {});
  }

  // Cleanup method
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.pendingRequests.clear();
    }
  }
}

// Export singleton instance
export const computationWorker = new ComputationWorkerService();

// Export convenience functions that match existing API
export async function cleanJapaneseText(text: string): Promise<string> {
  return computationWorker.cleanText(text);
}

export async function searchTatoebaExamplesViaWorker(word: string, limit?: number): Promise<any[]> {
  return computationWorker.searchTatoeba(word, limit);
}

export async function processVocabularyBatch(items: any[]): Promise<any[]> {
  return computationWorker.processVocabulary(items);
}