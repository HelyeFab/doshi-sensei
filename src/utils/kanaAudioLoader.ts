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

    return null;
  }

  // Find the kana in our data
  const kana = kanaData.find(k => k.hiragana === text || k.katakana === text);
  if (!kana) {

    return null;
  }

  // Return the appropriate audio path
  if (kana.hiragana === text && audioIndex.hiragana[kana.id]) {

    return audioIndex.hiragana[kana.id];
  } else if (kana.katakana === text && audioIndex.katakana[kana.id]) {

    return audioIndex.katakana[kana.id];
  }

  console.log(`[Kana Audio] No local audio found for kana: "${text}" (id: ${kana.id})`);
  return null;
}

/**
 * Play kana audio from local file
 */
export async function playKanaAudio(audioPath: string): Promise<void> {

  // Try direct method first for local files
  try {
    await playKanaAudioDirect(audioPath);
    return;
  } catch (directError) {

  }
  
  // Fallback to fetch method if direct fails
  return playKanaAudioViaFetch(audioPath);
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

        })
        .catch((err) => {
          console.error(`[Kana Audio] Play failed:`, err);
          reject(err);
        });
    };
    
    // Add event listeners
    audio.addEventListener('loadstart', () => {

      startLoadTimeout();
    });
    
    audio.addEventListener('loadeddata', () => {

    });
    
    audio.addEventListener('canplay', () => {

    });
    
    audio.addEventListener('ended', () => {

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
    
    // Don't set crossOrigin for local files - it can cause CORS issues
    // audio.crossOrigin = 'anonymous';
    
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

  try {
    // Fetch the audio file
    const response = await fetch(audioPath, {
      method: 'GET',
      cache: 'default', // Use default caching
      mode: 'same-origin',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Check if blob is valid and has content
    if (!blob || blob.size === 0) {
      throw new Error('Audio file is empty or invalid');
    }
    
    const audioUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => {
        audio.play()
          .then(() => {

          })
          .catch(reject);
      }, { once: true });
      
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);

        resolve();
      });
      
      audio.addEventListener('error', (error) => {
        URL.revokeObjectURL(audioUrl);
        const audioError = audio.error;
        console.error(`[Kana Audio] Playback error:`, audioError);
        reject(new Error(audioError?.message || 'Unknown audio error'));
      });
      
      // Set source after event listeners
      audio.src = audioUrl;
      audio.load();
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
  
  // Try direct play without blob conversion
  try {

    const audio = new Audio(audioPath);
    audio.preload = 'auto';
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio playback timeout'));
      }, 3000);
      
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout);
        audio.play()
          .then(() => resolve())
          .catch(reject);
      }, { once: true });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(audio.error || new Error('Audio load failed'));
      }, { once: true });
      
      audio.load();
    });
  } catch (error) {
    lastError = error as Error;

  }
  
  // If direct play fails, try with fetch method
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      await playKanaAudioViaFetch(audioPath);
      return;
    } catch (error) {
      lastError = error as Error;

    }
  }
  
  throw lastError || new Error('Failed to play audio after retries');
}