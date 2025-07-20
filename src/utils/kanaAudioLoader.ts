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
  
  // First try to fetch the audio to check if it's accessible
  try {
    const response = await fetch(audioPath, { 
      method: 'HEAD',
      cache: 'no-cache' // Bypass service worker cache
    });
    
    if (!response.ok) {
      console.error(`[Kana Audio] File not accessible: ${audioPath}, status: ${response.status}`);
      throw new Error(`Audio file returned ${response.status}`);
    }
    
    console.log(`[Kana Audio] File is accessible, creating audio element`);
  } catch (fetchError) {
    console.error(`[Kana Audio] Failed to fetch audio file:`, fetchError);
    throw fetchError;
  }
  
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    // Use a timestamp to bypass any caching issues
    const timestampedPath = `${audioPath}?t=${Date.now()}`;
    
    // Add loadeddata event to ensure audio is ready
    audio.addEventListener('loadeddata', () => {
      console.log(`[Kana Audio] Audio loaded and ready: ${audioPath}`);
    });
    
    audio.addEventListener('canplay', () => {
      console.log(`[Kana Audio] Audio can play: ${audioPath}`);
    });
    
    audio.addEventListener('ended', () => {
      console.log(`[Kana Audio] Finished playing: ${audioPath}`);
      resolve();
    });
    
    audio.addEventListener('error', (error) => {
      console.error(`[Kana Audio] Error playing ${audioPath}:`, error);
      // Log more detailed error info
      const audioError = audio.error;
      if (audioError) {
        console.error(`[Kana Audio] Error code: ${audioError.code}, message: ${audioError.message}`);
        console.error(`[Kana Audio] Error details:`, {
          code: audioError.code,
          message: audioError.message,
          MEDIA_ERR_ABORTED: audioError.code === 1,
          MEDIA_ERR_NETWORK: audioError.code === 2,
          MEDIA_ERR_DECODE: audioError.code === 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: audioError.code === 4
        });
      }
      reject(error);
    });
    
    // Set source after event listeners with timestamp
    audio.src = timestampedPath;
    
    // Load the audio
    audio.load();
    
    // Wait for audio to be ready before playing
    audio.addEventListener('canplaythrough', () => {
      audio.play()
        .then(() => console.log(`[Kana Audio] Started playing: ${audioPath}`))
        .catch((err) => {
          console.error(`[Kana Audio] Play failed:`, err);
          reject(err);
        });
    }, { once: true });
  });
}

/**
 * Check if local kana audio exists for the given text
 */
export async function hasLocalKanaAudio(text: string): Promise<boolean> {
  const path = await getKanaAudioPath(text);
  return path !== null;
}