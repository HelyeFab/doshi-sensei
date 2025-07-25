/**
 * Unified audio utilities for games with service worker bypass
 */

export interface GameAudioOptions {
  volume?: number;
  loop?: boolean;
  crossOrigin?: string;
}

/**
 * Create an audio element with service worker bypass
 */
export function createGameAudio(audioPath: string, options: GameAudioOptions = {}): HTMLAudioElement {
  const audio = new Audio();
  
  // Add cache-buster to bypass service worker issues
  audio.src = `${audioPath}?bypass-sw=${Date.now()}`;
  
  // Set cross-origin to anonymous to avoid CORS issues
  audio.crossOrigin = options.crossOrigin || 'anonymous';
  
  // Set volume
  audio.volume = options.volume ?? 1.0;
  
  // Set loop
  audio.loop = options.loop ?? false;
  
  // Preload audio
  audio.preload = 'auto';
  
  return audio;
}

/**
 * Play audio with automatic retry mechanism
 */
export async function playGameAudio(audio: HTMLAudioElement): Promise<void> {
  try {
    // Reset to beginning
    audio.currentTime = 0;
    
    // Try to play normally
    await audio.play();
    console.log(`[Game Audio] Successfully playing: ${audio.src.split('?')[0]}`);
  } catch (error: any) {
    // If failed, try fetch method
    if (error.name === 'NotAllowedError' || error.name === 'AbortError' || error.name === 'NotSupportedError') {
      console.warn(`[Game Audio] First attempt failed, trying fetch method for: ${audio.src.split('?')[0]}`);
      await playGameAudioViaFetch(audio.src.split('?')[0], audio);
    } else {
      throw error;
    }
  }
}

/**
 * Fallback method using fetch API
 */
async function playGameAudioViaFetch(audioPath: string, originalAudio: HTMLAudioElement): Promise<void> {
  try {
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
    
    // Store original settings
    const volume = originalAudio.volume;
    const loop = originalAudio.loop;
    
    // Update the audio element's source
    originalAudio.src = audioUrl;
    originalAudio.volume = volume;
    originalAudio.loop = loop;
    
    await originalAudio.play();
    console.log(`[Game Audio] Successfully playing via fetch: ${audioPath}`);
    
    // Clean up blob URL when done (if not looping)
    if (!loop) {
      originalAudio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      }, { once: true });
    }
  } catch (error) {
    console.error(`[Game Audio] Fetch method failed for ${audioPath}:`, error);
    throw error;
  }
}

/**
 * Preload audio to improve performance
 */
export async function preloadGameAudio(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleCanPlayThrough = () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      resolve();
    };
    
    const handleError = (error: Event) => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      reject(new Error(`Failed to preload audio: ${audio.src}`));
    };
    
    audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    
    // Trigger load
    audio.load();
  });
}

/**
 * Stop and reset audio
 */
export function stopGameAudio(audio: HTMLAudioElement): void {
  audio.pause();
  audio.currentTime = 0;
}

/**
 * Fade in audio gradually
 */
export async function fadeInGameAudio(audio: HTMLAudioElement, duration: number = 1000, targetVolume: number = 1.0): Promise<void> {
  audio.volume = 0;
  await playGameAudio(audio);
  
  const startTime = Date.now();
  const fadeInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    audio.volume = progress * targetVolume;
    
    if (progress >= 1) {
      clearInterval(fadeInterval);
    }
  }, 50);
}

/**
 * Fade out audio gradually
 */
export async function fadeOutGameAudio(audio: HTMLAudioElement, duration: number = 1000): Promise<void> {
  const startVolume = audio.volume;
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const fadeInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      audio.volume = startVolume * (1 - progress);
      
      if (progress >= 1) {
        clearInterval(fadeInterval);
        stopGameAudio(audio);
        audio.volume = startVolume; // Reset volume for next play
        resolve();
      }
    }, 50);
  });
}