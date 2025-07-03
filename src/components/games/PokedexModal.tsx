'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonSpriteUrl, getPokemonSilhouetteStyle } from '@/data/pokemonData';
import { getPokedexData, PokedexData } from '@/utils/kanjiUtils';
import { pokemonManager } from '@/utils/pokemonManager';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useModal } from '@/contexts/ModalContext';

interface PokedexModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

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

export default function PokedexModal({ isOpen, onClose, userId }: PokedexModalProps) {
  const { user } = useAuth();
  const { userType } = useSubscription();
  const { setModalOpen } = useModal();
  const [caughtPokemonIds, setCaughtPokemonIds] = useState<number[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'caught'>('caught');
  const [loadedPokemonCount, setLoadedPokemonCount] = useState(251); // Start with Gen 1 & 2
  const [loading, setLoading] = useState(false);
  const [lastCaught, setLastCaught] = useState<{ id: number; date: string } | null>(null);
  
  // Component is open and ready

  useEffect(() => {
    if (isOpen) {
      loadCaughtPokemon();
      setSelectedPokemon(null); // Reset selected Pokemon when modal opens
      setActiveTab('caught'); // Reset to caught tab
      setLoadedPokemonCount(251); // Reset loaded count
      setModalOpen(true); // Set modal state for navbar hiding
    } else {
      setModalOpen(false); // Reset modal state
    }
  }, [isOpen, user, userType, setModalOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setModalOpen(false);
    };
  }, [setModalOpen]);

  const loadCaughtPokemon = async () => {
    try {
      setLoading(true);
      const isPremiumUser = userType === 'monthly' || userType === 'yearly';
      const caughtPokemon = await pokemonManager.getCaughtPokemon(user, isPremiumUser);
      setCaughtPokemonIds(caughtPokemon);
      
      // Try to get last caught info from cloud for premium users
      if (user && isPremiumUser) {
        const stats = await pokemonManager.getPokedexStats(user, isPremiumUser);
        if (stats.lastCaught) {
          setLastCaught(stats.lastCaught);
        }
      }
    } catch (error) {
      // Failed to load caught Pokémon
      // Fallback to localStorage if needed
      const pokedexData = getPokedexData(userId);
      setCaughtPokemonIds(pokedexData.caught);
      if (pokedexData.lastCaught) {
        setLastCaught(pokedexData.lastCaught);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPokemonName = (id: number): string => {
    return POKEMON_NAMES[id] || `Pokémon #${id}`;
  };

  const renderPokemonGrid = () => {
    const pokemonList: PokemonInfo[] = [];
    
    if (activeTab === 'caught') {
      // Show only caught Pokémon
      caughtPokemonIds.forEach(id => {
        pokemonList.push({
          id,
          name: getPokemonName(id),
          caught: true
        });
      });
    } else {
      // Show all 1025 Pokémon as per game documentation
      // For performance, show Pokémon based on loadedPokemonCount
      for (let i = 1; i <= Math.min(loadedPokemonCount, 1025); i++) {
        pokemonList.push({
          id: i,
          name: getPokemonName(i),
          caught: caughtPokemonIds.includes(i)
        });
      }
    }

    if (pokemonList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center p-8">
          <img 
            src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
            alt="No Pokémon" 
            className="w-16 h-16 mb-4 opacity-30"
          />
          <p className="text-lg text-muted-foreground">
            {activeTab === 'caught' 
              ? "No Pokémon caught yet. Start your journey in Kanji Quest!" 
              : "Loading Pokémon..."}
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4 p-4 pb-20 md:pb-4">
        {pokemonList.map(pokemon => (
          <motion.button
            key={pokemon.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => pokemon.caught && setSelectedPokemon(pokemon.id)}
            className={`relative aspect-square rounded-xl p-2 transition-all min-h-[120px] ${
              pokemon.caught 
                ? 'bg-gradient-to-b from-white to-gray-50 border-2 border-gray-300 hover:border-red-400 hover:shadow-lg hover:shadow-red-200/50 cursor-pointer' 
                : 'bg-gray-100/50 border-2 border-gray-200 cursor-not-allowed opacity-75'
            }`}
            disabled={!pokemon.caught}
          >
            {/* Pokéball background for caught Pokémon */}
            {pokemon.caught && (
              <div className="absolute inset-0 opacity-5">
                <img 
                  src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                  alt="" 
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="bg-background rounded-t-2xl md:rounded-lg w-full h-[95vh] md:h-auto md:max-w-6xl md:max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header with Pokémon theme */}
          <div className="relative bg-gradient-to-r from-red-500 to-red-600 p-6">
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
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                  alt="" 
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
                  alt="" 
                  className="w-4 h-4"
                />
                All Pokémon
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {renderPokemonGrid()}
          </div>

          {/* Selected Pokémon Detail */}
          <AnimatePresence>
            {selectedPokemon && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="fixed inset-0 bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm flex items-center justify-center p-8 z-[60]"
                onClick={() => setSelectedPokemon(null)}
              >
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                  <img 
                    src="/flat-icons/188915-pokemon-go/png/star.png" 
                    alt="" 
                    className="absolute top-10 left-10 w-8 h-8 animate-pulse"
                  />
                  <img 
                    src="/flat-icons/188915-pokemon-go/png/star.png" 
                    alt="" 
                    className="absolute bottom-10 right-10 w-8 h-8 animate-pulse"
                  />
                  <img 
                    src="/flat-icons/188915-pokemon-go/png/star.png" 
                    alt="" 
                    className="absolute top-20 right-20 w-6 h-6 animate-pulse"
                  />
                </div>

                <div className="relative text-center max-w-md bg-gradient-to-br from-gray-400/90 to-gray-600/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-500/30" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPokemon(null);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
                    aria-label="Close"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Pokémon sprite with glow effect */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full blur-3xl opacity-50 animate-pulse" />
                    <motion.img
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", duration: 0.8 }}
                      src={getPokemonSpriteUrl(selectedPokemon)}
                      alt={getPokemonName(selectedPokemon)}
                      className="relative w-64 h-64 mx-auto mb-4"
                    />
                  </div>
                  
                  <h3 className="text-3xl font-bold mb-2 text-gray-800">
                    {POKEMON_NAMES[selectedPokemon] || `Pokémon #${selectedPokemon}`}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <img 
                      src="/flat-icons/188915-pokemon-go/png/pokeball.png" 
                      alt="" 
                      className="w-6 h-6"
                    />
                    <p className="text-xl text-gray-600 font-semibold">
                      #{selectedPokemon.toString().padStart(3, '0')}
                    </p>
                  </div>
                  
                  {lastCaught?.id === selectedPokemon && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-center gap-2">
                        <img 
                          src="/flat-icons/188915-pokemon-go/png/star.png" 
                          alt="" 
                          className="w-5 h-5"
                        />
                        <div>
                          <p className="text-sm text-gray-600">Caught on</p>
                          <p className="font-bold text-gray-800">
                            {new Date(lastCaught.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}