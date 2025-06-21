// Type declarations for @lixen/edge-tts
declare module '@lixen/edge-tts' {
  export class EdgeTTS {
    constructor();
    getVoices(): Promise<Voice[]>;
    synthesize(text: string, voiceName: string): Promise<ArrayBuffer>;
  }

  export interface Voice {
    Name: string;
    Locale: string;
    Gender: string;
    [key: string]: any;
  }
}
