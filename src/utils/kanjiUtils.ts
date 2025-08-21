import { getVocabularyForKanji } from './jmdictVocabulary';
import KanjiManager from './kanjiManager';
import { Kanji, JLPTLevel } from '@/types';

// Extended Kanji interface for the game
export interface GameKanji {
  id: string;
  character: string;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
  jlpt: number;
  vocabulary: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
}

// Convert Kanji to GameKanji format
function convertToGameKanji(kanji: Kanji, index: number): GameKanji {
  // Get vocabulary from JMdict
  const vocabulary = getVocabularyForKanji(kanji.kanji, 3);
  
  // Parse meanings - the API returns a single string that may contain multiple meanings separated by commas
  const meanings = kanji.meaning.split(',').map(m => m.trim());
  
  // If no vocabulary found from JMdict, create basic examples
  if (vocabulary.length === 0) {
    const fallbackVocab = [];
    
    // Add the kanji by itself with its readings
    if (kanji.kunyomi && kanji.kunyomi.length > 0) {
      fallbackVocab.push({
        word: kanji.kanji,
        reading: kanji.kunyomi[0],
        meaning: meanings[0]
      });
    }
    
    return {
      id: `${kanji.jlpt}-${index}-${kanji.kanji}`,
      character: kanji.kanji,
      meanings: meanings,
      on_readings: kanji.onyomi || [],
      kun_readings: kanji.kunyomi || [],
      jlpt: parseInt(kanji.jlpt.replace('N', '')),
      vocabulary: fallbackVocab.slice(0, 3)
    };
  }

  return {
    id: `${kanji.jlpt}-${index}-${kanji.kanji}`,
    character: kanji.kanji,
    meanings: meanings,
    on_readings: kanji.onyomi || [],
    kun_readings: kanji.kunyomi || [],
    jlpt: parseInt(kanji.jlpt.replace('N', '')),
    vocabulary: vocabulary
  };
}

// Get all kanji by JLPT level
export async function getKanjiByJLPT(level: number): Promise<GameKanji[]> {
  const jlptLevel = `N${level}` as JLPTLevel;
  
  try {
    // Load kanji from the same source as kanji browser
    const kanjiData = await KanjiManager.loadKanjiByLevel(jlptLevel);
    
    // Convert to GameKanji format
    const gameKanjiList = kanjiData.map((kanji, index) => 
      convertToGameKanji(kanji, index)
    );
    
    return gameKanjiList;
  } catch (error) {
    console.error(`Error loading kanji for JLPT ${jlptLevel}:`, error);
    return [];
  }
}

// Get kanji storage key for user
export function getKanjiStorageKey(userId?: string): string {
  return userId ? `kanji_quest_progress_${userId}` : 'kanji_quest_progress_local';
}

// Get completed kanji IDs
export function getCompletedKanjiIds(userId?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  const key = getKanjiStorageKey(userId);
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return new Set(data.completedKanjiIds || []);
    } catch {
      return new Set();
    }
  }
  
  return new Set();
}

// Save completed kanji IDs
export function saveCompletedKanjiIds(kanjiIds: string[], userId?: string): void {
  if (typeof window === 'undefined') return;
  
  const key = getKanjiStorageKey(userId);
  const existing = getCompletedKanjiIds(userId);
  
  kanjiIds.forEach(id => existing.add(id));
  
  const data = {
    completedKanjiIds: Array.from(existing),
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem(key, JSON.stringify(data));
}

// Get Pokédex storage key
export function getPokedexStorageKey(userId?: string): string {
  return userId ? `pokedex_${userId}` : 'pokedex_local';
}

// Get Pokédex data
export interface PokedexData {
  caught: number[];
  lastCaught?: {
    id: number;
    name: string;
    date: string;
  };
}

export function getPokedexData(userId?: string): PokedexData {
  if (typeof window === 'undefined') return { caught: [] };
  
  const key = getPokedexStorageKey(userId);
  const stored = localStorage.getItem(key);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { caught: [] };
    }
  }
  
  return { caught: [] };
}

// Save Pokémon to Pokédex
export function savePokemonToPokedex(pokemonId: number, pokemonName: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  
  const key = getPokedexStorageKey(userId);
  const pokedex = getPokedexData(userId);
  
  if (!pokedex.caught.includes(pokemonId)) {
    pokedex.caught.push(pokemonId);
    pokedex.caught.sort((a, b) => a - b); // Keep sorted by ID
  }
  
  pokedex.lastCaught = {
    id: pokemonId,
    name: pokemonName,
    date: new Date().toISOString()
  };
  
  localStorage.setItem(key, JSON.stringify(pokedex));
}