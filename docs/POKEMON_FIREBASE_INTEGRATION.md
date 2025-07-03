# Pokémon Firebase Integration

## Overview
The Pokémon (Pokédex) feature saves data to Firebase Firestore for premium users, providing cloud sync and backup capabilities.

## Data Structure

### Firebase Document Structure
Data is stored in the `users/{userId}` document under the `pokedex` field:

```javascript
{
  pokedex: {
    caught: [1, 4, 7, 25, ...],  // Array of Pokémon IDs
    lastCaught: {
      id: 25,                     // Pokémon ID
      date: "2024-01-07T..."      // ISO date string
    },
    totalCaught: 4                // Total count
  }
}
```

## Storage Strategy

### Multi-Layer Storage
1. **IndexedDB** (Primary) - Fast, offline-capable storage
2. **localStorage** (Backup) - Fallback for compatibility
3. **Firebase Firestore** (Premium) - Cloud sync for premium users

### Data Flow
1. When a Pokémon is caught:
   - Always saved to IndexedDB
   - Always saved to localStorage (backup)
   - If premium user, also saved to Firebase

2. When loading Pokémon data:
   - Check IndexedDB first
   - Check localStorage as fallback
   - If premium user, sync with Firebase
   - Merge all sources to ensure no data loss

## Security Rules

### Premium-Only Cloud Storage
The Firestore rules ensure only premium users can save Pokédex data to the cloud:

```javascript
// Helper function to check if user is premium
function isPremiumUser(userId) {
  return get(/databases/$(database)/documents/users/$(userId)).data.subscription.subscription.status == 'active' 
    && get(/databases/$(database)/documents/users/$(userId)).data.subscription.subscription.plan in ['monthly', 'yearly'];
}

// Rule: If updating pokedex data, must be premium user
!request.resource.data.diff(resource.data).affectedKeys().hasAny(['pokedex']) ||
isPremiumUser(userId)
```

## Implementation Details

### PokemonManager (`/src/utils/pokemonManager.ts`)
- Handles all Pokémon data operations
- Manages sync between local and cloud storage
- Automatically migrates localStorage data to IndexedDB

### Key Methods:
- `saveCaughtPokemon()` - Saves to all storage layers
- `getCaughtPokemon()` - Retrieves and merges from all sources
- `migrateFromLocalStorage()` - One-time migration to IndexedDB

### Usage in Components:
```javascript
// Save a caught Pokémon
await pokemonManager.saveCaughtPokemon(
  pokemonId,
  jlptLevel,
  kanjiIds,
  user,
  isPremiumUser
);

// Get all caught Pokémon
const caughtPokemon = await pokemonManager.getCaughtPokemon(user, isPremiumUser);
```

## Premium Features
- **Cloud Sync**: Pokédex data syncs across devices
- **Backup**: Data is backed up to Firebase
- **No Local Storage Limits**: Can catch unlimited Pokémon
- **Cross-Device Progress**: Continue your Pokédex on any device

## Free User Experience
- Local storage only (IndexedDB + localStorage)
- Data persists on device
- No sync between devices
- Must upgrade to premium for cloud features