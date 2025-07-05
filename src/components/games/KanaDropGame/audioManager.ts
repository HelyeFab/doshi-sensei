export class GameAudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private backgroundMusic: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private currentCountdownSound: HTMLAudioElement | null = null; // Track countdown sound
  private currentlyPlayingSounds: Set<HTMLAudioElement> = new Set(); // Track all playing sounds

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.loadSounds();
    }
  }

  private loadSounds() {
    // Create separate instances for countdown and start sounds
    this.sounds = {
      countdown: new Audio('/sounds/game-countdown-62-199828.mp3'),
      start: new Audio('/sounds/game-countdown-62-199828.mp3'), // Separate instance for start
      gameOver: new Audio('/sounds/game-over-38511.mp3'),
      victory: new Audio('/sounds/game-over-38511.mp3'), // Reuse game over for victory for now
      error: new Audio('/sounds/game-over-38511.mp3'), // Reuse game over for errors for now
      thud: new Audio('/sounds/game-over-38511.mp3') // Reuse game over for thuds for now
    };

    // Load background music
    this.backgroundMusic = new Audio('/sounds/game-music-loop-7-145285.mp3');
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.3; // Lower volume for background music

    // Set volume for all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.volume = 0.5;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAllSounds();
      this.stopBackgroundMusic();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Stop all currently playing sounds
  stopAllSounds() {
    console.log('[KanaDrop Audio] Stopping all sounds');
    this.currentlyPlayingSounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.currentlyPlayingSounds.clear();
    this.currentCountdownSound = null;
  }

  // Stop the countdown sound specifically
  stopCountdownSound() {
    if (this.currentCountdownSound) {
      console.log('[KanaDrop Audio] Stopping countdown sound');
      this.currentCountdownSound.pause();
      this.currentCountdownSound.currentTime = 0;
      this.currentlyPlayingSounds.delete(this.currentCountdownSound);
      this.currentCountdownSound = null;
    }
  }

  // Stop a specific sound type
  stopSound(soundType: 'error' | 'thud' | 'victory' | 'gameOver' | 'countdown' | 'start') {
    if (!this.sounds[soundType]) return;

    console.log(`[KanaDrop Audio] Stopping ${soundType} sound`);
    const sound = this.sounds[soundType];
    sound.pause();
    sound.currentTime = 0;
    this.currentlyPlayingSounds.delete(sound);

    // Clear countdown tracking if stopping countdown
    if (soundType === 'countdown') {
      this.currentCountdownSound = null;
    }
  }

  async playSound(soundType: 'error' | 'thud' | 'victory' | 'gameOver' | 'countdown' | 'start') {
    if (!this.enabled) return;
    if (!this.sounds[soundType]) return;

    try {
      console.log(`[KanaDrop Audio] Playing ${soundType} sound`);
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const sound = this.sounds[soundType];
      sound.currentTime = 0;
      await sound.play();

      // Track this sound
      this.currentlyPlayingSounds.add(sound);

      // Track countdown sound specifically for stopping later
      if (soundType === 'countdown') {
        this.currentCountdownSound = sound;
      }

      // Auto-remove from tracking when sound ends
      sound.addEventListener('ended', () => {
        this.currentlyPlayingSounds.delete(sound);
        if (soundType === 'countdown') {
          this.currentCountdownSound = null;
        }
      }, { once: true });

    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  async playBackgroundMusic() {
    if (!this.enabled || !this.backgroundMusic) return;

    // Stop ALL sounds before starting background music
    this.stopAllSounds();

    try {
      console.log('[KanaDrop Audio] Starting background music');
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      // Fire-and-forget: do not await play()
      this.backgroundMusic.play().catch((error) => {
        console.error('Error playing background music:', error);
      });
    } catch (error) {
      console.error('Error playing background music:', error);
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      console.log('[KanaDrop Audio] Stopping background music');
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  dispose() {
    this.stopAllSounds();
    this.stopBackgroundMusic();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Singleton instance
let audioManagerInstance: GameAudioManager | null = null;

export function getGameAudioManager(): GameAudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new GameAudioManager();
  }
  return audioManagerInstance;
}
