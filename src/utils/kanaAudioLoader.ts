// Utility to load pre-downloaded kana audio files
import { kanaData } from '@/data/kanaData';

export interface KanaAudioIndex {
  hiragana: Record<string, string>;
  katakana: Record<string, string>;
}

// Cache for loaded audio index
let audioIndexCache: KanaAudioIndex | null = null;

/**
 * Load the kana audio index
 */
async function loadKanaAudioIndex(): Promise<KanaAudioIndex | null> {
  if (audioIndexCache) {
    return audioIndexCache;
  }

  try {
    const response = await fetch('/audio/kana/index.json');
    if (response.ok) {
      audioIndexCache = await response.json();
      return audioIndexCache;
    }
  } catch (error) {
    console.warn('Failed to load kana audio index:', error);
  }

  return null;
}

/**
 * Check if text is a single kana character and get its audio path
 */
export async function getKanaAudioPath(text: string): Promise<string | null> {
  // Quick check - if text is not a single character, it's not kana
  if (text.length !== 1 && text.length !== 2) {
    return null;
  }

  const audioIndex = await loadKanaAudioIndex();
  if (!audioIndex) {
    console.log(`[Kana Audio] No audio index found for: "${text}"`);
    return null;
  }

  // Find the kana in our data
  const kana = kanaData.find(k => k.hiragana === text || k.katakana === text);
  if (!kana) {
    console.log(`[Kana Audio] Not a kana character: "${text}"`);
    return null;
  }

  // Return the appropriate audio path
  if (kana.hiragana === text && audioIndex.hiragana[kana.id]) {
    console.log(`[Kana Audio] Found local hiragana audio: "${text}" → ${audioIndex.hiragana[kana.id]}`);
    return audioIndex.hiragana[kana.id];
  } else if (kana.katakana === text && audioIndex.katakana[kana.id]) {
    console.log(`[Kana Audio] Found local katakana audio: "${text}" → ${audioIndex.katakana[kana.id]}`);
    return audioIndex.katakana[kana.id];
  }

  console.log(`[Kana Audio] No local audio found for kana: "${text}" (id: ${kana.id})`);
  return null;
}

/**
 * Play kana audio from local file
 */
export async function playKanaAudio(audioPath: string): Promise<void> {
  console.log(`[Kana Audio] Playing local audio file: ${audioPath}`);
  
  // Try to bypass service worker for local audio files
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Add a cache-buster to force bypassing service worker cache
    const bypassPath = `${audioPath}?bypass-sw=${Date.now()}`;
    return playKanaAudioDirect(bypassPath);
  }
  
  return playKanaAudioDirect(audioPath);
}

/**
 * Internal function to play audio
 */
function playKanaAudioDirect(audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    let hasPlayed = false;
    let loadTimeout: NodeJS.Timeout;
    
    // Set a timeout for loading
    const startLoadTimeout = () => {
      loadTimeout = setTimeout(() => {
        if (!hasPlayed) {
          console.error(`[Kana Audio] Timeout loading audio: ${audioPath}`);
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
          console.log(`[Kana Audio] Started playing: ${audioPath}`);
        })
        .catch((err) => {
          console.error(`[Kana Audio] Play failed:`, err);
          reject(err);
        });
    };
    
    // Add event listeners
    audio.addEventListener('loadstart', () => {
      console.log(`[Kana Audio] Started loading: ${audioPath}`);
      startLoadTimeout();
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log(`[Kana Audio] Audio data loaded: ${audioPath}`);
    });
    
    audio.addEventListener('canplay', () => {
      console.log(`[Kana Audio] Audio can play: ${audioPath}`);
    });
    
    audio.addEventListener('ended', () => {
      console.log(`[Kana Audio] Finished playing: ${audioPath}`);
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
        console[logLevel](`[Kana Audio] Error playing ${audioPath}:`);
        console[logLevel](`[Kana Audio] ${errorTypes[audioError.code] || `Unknown error code: ${audioError.code}`}`);
        console[logLevel](`[Kana Audio] Error message: ${audioError.message}`);
        
        // For network errors, this is expected due to service worker
        if (audioError.code === 2) {
          console.info(`[Kana Audio] This is expected - will retry with different method`);
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
 * Check if local kana audio exists for the given text
 */
export async function hasLocalKanaAudio(text: string): Promise<boolean> {
  const path = await getKanaAudioPath(text);
  return path !== null;
}

/**
 * Alternative play method using fetch API to bypass service worker
 */
export async function playKanaAudioViaFetch(audioPath: string): Promise<void> {
  console.info(`[Kana Audio] Using fetch method (bypassing service worker): ${audioPath}`);
  
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
    console.error(`[Kana Audio] Fetch method failed:`, error);
    throw error;
  }
}

/**
 * Play kana audio with retry mechanism
 */
export async function playKanaAudioWithRetry(audioPath: string, maxRetries: number = 2): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Kana Audio] Retry attempt ${attempt} for: ${audioPath}`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
      
      // First attempt with direct method
      if (attempt === 0) {
        await playKanaAudioDirect(audioPath);
      } else {
        // Subsequent attempts use fetch method to bypass service worker
        await playKanaAudioViaFetch(audioPath);
      }
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      if (attempt === 0) {
        console.info(`[Kana Audio] First attempt failed (expected with service worker):`, (error as Error).message);
      } else {
        console.warn(`[Kana Audio] Attempt ${attempt + 1} failed:`, error);
      }
    }
  }
  
  // All attempts failed
  throw lastError || new Error('Failed to play audio after retries');
}