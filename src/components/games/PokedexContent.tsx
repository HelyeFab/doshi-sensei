'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonSpriteUrl, getPokemonSilhouetteStyle } from '@/data/pokemonData';
import { pokemonManager } from '@/utils/pokemonManager';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';

interface PokemonInfo {
  id: number;
  name: string;
  caught: boolean;
  catchDate?: string;
}

// Mock Pokémon names - in a real app, you'd fetch from an API
const POKEMON_NAMES: Record<number, string> = {
  1: "Bulbasaur", 2: "Ivysaur", 3: "Venusaur",
  4: "Charmander", 5: "Charmeleon", 6: "Charizard",
  7: "Squirtle", 8: "Wartortle", 9: "Blastoise",
  10: "Caterpie", 11: "Metapod", 12: "Butterfree",
  13: "Weedle", 14: "Kakuna", 15: "Beedrill",
  16: "Pidgey", 17: "Pidgeotto", 18: "Pidgeot",
  19: "Rattata", 20: "Raticate",
  21: "Spearow", 22: "Fearow",
  23: "Ekans", 24: "Arbok",
  25: "Pikachu", 26: "Raichu",
  27: "Sandshrew", 28: "Sandslash",
  29: "Nidoran♀", 30: "Nidorina", 31: "Nidoqueen",
  32: "Nidoran♂", 33: "Nidorino", 34: "Nidoking",
  35: "Clefairy", 36: "Clefable",
  37: "Vulpix", 38: "Ninetales",
  39: "Jigglypuff", 40: "Wigglytuff",
  41: "Zubat", 42: "Golbat",
  43: "Oddish", 44: "Gloom", 45: "Vileplume",
  46: "Paras", 47: "Parasect",
  48: "Venonat", 49: "Venomoth",
  50: "Diglett", 51: "Dugtrio",
  52: "Meowth", 53: "Persian",
  54: "Psyduck", 55: "Golduck",
  56: "Mankey", 57: "Primeape",
  58: "Growlithe", 59: "Arcanine",
  60: "Poliwag", 61: "Poliwhirl", 62: "Poliwrath",
  63: "Abra", 64: "Kadabra", 65: "Alakazam",
  66: "Machop", 67: "Machoke", 68: "Machamp",
  69: "Bellsprout", 70: "Weepinbell", 71: "Victreebel",
  72: "Tentacool", 73: "Tentacruel",
  74: "Geodude", 75: "Graveler", 76: "Golem",
  77: "Ponyta", 78: "Rapidash",
  79: "Slowpoke", 80: "Slowbro",
  81: "Magnemite", 82: "Magneton",
  83: "Farfetch'd", 84: "Doduo", 85: "Dodrio",
  86: "Seel", 87: "Dewgong",
  88: "Grimer", 89: "Muk",
  90: "Shellder", 91: "Cloyster",
  92: "Gastly", 93: "Haunter", 94: "Gengar",
  95: "Onix", 96: "Drowzee", 97: "Hypno",
  98: "Krabby", 99: "Kingler", 100: "Voltorb",
  101: "Electrode", 102: "Exeggcute", 103: "Exeggutor",
  104: "Cubone", 105: "Marowak",
  106: "Hitmonlee", 107: "Hitmonchan",
  108: "Lickitung", 109: "Koffing", 110: "Weezing",
  111: "Rhyhorn", 112: "Rhydon",
  113: "Chansey", 114: "Tangela",
  115: "Kangaskhan", 116: "Horsea", 117: "Seadra",
  118: "Goldeen", 119: "Seaking",
  120: "Staryu", 121: "Starmie",
  122: "Mr. Mime", 123: "Scyther",
  124: "Jynx", 125: "Electabuzz",
  126: "Magmar", 127: "Pinsir",
  128: "Tauros", 129: "Magikarp", 130: "Gyarados",
  131: "Lapras", 132: "Ditto",
  133: "Eevee", 134: "Vaporeon", 135: "Jolteon", 136: "Flareon",
  137: "Porygon", 138: "Omanyte", 139: "Omastar",
  140: "Kabuto", 141: "Kabutops",
  142: "Aerodactyl", 143: "Snorlax",
  144: "Articuno", 145: "Zapdos", 146: "Moltres",
  147: "Dratini", 148: "Dragonair", 149: "Dragonite",
  150: "Mewtwo", 151: "Mew",
  249: "Lugia", 250: "Ho-Oh",
  818: "Inteleon", // Adding the specific Pokémon shown
  // Add more as needed
};

export default function PokedexContent({ userId, onClose }: { userId?: string; onClose?: () => void }) {
  const { user } = useAuth();
  const { userType } = useSubscription2();
  const [caughtPokemonIds, setCaughtPokemonIds] = useState<number[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'caught'>('caught');
  const [loadedPokemonCount, setLoadedPokemonCount] = useState(251); // Start with Gen 1 & 2

  useEffect(() => {
    const loadCaughtPokemon = async () => {
      try {
        // Wait a bit to ensure user is fully loaded
        if (user === undefined) return; // Still loading
        
        // Determine if user is premium based on userType
        const isPremiumUser = userType === 'monthly' || userType === 'yearly' || userType === 'admin';
        
        // Pass user (can be null for guests) and premium status
        const caughtIds = await pokemonManager.getCaughtPokemon(user, isPremiumUser);
        setCaughtPokemonIds(caughtIds);
      } catch (error) {
        console.error('Error loading caught Pokemon:', error);
        setCaughtPokemonIds([]);
      }
    };

    loadCaughtPokemon();
  }, [user, userType]);

  const getAllPokemon = (): PokemonInfo[] => {
    const allPokemon: PokemonInfo[] = [];
    
    // Generate based on loaded count
    for (let i = 1; i <= loadedPokemonCount; i++) {
      const isCaught = caughtPokemonIds.includes(i);
      allPokemon.push({
        id: i,
        name: POKEMON_NAMES[i] || `Pokémon #${i}`,
        caught: isCaught
      });
    }
    
    return allPokemon;
  };

  const getCaughtPokemon = (): PokemonInfo[] => {
    return caughtPokemonIds
      .sort((a, b) => a - b)
      .map(id => ({
        id,
        name: POKEMON_NAMES[id] || `Pokémon #${id}`,
        caught: true
      }));
  };

  const renderPokemonGrid = () => {
    const pokemonList = activeTab === 'caught' ? getCaughtPokemon() : getAllPokemon();
    
    if (activeTab === 'caught' && pokemonList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <img 
            src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
            alt="Empty Pokéball" 
            className="w-24 h-24 opacity-30 mb-4"
          />
          <p className="text-muted-foreground text-center">
            No Pokémon caught yet!<br />
            Keep playing to catch them all!
          </p>
        </div>
      );
    }
    
    return (
      <div className="px-1 md:px-4 py-2 md:py-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-4">
        {pokemonList.map((pokemon) => (
          <motion.button
            key={pokemon.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => pokemon.caught && setSelectedPokemon(pokemon.id)}
            className={`relative aspect-square rounded-xl p-2 transition-all min-h-[120px] ${
              pokemon.caught 
                ? 'bg-gradient-to-b from-background to-muted border-2 border-border hover:border-red-400 hover:shadow-lg hover:shadow-red-200/50 cursor-pointer' 
                : 'bg-muted/50 border-2 border-border cursor-not-allowed opacity-75'
            }`}
            disabled={!pokemon.caught}
          >
            {/* Pokéball background for caught Pokémon */}
            {pokemon.caught && (
              <div className="absolute inset-0 opacity-5">
                <img 
                  src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                  alt="Pokéball background" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="relative flex flex-col h-full overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-2">
                <img
                  src={getPokemonSpriteUrl(pokemon.id)}
                  alt={pokemon.name}
                  className="w-full h-full object-contain max-h-[80%]"
                  style={pokemon.caught ? {} : getPokemonSilhouetteStyle()}
                />
              </div>
              <div className="absolute bottom-1 left-0 right-0 text-center">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                  pokemon.caught 
                    ? 'bg-white/90 text-gray-800 shadow-sm' 
                    : 'bg-gray-600/80 text-white'
                }`}>
                  #{pokemon.id.toString().padStart(3, '0')}
                </span>
              </div>
            </div>
            
            {/* Caught indicator */}
            {pokemon.caught && (
              <div className="absolute top-1 right-1">
                <img 
                  src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                  alt="Caught" 
                  className="w-4 h-4"
                />
              </div>
            )}
          </motion.button>
        ))}
        </div>
        
        {/* Load More Button */}
        {activeTab === 'all' && loadedPokemonCount < 1025 && (
          <div className="flex justify-center p-4 pb-32 md:pb-8">
            <button
              onClick={() => {
                const nextCount = Math.min(loadedPokemonCount + 100, 1025);
                setLoadedPokemonCount(nextCount);
              }}
              className="flex items-center gap-3 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              <motion.img 
                src="/flat-icons/188915-pokemon-go/png/pokeball.png"
                alt="Load more"
                className="w-6 h-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <span>Load More Pokémon ({loadedPokemonCount} / 1025)</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Pokémon theme */}
      <div className="relative bg-gradient-to-r from-red-500 to-red-600 p-6 -mt-6 -mx-6 rounded-t-3xl">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `url('/flat-icons/188915-pokemon-go/png/pokeball.png')`,
            backgroundSize: '50px 50px',
            backgroundRepeat: 'repeat'
          }} />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/flat-icons/188915-pokemon-go/png/pokedex.png" 
              alt="Pokédex" 
              className="w-12 h-12"
            />
            <div>
              <h2 className="text-2xl font-bold text-white">Pokédex</h2>
              <div className="flex items-center gap-2 mt-1">
                <img 
                  src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                  alt="Pokéball" 
                  className="w-5 h-5"
                />
                <p className="text-white/90">
                  {caughtPokemonIds.length} Pokémon Caught
                </p>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Close Pokédex"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-6 relative z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab('caught');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'caught' 
                ? 'bg-white text-red-600 shadow-lg' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <img 
              src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
              alt="Pokéball icon" 
              className="w-4 h-4"
            />
            Caught ({caughtPokemonIds.length})
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab('all');
              setLoadedPokemonCount(251); // Reset when switching tabs
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'all' 
                ? 'bg-white text-red-600 shadow-lg' 
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <img 
              src="/flat-icons/188915-pokemon-go/png/map.png" 
              alt="Map icon" 
              className="w-4 h-4"
            />
            All Pokémon
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        {renderPokemonGrid()}
      </div>

      {/* Selected Pokémon Detail */}
      <AnimatePresence>
        {selectedPokemon && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-50"
            onClick={() => setSelectedPokemon(null)}
          >
            <div className="flex items-center gap-4">
              <img
                src={getPokemonSpriteUrl(selectedPokemon)}
                alt={POKEMON_NAMES[selectedPokemon]}
                className="w-32 h-32 object-contain"
              />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {POKEMON_NAMES[selectedPokemon] || `Pokémon #${selectedPokemon}`}
                </h3>
                <p className="text-gray-600">#{selectedPokemon.toString().padStart(3, '0')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}