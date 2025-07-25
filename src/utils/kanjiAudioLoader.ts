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
  
  // Try to bypass service worker for local audio files
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Add a cache-buster to force bypassing service worker cache
    const bypassPath = `${audioPath}?bypass-sw=${Date.now()}`;
    return playKanjiAudioDirect(bypassPath);
  }
  
  return playKanjiAudioDirect(audioPath);
}

/**
 * Internal function to play audio
 */
function playKanjiAudioDirect(audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    let hasPlayed = false;
    let loadTimeout: NodeJS.Timeout;
    
    // Set a timeout for loading
    const startLoadTimeout = () => {
      loadTimeout = setTimeout(() => {
        if (!hasPlayed) {
          console.error(`[Kanji Audio] Timeout loading audio: ${audioPath}`);
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          reject(new Error('Audio loading timeout'));
        }
      }, 5000); // 5 second timeout
    };
    
    const handleCanPlayThrough = () => {
      clearTimeout(loadTimeout);
      audio.play()
        .then(() => {
          hasPlayed = true;
          console.log(`[Kanji Audio] Started playing: ${audioPath}`);
        })
        .catch((err) => {
          console.error(`[Kanji Audio] Play failed:`, err);
          reject(err);
        });
    };
    
    // Add event listeners
    audio.addEventListener('loadstart', () => {
      console.log(`[Kanji Audio] Started loading: ${audioPath}`);
      startLoadTimeout();
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log(`[Kanji Audio] Audio data loaded: ${audioPath}`);
    });
    
    audio.addEventListener('canplay', () => {
      console.log(`[Kanji Audio] Audio can play: ${audioPath}`);
    });
    
    audio.addEventListener('ended', () => {
      console.log(`[Kanji Audio] Finished playing: ${audioPath}`);
      clearTimeout(loadTimeout);
      resolve();
    });
    
    audio.addEventListener('error', (error) => {
      clearTimeout(loadTimeout);
      const audioError = audio.error;
      
      // More graceful error handling
      if (audioError) {
        const errorTypes = {
          1: 'MEDIA_ERR_ABORTED - The fetching of the audio was aborted',
          2: 'MEDIA_ERR_NETWORK - A network error occurred',
          3: 'MEDIA_ERR_DECODE - An error occurred while decoding the audio',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The audio format is not supported'
        };
        
        // Only log as error if it's not a network error (which we expect with service worker)
        const logLevel = audioError.code === 2 ? 'warn' : 'error';
        console[logLevel](`[Kanji Audio] Error playing ${audioPath}:`);
        console[logLevel](`[Kanji Audio] ${errorTypes[audioError.code] || `Unknown error code: ${audioError.code}`}`);
        console[logLevel](`[Kanji Audio] Error message: ${audioError.message}`);
        
        // For network errors, this is expected due to service worker
        if (audioError.code === 2) {
          console.info(`[Kanji Audio] This is expected - will retry with different method`);
        }
      }
      
      reject(new Error(`Failed to play audio: ${audioError?.message || 'Unknown error'}`));
    });
    
    // Set up canplaythrough handler
    audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
    
    // Try without cache-busting first
    audio.src = audioPath;
    
    // Explicitly set audio properties for better compatibility
    audio.preload = 'auto';
    audio.volume = 1.0;
    
    // Set crossOrigin to bypass service worker issues
    audio.crossOrigin = 'anonymous';
    
    // Load the audio
    audio.load();
  });
}

/**
 * Alternative play method using fetch API to bypass service worker
 */
export async function playKanjiAudioViaFetch(audioPath: string): Promise<void> {
  console.info(`[Kanji Audio] Using fetch method (bypassing service worker): ${audioPath}`);
  
  try {
    // Fetch the audio file directly, bypassing service worker
    const response = await fetch(audioPath, {
      method: 'GET',
      cache: 'no-store', // Bypass all caches
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      });
      
      audio.addEventListener('error', (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      });
      
      audio.play().catch(reject);
    });
  } catch (error) {
    console.error(`[Kanji Audio] Fetch method failed:`, error);
    throw error;
  }
}

/**
 * Play kanji audio with retry mechanism
 */
export async function playKanjiAudioWithRetry(audioPath: string, maxRetries: number = 2): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Kanji Audio] Retry attempt ${attempt} for: ${audioPath}`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
      
      // First attempt with direct method
      if (attempt === 0) {
        await playKanjiAudioDirect(audioPath);
      } else {
        // Subsequent attempts use fetch method to bypass service worker
        await playKanjiAudioViaFetch(audioPath);
      }
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      if (attempt === 0) {
        console.info(`[Kanji Audio] First attempt failed (expected with service worker):`, (error as Error).message);
      } else {
        console.warn(`[Kanji Audio] Attempt ${attempt + 1} failed:`, error);
      }
    }
  }
  
  // All attempts failed
  throw lastError || new Error('Failed to play audio after retries');
}

/**
 * Check if local kanji audio exists
 */
export async function hasLocalKanjiAudio(kanji: string, level?: JLPTLevel): Promise<boolean> {
  const path = await getKanjiAudioPath(kanji, level);
  return path !== null;
}