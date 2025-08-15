import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { pokemonStorage } from './pokemonStorage';
import { User } from 'firebase/auth';
import { trackPokemonCaught } from '@/lib/stats/trackingEvents';
import { statsTracker } from '@/lib/stats/statsTracker';

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

    // Get user identification for double-check auth
    const userId = user?.uid || null;
    const userEmail = user?.email || null;

    // Always save to IndexedDB for offline access with user identification
    await pokemonStorage.savePokemonLocally(pokemonId, jlptLevel, kanjiIds, userId, userEmail);

    // Track Pokemon catch in stats system
    await trackPokemonCaught(pokemonId.toString(), `Pokemon #${pokemonId}`).catch(error => {
      console.error('Failed to track Pokemon catch:', error);
    });

    // For premium users, also save to Firebase
    if (user && isPremium) {
      // User is premium, saving to Firebase...
      await this.savePokemonToCloud(user.uid, userEmail, pokemonId);
    } else {
      // User is not premium or not logged in, skipping Firebase save
    }
  }

  // Save Pokémon to Firebase
  private async savePokemonToCloud(userId: string, userEmail: string | null, pokemonId: number): Promise<void> {
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
          
          // Refresh Pokemon count in stats tracker
          await statsTracker.refreshPokemonCount();
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
        
        // Refresh Pokemon count in stats tracker
        await statsTracker.refreshPokemonCount();
      }
    } catch (error) {
      // Failed to save Pokémon to cloud - local storage should still work
      // Don't throw - local storage should still work
    }
  }

  // Get all caught Pokémon (merge local and cloud data)
  async getCaughtPokemon(user: User | null, isPremium: boolean): Promise<number[]> {
    // getCaughtPokemon called
    try {
      // Always return empty for no user (new/guest)
      if (!user) return [];
      const userId = user.uid;
      const userEmail = user.email;
      if (isPremium && userId) {
        // Always fetch from cloud first
        const cloudPokemonIds = await this.getPokemonFromCloud(userId, userEmail || '');
        if (cloudPokemonIds.length > 0) {
          // Always sync to local for offline use
          await pokemonStorage.syncFromCloud(cloudPokemonIds, userId, userEmail || '');
          return cloudPokemonIds;
        }
        // Fallback to local if cloud is empty
        return await pokemonStorage.getAllCaughtPokemonLocally(userId, userEmail);
      } else {
        // Free users: only use local
        return await pokemonStorage.getAllCaughtPokemonLocally(userId, userEmail);
      }
    } catch (error) {
      console.error('Error getting caught Pokémon:', error);
      return [];
    }
  }

  // Get Pokémon from Firebase
  private async getPokemonFromCloud(userId: string, userEmail: string): Promise<number[]> {
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
      // Get user identification for double-check auth
      const userId = user.uid;
      const userEmail = user.email;

      if (!userId || !userEmail) {
        console.error('Cannot sync without complete user identification');
        return;
      }

      // Get all local Pokemon with user auth
      const localPokemon = await pokemonStorage.getAllCaughtPokemonLocally(userId, userEmail);

      // Force sync - Pokemon to sync
      if (localPokemon.length > 0) {
        const userDocRef = doc(db, 'users', userId);
        const updateData = {
          pokedex: {
            caught: localPokemon,
            lastCaught: {
              id: localPokemon[localPokemon.length - 1],
              date: new Date().toISOString(),
            },
            totalCaught: localPokemon.length
          }
        };

        // Force sync - Updating Firebase
        await updateDoc(userDocRef, updateData);

      } else {

      }
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pokemonManager = new PokemonManager();
