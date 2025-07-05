export class GameAudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: { [key: string]: HTMLAudioElement } = {};
  private backgroundMusic: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private currentCountdownSound: HTMLAudioElement | null = null; // Track countdown sound

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.loadSounds();
    }
  }

  private loadSounds() {
    // Only use available sound files
    this.sounds = {
      countdown: new Audio('/sounds/game-countdown-62-199828.mp3'),
      gameOver: new Audio('/sounds/game-over-38511.mp3'),
      victory: new Audio('/sounds/game-over-38511.mp3'), // Reuse game over for victory for now
      error: new Audio('/sounds/game-over-38511.mp3'), // Reuse game over for errors for now
      thud: new Audio('/sounds/game-over-38511.mp3') // Reuse game over for thuds for now
      // No start sound available
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
      this.stopBackgroundMusic();
      this.stopCountdownSound();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Stop the countdown sound specifically
  stopCountdownSound() {
    if (this.currentCountdownSound) {
      this.currentCountdownSound.pause();
      this.currentCountdownSound.currentTime = 0;
      this.currentCountdownSound = null;
    }
  }

  // Stop a specific sound type
  stopSound(soundType: 'error' | 'thud' | 'victory' | 'gameOver' | 'countdown' | 'start') {
    if (!this.sounds[soundType]) return;

    const sound = this.sounds[soundType];
    sound.pause();
    sound.currentTime = 0;

    // Clear countdown tracking if stopping countdown
    if (soundType === 'countdown') {
      this.currentCountdownSound = null;
    }
  }

  async playSound(soundType: 'error' | 'thud' | 'victory' | 'gameOver' | 'countdown' | 'start') {
    if (!this.enabled) return;
    // Fallback: use countdown for start if start is requested
    let type = soundType;
    if (soundType === 'start') {
      type = 'countdown';
    }
    if (!this.sounds[type]) return;
    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const sound = this.sounds[type];
      sound.currentTime = 0;
      await sound.play();

      // Track countdown sound for stopping later
      if (type === 'countdown') {
        this.currentCountdownSound = sound;
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  async playBackgroundMusic() {
    if (!this.enabled || !this.backgroundMusic) return;

    // Stop countdown sound before starting background music
    this.stopCountdownSound();

    try {
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
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  dispose() {
    this.stopBackgroundMusic();
    this.stopCountdownSound();
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
