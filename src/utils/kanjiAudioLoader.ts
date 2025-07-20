// Utility to load pre-downloaded JLPT kanji audio files
import { JLPTLevel } from '@/types';

export interface KanjiAudioIndex {
  [level: string]: {
    characters: Record<string, string>;
    onyomi: Record<string, Record<string, string>>;
    kunyomi: Record<string, Record<string, string>>;
  };
}

// Cache for loaded audio index
let audioIndexCache: KanjiAudioIndex | null = null;

/**
 * Load the kanji audio index
 */
async function loadKanjiAudioIndex(): Promise<KanjiAudioIndex | null> {
  if (audioIndexCache) {
    return audioIndexCache;
  }

  try {
    const response = await fetch('/audio/kanji/index.json');
    if (response.ok) {
      audioIndexCache = await response.json();
      return audioIndexCache;
    }
  } catch (error) {
    console.warn('Failed to load kanji audio index:', error);
  }

  return null;
}

/**
 * Get kanji character audio path
 */
export async function getKanjiAudioPath(kanji: string, level?: JLPTLevel): Promise<string | null> {
  const audioIndex = await loadKanjiAudioIndex();
  if (!audioIndex) {
    console.log(`[Kanji Audio] No audio index found`);
    return null;
  }

  // If level is provided, check that level first
  if (level && audioIndex[level]?.characters[kanji]) {
    console.log(`[Kanji Audio] Found character audio: "${kanji}" (${level}) → ${audioIndex[level].characters[kanji]}`);
    return audioIndex[level].characters[kanji];
  }

  // Otherwise, search all levels
  for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    if (audioIndex[lvl]?.characters[kanji]) {
      console.log(`[Kanji Audio] Found character audio: "${kanji}" (${lvl}) → ${audioIndex[lvl].characters[kanji]}`);
      return audioIndex[lvl].characters[kanji];
    }
  }

  console.log(`[Kanji Audio] No local audio found for kanji: "${kanji}"`);
  return null;
}

/**
 * Get onyomi reading audio path
 */
export async function getOnyomiAudioPath(kanji: string, reading: string, level?: JLPTLevel): Promise<string | null> {
  const audioIndex = await loadKanjiAudioIndex();
  if (!audioIndex) {
    return null;
  }

  // Normalize the reading (it might come with special characters)
  const safeReading = reading.replace(/[\/\\?%*:|"<>]/g, '_');

  // If level is provided, check that level first
  if (level && audioIndex[level]?.onyomi[kanji]?.[safeReading]) {
    console.log(`[Kanji Audio] Found onyomi audio: "${kanji}" "${reading}" (${level})`);
    return audioIndex[level].onyomi[kanji][safeReading];
  }

  // Otherwise, search all levels
  for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    if (audioIndex[lvl]?.onyomi[kanji]?.[safeReading]) {
      console.log(`[Kanji Audio] Found onyomi audio: "${kanji}" "${reading}" (${lvl})`);
      return audioIndex[lvl].onyomi[kanji][safeReading];
    }
  }

  console.log(`[Kanji Audio] No local onyomi audio for: "${kanji}" "${reading}"`);
  return null;
}

/**
 * Get kunyomi reading audio path
 */
export async function getKunyomiAudioPath(kanji: string, reading: string, level?: JLPTLevel): Promise<string | null> {
  const audioIndex = await loadKanjiAudioIndex();
  if (!audioIndex) {
    return null;
  }

  // Normalize the reading (it might come with special characters)
  const safeReading = reading.replace(/[\/\\?%*:|"<>]/g, '_');

  // If level is provided, check that level first
  if (level && audioIndex[level]?.kunyomi[kanji]?.[safeReading]) {
    console.log(`[Kanji Audio] Found kunyomi audio: "${kanji}" "${reading}" (${level})`);
    return audioIndex[level].kunyomi[kanji][safeReading];
  }

  // Otherwise, search all levels
  for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1']) {
    if (audioIndex[lvl]?.kunyomi[kanji]?.[safeReading]) {
      console.log(`[Kanji Audio] Found kunyomi audio: "${kanji}" "${reading}" (${lvl})`);
      return audioIndex[lvl].kunyomi[kanji][safeReading];
    }
  }

  console.log(`[Kanji Audio] No local kunyomi audio for: "${kanji}" "${reading}"`);
  return null;
}

/**
 * Play kanji audio from local file
 */
export async function playKanjiAudio(audioPath: string): Promise<void> {
  console.log(`[Kanji Audio] Playing local audio file: ${audioPath}`);
  
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    // Add event listeners
    audio.addEventListener('loadeddata', () => {
      console.log(`[Kanji Audio] Audio loaded and ready: ${audioPath}`);
    });
    
    audio.addEventListener('ended', () => {
      console.log(`[Kanji Audio] Finished playing: ${audioPath}`);
      resolve();
    });
    
    audio.addEventListener('error', (error) => {
      console.error(`[Kanji Audio] Error playing ${audioPath}:`, error);
      const audioError = audio.error;
      if (audioError) {
        console.error(`[Kanji Audio] Error code: ${audioError.code}, message: ${audioError.message}`);
      }
      reject(error);
    });
    
    // Set source and load
    audio.src = audioPath;
    audio.load();
    
    // Play when ready
    audio.addEventListener('canplaythrough', () => {
      audio.play()
        .then(() => console.log(`[Kanji Audio] Started playing: ${audioPath}`))
        .catch((err) => {
          console.error(`[Kanji Audio] Play failed:`, err);
          reject(err);
        });
    }, { once: true });
  });
}

/**
 * Check if local kanji audio exists
 */
export async function hasLocalKanjiAudio(kanji: string, level?: JLPTLevel): Promise<boolean> {
  const path = await getKanjiAudioPath(kanji, level);
  return path !== null;
}