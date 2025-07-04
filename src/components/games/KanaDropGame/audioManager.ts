export class GameAudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: { [key: string]: AudioBuffer } = {};
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async playSound(soundType: 'error' | 'thud' | 'start' | 'victory') {
    if (!this.enabled || !this.audioContext) return;

    try {
      // Resume audio context if it's suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      switch (soundType) {
        case 'error':
          // Error beep - higher pitch, short
          oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.1);
          break;
          
        case 'thud':
          // Soft thud - low frequency, very short
          oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
          oscillator.start(this.audioContext.currentTime);
          oscillator.stop(this.audioContext.currentTime + 0.05);
          break;
          
        case 'start':
          // Cheerful chime - ascending notes
          const startFreqs = [523.25, 659.25, 783.99]; // C5, E5, G5
          startFreqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.2, this.audioContext.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.1 + 0.3);
            
            osc.start(this.audioContext.currentTime + i * 0.1);
            osc.stop(this.audioContext.currentTime + i * 0.1 + 0.3);
          });
          break;
          
        case 'victory':
          // Victory fanfare - major chord arpeggio
          const victoryFreqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
          victoryFreqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.3, this.audioContext.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.15 + 0.5);
            
            osc.start(this.audioContext.currentTime + i * 0.15);
            osc.stop(this.audioContext.currentTime + i * 0.15 + 0.5);
          });
          break;
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  dispose() {
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