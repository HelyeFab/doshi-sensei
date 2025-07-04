import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Updated schema to include user identification
interface PokemonDBSchema extends DBSchema {
  caughtPokemon: {
    // Composite key will be an array of [userId, pokemonId] or string if using a combined key
    key: string;
    value: {
      id: string; // Composite key: userId:pokemonId
      pokemonId: number;
      userId: string | null; // null for guest/anonymous users
      userEmail: string | null; // null for guest/anonymous users
      caughtAt: string;
      jlptLevel: number;
      kanjiIds: string[];
    };
    indexes: {
      'by-user': string; // userId for quick filtering
      'by-email': string; // userEmail for additional validation
    };
  };
}

class PokemonStorageManager {
  private db: IDBPDatabase<PokemonDBSchema> | null = null;
  private readonly DB_NAME = 'doshi-sensei-pokemon';
  private readonly DB_VERSION = 2; // Incremented version for schema change

  async initDB(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<PokemonDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Handle version upgrades
          if (oldVersion < 1) {
            // Initial creation
            if (!db.objectStoreNames.contains('caughtPokemon')) {
              const store = db.createObjectStore('caughtPokemon', { keyPath: 'id' });
              // Create indexes for querying by user
              store.createIndex('by-user', 'userId');
              store.createIndex('by-email', 'userEmail');
            }
          }

          if (oldVersion === 1) {
            // Upgrade from v1 to v2
            // Get the existing store
            const store = transaction.objectStore('caughtPokemon');

            // If we need to migrate data, we would do it here
            // For simplicity, we'll clear existing data since it's not associated with users
            // and create new indexes
            if (!store.indexNames.contains('by-user')) {
              store.createIndex('by-user', 'userId');
            }
            if (!store.indexNames.contains('by-email')) {
              store.createIndex('by-email', 'userEmail');
            }

            // Note: This might delete existing Pokemon data if upgrading from v1
            // But it's necessary for proper user isolation
            console.log('Upgraded Pokemon DB schema to include user identification');
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize Pokemon IndexedDB:', error);
      throw error;
    }
  }

  async savePokemonLocally(
    pokemonId: number,
    jlptLevel: number,
    kanjiIds: string[],
    userId: string | null,
    userEmail: string | null
  ): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    // Create a composite ID combining userId and pokemonId
    // Use 'guest' as userId for anonymous users
    const compositeId = `${userId || 'guest'}:${pokemonId}`;

    try {
      await this.db.put('caughtPokemon', {
        id: compositeId,
        pokemonId,
        userId,
        userEmail,
        caughtAt: new Date().toISOString(),
        jlptLevel,
        kanjiIds,
      });
      console.log(`Saved Pokemon ${pokemonId} for user ${userId || 'guest'}`);
    } catch (error) {
      console.error('Failed to save Pokemon locally:', error);
      throw error;
    }
  }

  async getPokemonLocally(pokemonId: number, userId: string | null): Promise<boolean> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create the composite ID
      const compositeId = `${userId || 'guest'}:${pokemonId}`;
      const pokemon = await this.db.get('caughtPokemon', compositeId);
      return !!pokemon;
    } catch (error) {
      console.error('Failed to get Pokemon locally:', error);
      return false;
    }
  }

  async getAllCaughtPokemonLocally(userId: string | null, userEmail: string | null = null): Promise<number[]> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Always return empty for no userId (new/guest)
      if (!userId) {
        return [];
      }
      // For authenticated users, get their Pokemon using both ID and email for verification
      const userPokemon = await this.db.getAllFromIndex('caughtPokemon', 'by-user', userId);
      // If email is provided, do the double check
      if (userEmail) {
        return userPokemon
          .filter(p => p.userEmail === userEmail) // Double check with email
          .map(p => p.pokemonId);
      }
      return userPokemon.map(p => p.pokemonId);
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

  async syncFromCloud(cloudPokemonIds: number[], userId: string, userEmail: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get current local Pokemon for this user
      const localPokemon = await this.getAllCaughtPokemonLocally(userId, userEmail);
      const localSet = new Set(localPokemon);

      // Add cloud Pokemon that aren't in local storage
      for (const pokemonId of cloudPokemonIds) {
        if (!localSet.has(pokemonId)) {
          await this.savePokemonLocally(pokemonId, 0, [], userId, userEmail); // Associate with user
        }
      }
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
      throw error;
    }
  }

  async getMergedPokemonList(cloudPokemonIds: number[], userId: string, userEmail: string): Promise<number[]> {
    await this.initDB();

    try {
      const localPokemon = await this.getAllCaughtPokemonLocally(userId, userEmail);
      const mergedSet = new Set([...localPokemon, ...cloudPokemonIds]);
      return Array.from(mergedSet).sort((a, b) => a - b);
    } catch (error) {
      console.error('Failed to merge Pokemon lists:', error);
      return cloudPokemonIds; // Fallback to cloud data
    }
  }

  // Method to clear all Pokemon for a specific user (e.g., on logout)
  async clearUserPokemon(userId: string): Promise<void> {
    await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get all Pokemon for this user
      const userPokemon = await this.db.getAllFromIndex('caughtPokemon', 'by-user', userId);

      // Delete each one
      const tx = this.db.transaction('caughtPokemon', 'readwrite');
      for (const pokemon of userPokemon) {
        await tx.store.delete(pokemon.id);
      }
      await tx.done;
      console.log(`Cleared all Pokemon for user ${userId}`);
    } catch (error) {
      console.error('Failed to clear user Pokemon:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pokemonStorage = new PokemonStorageManager();
