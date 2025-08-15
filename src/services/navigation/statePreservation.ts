import type { SavedState } from '@/types/navigation';

interface StatePreservationManager {
  save(key: string, state: any): void;
  restore(key: string): any;
  clear(key: string): void;
  clearOld(maxAge: number): void;
  clearAll(): void;
  getSize(): number;
}

class StatePreservationService implements StatePreservationManager {
  private storage: Map<string, SavedState> = new Map();
  private maxStateSize = 1024 * 1024; // 1MB limit per state
  private sessionStorageKey = 'doshi-nav-states';
  
  constructor() {
    // Load existing states from session storage
    this.loadFromSession();
  }
  
  save(key: string, state: any): void {
    try {
      const serialized = this.serialize(state);
      
      if (serialized.length > this.maxStateSize) {

        // For now, just skip saving oversized states
        return;
      }
      
      const savedState: SavedState = {
        state: serialized,
        timestamp: Date.now()
      };
      
      this.storage.set(key, savedState);
      this.persistToSession();
    } catch (error) {
      console.error('Failed to save navigation state:', error);
    }
  }
  
  restore(key: string): any {
    try {
      const saved = this.storage.get(key);
      
      if (!saved) {
        return null;
      }
      
      // Check if state is too old (30 minutes by default)
      if (Date.now() - saved.timestamp > 30 * 60 * 1000) {
        this.clear(key);
        return null;
      }
      
      return this.deserialize(saved.state);
    } catch (error) {
      console.error('Failed to restore navigation state:', error);
      return null;
    }
  }
  
  clear(key: string): void {
    this.storage.delete(key);
    this.persistToSession();
  }
  
  clearOld(maxAge: number): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.storage.forEach((saved, key) => {
      if (now - saved.timestamp > maxAge) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.storage.delete(key));
    
    if (keysToDelete.length > 0) {
      this.persistToSession();
    }
  }
  
  clearAll(): void {
    this.storage.clear();
    this.persistToSession();
  }
  
  getSize(): number {
    let totalSize = 0;
    this.storage.forEach(saved => {
      totalSize += saved.state.length;
    });
    return totalSize;
  }
  
  private serialize(state: any): string {
    return JSON.stringify(state, this.replacer);
  }
  
  private deserialize(state: string): any {
    return JSON.parse(state, this.reviver);
  }
  
  private replacer(key: string, value: any): any {
    // Handle functions, undefined, symbols
    if (typeof value === 'function' || typeof value === 'undefined' || typeof value === 'symbol') {
      return undefined;
    }
    
    // Handle dates
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    
    // Handle Maps
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) };
    }
    
    // Handle Sets
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value) };
    }
    
    return value;
  }
  
  private reviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type) {
      switch (value.__type) {
        case 'Date':
          return new Date(value.value);
        case 'Map':
          return new Map(value.value);
        case 'Set':
          return new Set(value.value);
      }
    }
    return value;
  }
  
  private loadFromSession(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = sessionStorage.getItem(this.sessionStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.storage.set(key, value as SavedState);
        });
      }
    } catch (error) {
      console.error('Failed to load navigation states from session:', error);
    }
  }
  
  private persistToSession(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const toStore: Record<string, SavedState> = {};
      this.storage.forEach((value, key) => {
        toStore[key] = value;
      });
      
      sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to persist navigation states to session:', error);
      // If quota exceeded, clear old states
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearOld(15 * 60 * 1000); // Clear states older than 15 minutes
        // Try again
        try {
          const toStore: Record<string, SavedState> = {};
          this.storage.forEach((value, key) => {
            toStore[key] = value;
          });
          sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(toStore));
        } catch (retryError) {
          console.error('Failed to persist after cleanup:', retryError);
        }
      }
    }
  }
}

// Export singleton instance
export const statePreservation = new StatePreservationService();