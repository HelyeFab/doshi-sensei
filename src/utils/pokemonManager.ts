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
    // saveCaughtPokemon called with pokemonId and user details

    const catchData: PokemonCatch = {
      pokemonId,
      caughtAt: new Date().toISOString(),
      jlptLevel,
      kanjiIds,
    };

    // Always save to IndexedDB for offline access
    await pokemonStorage.savePokemonLocally(pokemonId, jlptLevel, kanjiIds);

    // Also save to localStorage as a backup (for compatibility)
    const storageKey = user ? `pokedex_${user.uid}` : 'pokedex_guest';
    try {
      const existingData = localStorage.getItem(storageKey);
      const pokedexData = existingData ? JSON.parse(existingData) : { caught: [] };
      
      if (!pokedexData.caught.includes(pokemonId)) {
        pokedexData.caught.push(pokemonId);
        pokedexData.lastCaught = {
          id: pokemonId,
          date: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(pokedexData));
        // Saved Pokémon to localStorage backup
      }
    } catch (error) {
      // Failed to save to localStorage backup
    }

    // For premium users, also save to Firebase
    if (user && isPremium) {
      // User is premium, saving to Firebase...
      await this.savePokemonToCloud(user.uid, pokemonId);
    } else {
      // User is not premium or not logged in, skipping Firebase save
    }
  }

  // Save Pokémon to Firebase
  private async savePokemonToCloud(userId: string, pokemonId: number): Promise<void> {
    // savePokemonToCloud called for user
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      // User document exists check

      if (userDoc.exists()) {
        // Update existing document
        const currentData = userDoc.data();
        // Current user data and caught Pokémon retrieved
        
        // Get current pokedex data or create new structure
        const currentPokedex = currentData?.pokedex || { caught: [], totalCaught: 0 };
        const currentCaught = currentPokedex.caught || [];
        
        // Only add if not already caught
        if (!currentCaught.includes(pokemonId)) {
          currentCaught.push(pokemonId);
        }
        
        const updateData = {
          pokedex: {
            caught: currentCaught,
            lastCaught: {
              id: pokemonId,
              date: new Date().toISOString(),
            },
            totalCaught: currentCaught.length
          }
        };
        
        // Updating Firebase with Pokémon data
        
        try {
          await updateDoc(userDocRef, updateData);
          // Successfully updated Firebase with Pokémon
          
          // Verify the update
          const verifyDoc = await getDoc(userDocRef);
          // Verification - Document updated with pokedex data
        } catch (updateError) {
          // updateDoc failed
          throw updateError;
        }
      } else {
        // Create new document
        // User document does not exist, creating with merge...
        const newData = {
          pokedex: {
            caught: [pokemonId],
            lastCaught: {
              id: pokemonId,
              date: new Date().toISOString(),
            },
            totalCaught: 1,
          },
        };
        // Creating new document with pokedex data
        await setDoc(userDocRef, newData, { merge: true });
        // Successfully created Firebase document with Pokémon
      }
    } catch (error) {
      // Failed to save Pokémon to cloud - local storage should still work
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
      // Failed to get cloud Pokémon, falling back to local
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
      // Failed to get Pokémon from cloud
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
      // Failed to get Pokédex stats from cloud
    }

    return {
      totalCaught: caughtPokemon.length,
    };
  }

  // Clear local storage (for logout or data reset)
  async clearLocalStorage(): Promise<void> {
    await pokemonStorage.clearLocalStorage();
  }

  // Manual sync function to force save all local Pokemon to cloud
  async forceSyncToCloud(user: User): Promise<void> {
    // Force sync to cloud started
    try {
      // Get all local Pokemon
      const localPokemon = await pokemonStorage.getAllCaughtPokemonLocally();
      
      // Also check localStorage
      const storageKey = `pokedex_${user.uid}`;
      const localStorageData = localStorage.getItem(storageKey);
      let allPokemon = [...localPokemon];
      
      if (localStorageData) {
        const parsed = JSON.parse(localStorageData);
        if (parsed.caught) {
          allPokemon = [...new Set([...allPokemon, ...parsed.caught])];
        }
      }
      
      // Force sync - Pokemon to sync
      
      if (allPokemon.length > 0) {
        const userDocRef = doc(db, 'users', user.uid);
        const updateData = {
          pokedex: {
            caught: allPokemon,
            lastCaught: {
              id: allPokemon[allPokemon.length - 1],
              date: new Date().toISOString(),
            },
            totalCaught: allPokemon.length
          }
        };
        
        // Force sync - Updating Firebase
        await updateDoc(userDocRef, updateData);
        // Force sync completed successfully
      } else {
        // No Pokemon to sync
      }
    } catch (error) {
      // Force sync failed
      throw error;
    }
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
          // Successfully migrated Pokédex data to IndexedDB
        }
      } catch (error) {
        // Failed to migrate Pokédex data
      }
    }
  }
}

// Export singleton instance
export const pokemonManager = new PokemonManager();