import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PokemonDBSchema extends DBSchema {
  caughtPokemon: {
    key: number;
    value: {
      pokemonId: number;
      caughtAt: string;
      jlptLevel: number;
      kanjiIds: string[];
    };
  };
}

class PokemonStorageManager {
  private db: IDBPDatabase<PokemonDBSchema> | null = null;
  private readonly DB_NAME = 'doshi-sensei-pokemon';
  private readonly DB_VERSION = 1;

  async initDB(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<PokemonDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create the caughtPokemon store if it doesn't exist
          if (!db.objectStoreNames.contains('caughtPokemon')) {
            db.createObjectStore('caughtPokemon', { keyPath: 'pokemonId' });
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize Pokemon IndexedDB:', error);
      throw error;
    }
  }

  async savePokemonLocally(pokemonId: number, jlptLevel: number, kanjiIds: string[]): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.put('caughtPokemon', {
        pokemonId,
        caughtAt: new Date().toISOString(),
        jlptLevel,
        kanjiIds,
      });
    } catch (error) {
      console.error('Failed to save Pokemon locally:', error);
      throw error;
    }
  }

  async getPokemonLocally(pokemonId: number): Promise<boolean> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const pokemon = await this.db.get('caughtPokemon', pokemonId);
      return !!pokemon;
    } catch (error) {
      console.error('Failed to get Pokemon locally:', error);
      return false;
    }
  }

  async getAllCaughtPokemonLocally(): Promise<number[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const allPokemon = await this.db.getAll('caughtPokemon');
      return allPokemon.map(p => p.pokemonId);
    } catch (error) {
      console.error('Failed to get all caught Pokemon locally:', error);
      return [];
    }
  }

  async clearLocalStorage(): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      const tx = this.db.transaction('caughtPokemon', 'readwrite');
      await tx.objectStore('caughtPokemon').clear();
      await tx.done;
    } catch (error) {
      console.error('Failed to clear local Pokemon storage:', error);
      throw error;
    }
  }

  async syncFromCloud(cloudPokemonIds: number[]): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get current local Pokemon
      const localPokemon = await this.getAllCaughtPokemonLocally();
      const localSet = new Set(localPokemon);

      // Add cloud Pokemon that aren't in local storage
      for (const pokemonId of cloudPokemonIds) {
        if (!localSet.has(pokemonId)) {
          await this.savePokemonLocally(pokemonId, 0, []); // We don't have full data, just the ID
        }
      }
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      throw error;
    }
  }

  async getMergedPokemonList(cloudPokemonIds: number[]): Promise<number[]> {
    await this.initDB();
    
    try {
      const localPokemon = await this.getAllCaughtPokemonLocally();
      const mergedSet = new Set([...localPokemon, ...cloudPokemonIds]);
      return Array.from(mergedSet).sort((a, b) => a - b);
    } catch (error) {
      console.error('Failed to merge Pokemon lists:', error);
      return cloudPokemonIds; // Fallback to cloud data
    }
  }
}

// Export singleton instance
export const pokemonStorage = new PokemonStorageManager();