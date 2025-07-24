import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

// Create a singleton instance of FFmpeg
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

// Load FFmpeg only once and cache the promise
export const loadFFmpeg = async (): Promise<FFmpeg> => {
  // If already loading, return the existing promise
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  // If already loaded, return the instance
  if (ffmpegInstance) return ffmpegInstance;

  // Create a new loading promise
  ffmpegLoadingPromise = (async () => {
    try {
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      console.log('FFmpeg loaded successfully');
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      ffmpegLoadingPromise = null; // Reset so we can try loading again
      throw error;
    }
  })();

  return ffmpegLoadingPromise;
};

export interface AudioProcessingProgress {
  stage: 'loading' | 'processing' | 'uploading' | 'transcribing' | string;
  progress: number;
  percent: number;
}

// Process audio from a video blob
export const processVideoAudio = async (
  videoBlob: Blob,
  onProgress?: (progress: AudioProcessingProgress) => void
): Promise<Blob> => {
  try {
    onProgress?.({ stage: 'loading', progress: 0, percent: 0 });
    const ff = await loadFFmpeg();
    
    onProgress?.({ stage: 'processing', progress: 0.1, percent: 10 });
    
    const inputFileName = 'input_video';
    const outputFileName = 'output_audio.mp3';

    // Write the video blob to FFmpeg's virtual filesystem
    await ff.writeFile(inputFileName, await fetchFile(videoBlob));

    // Set up progress tracking
    ff.on('progress', (event: any) => {
      if (onProgress && typeof event === 'object' && 'ratio' in event) {
        const percent = 10 + Math.round((event.ratio as number) * 80);
        onProgress({ 
          stage: 'Extracting audio...', 
          progress: 0.1 + (event.ratio as number) * 0.8,
          percent 
        });
      }
    });

    // Extract and compress audio for Whisper API (25MB limit)
    await ff.exec([
      '-i', inputFileName,
      '-vn', // No video
      '-acodec', 'libmp3lame',
      '-ac', '1', // Mono audio
      '-ab', '64k', // Reasonable bitrate for speech
      '-ar', '16000', // 16kHz sample rate (good for speech)
      '-f', 'mp3',
      outputFileName
    ]);

    const audioData = await ff.readFile(outputFileName);
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    
    onProgress?.({ stage: 'processing', progress: 1, percent: 100 });
    
    console.log('Audio extraction complete, size:', audioBlob.size, 'bytes');
    return audioBlob;
  } catch (error) {
    console.error('Audio processing error:', error);
    throw new Error('Failed to process audio from video');
  }
};

// Split audio into chunks for real-time transcription
export const createAudioChunks = async (
  audioBlob: Blob,
  chunkDurationSeconds: number = 30
): Promise<Blob[]> => {
  try {
    const ff = await loadFFmpeg();
    const inputFileName = 'full_audio.mp3';
    const chunks: Blob[] = [];
    
    // Write the full audio to FFmpeg
    await ff.writeFile(inputFileName, await fetchFile(audioBlob));
    
    // Get audio duration (this is a simplified approach)
    // In a real implementation, you'd parse the ffmpeg output to get duration
    const estimatedChunks = Math.ceil(audioBlob.size / (64000 * chunkDurationSeconds / 8));
    
    for (let i = 0; i < estimatedChunks; i++) {
      const outputFileName = `chunk_${i}.mp3`;
      const startTime = i * chunkDurationSeconds;
      
      await ff.exec([
        '-i', inputFileName,
        '-ss', String(startTime),
        '-t', String(chunkDurationSeconds),
        '-acodec', 'copy',
        outputFileName
      ]);
      
      try {
        const chunkData = await ff.readFile(outputFileName);
        chunks.push(new Blob([chunkData], { type: 'audio/mp3' }));
      } catch (error) {
        // No more chunks
        break;
      }
    }
    
    return chunks;
  } catch (error) {
    console.error('Audio chunking error:', error);
    throw new Error('Failed to create audio chunks');
  }
};