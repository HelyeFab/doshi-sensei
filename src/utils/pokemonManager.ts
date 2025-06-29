import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { pokemonStorage } from './pokemonStorage';
import { User } from 'firebase/auth';

interface PokemonCatch {
  pokemonId: number;
  caughtAt: string;
  jlptLevel: number;
  kanjiIds: string[];
}

interface UserPokedex {
  caught: number[];
  lastCaught?: {
    id: number;
    date: string;
  };
  totalCaught: number;
}

class PokemonManager {
  // Save caught Pokémon based on user subscription status
  async saveCaughtPokemon(
    pokemonId: number,
    jlptLevel: number,
    kanjiIds: string[],
    user: User | null,
    isPremium: boolean
  ): Promise<void> {
    const catchData: PokemonCatch = {
      pokemonId,
      caughtAt: new Date().toISOString(),
      jlptLevel,
      kanjiIds,
    };

    // Always save to IndexedDB for offline access
    await pokemonStorage.savePokemonLocally(pokemonId, jlptLevel, kanjiIds);

    // For premium users, also save to Firebase
    if (user && isPremium) {
      await this.savePokemonToCloud(user.uid, pokemonId);
    }
  }

  // Save Pokémon to Firebase
  private async savePokemonToCloud(userId: string, pokemonId: number): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing document
        await updateDoc(userDocRef, {
          'pokedex.caught': arrayUnion(pokemonId),
          'pokedex.lastCaught': {
            id: pokemonId,
            date: new Date().toISOString(),
          },
          'pokedex.totalCaught': (userDoc.data()?.pokedex?.totalCaught || 0) + 1,
        });
      } else {
        // Create new document
        await setDoc(userDocRef, {
          pokedex: {
            caught: [pokemonId],
            lastCaught: {
              id: pokemonId,
              date: new Date().toISOString(),
            },
            totalCaught: 1,
          },
        }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to save Pokémon to cloud:', error);
      // Don't throw - local storage should still work
    }
  }

  // Get all caught Pokémon (merge local and cloud data)
  async getCaughtPokemon(user: User | null, isPremium: boolean): Promise<number[]> {
    const localPokemon = await pokemonStorage.getAllCaughtPokemonLocally();

    if (!user || !isPremium) {
      // Free users only get local data
      return localPokemon;
    }

    // Premium users get merged data from cloud and local
    try {
      const cloudPokemon = await this.getPokemonFromCloud(user.uid);
      
      // Sync cloud data to local storage
      await pokemonStorage.syncFromCloud(cloudPokemon);
      
      // Return merged list
      return await pokemonStorage.getMergedPokemonList(cloudPokemon);
    } catch (error) {
      console.error('Failed to get cloud Pokémon, falling back to local:', error);
      return localPokemon;
    }
  }

  // Get Pokémon from Firebase
  private async getPokemonFromCloud(userId: string): Promise<number[]> {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data()?.pokedex?.caught) {
        return userDoc.data().pokedex.caught;
      }

      return [];
    } catch (error) {
      console.error('Failed to get Pokémon from cloud:', error);
      return [];
    }
  }

  // Check if a specific Pokémon is caught
  async isPokemonCaught(
    pokemonId: number,
    user: User | null,
    isPremium: boolean
  ): Promise<boolean> {
    const caughtPokemon = await this.getCaughtPokemon(user, isPremium);
    return caughtPokemon.includes(pokemonId);
  }

  // Get Pokédex stats
  async getPokedexStats(user: User | null, isPremium: boolean): Promise<{
    totalCaught: number;
    lastCaught?: { id: number; date: string };
  }> {
    const caughtPokemon = await this.getCaughtPokemon(user, isPremium);

    if (!user || !isPremium) {
      // For free users, just return count
      return {
        totalCaught: caughtPokemon.length,
      };
    }

    // For premium users, try to get additional stats from cloud
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data()?.pokedex) {
        const pokedexData = userDoc.data().pokedex;
        return {
          totalCaught: caughtPokemon.length,
          lastCaught: pokedexData.lastCaught,
        };
      }
    } catch (error) {
      console.error('Failed to get Pokédex stats from cloud:', error);
    }

    return {
      totalCaught: caughtPokemon.length,
    };
  }

  // Clear local storage (for logout or data reset)
  async clearLocalStorage(): Promise<void> {
    await pokemonStorage.clearLocalStorage();
  }

  // Migrate from localStorage to IndexedDB
  async migrateFromLocalStorage(userId?: string): Promise<void> {
    const storageKey = userId ? `pokedex_${userId}` : 'pokedex_guest';
    const existingData = localStorage.getItem(storageKey);

    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        if (parsed.caught && Array.isArray(parsed.caught)) {
          // Save each Pokémon to IndexedDB
          for (const pokemonId of parsed.caught) {
            await pokemonStorage.savePokemonLocally(pokemonId, 0, []);
          }

          // Remove from localStorage after successful migration
          localStorage.removeItem(storageKey);
          console.log('Successfully migrated Pokédex data to IndexedDB');
        }
      } catch (error) {
        console.error('Failed to migrate Pokédex data:', error);
      }
    }
  }
}

// Export singleton instance
export const pokemonManager = new PokemonManager();