# YouTube Shadowing - Technical Implementation Details

## Architecture Overview

### Frontend Components

```
/src/app/tools/youtube-shadowing/
├── page.tsx                          # Main page orchestrator
├── components/
│   ├── YouTubeInput.tsx             # URL input component
│   ├── AudioExtractor.tsx           # Handles audio extraction attempts
│   ├── TranscriptDisplay.tsx        # Manages transcript loading
│   ├── YouTubePlayer.tsx            # Embedded YouTube player
│   ├── TranscriptReader.tsx         # Displays synced transcripts
│   ├── ShadowingPlayer.tsx          # Advanced practice mode
│   ├── AudioUploader.tsx            # Alternative audio input
│   ├── SubtitleUploader.tsx         # Manual subtitle upload
│   └── RealtimeTranscriber.tsx      # (Attempted) Real-time capture
```

### Backend Architecture

```
/home/mate/Dev/Render/yt-dl/         # Separate backend service
├── server.js                        # Express server
├── package.json                     # Dependencies
└── README.md                        # API documentation

Endpoints:
- GET  /                             # Health check
- POST /extract-audio                # YouTube audio extraction (blocked)
- POST /extract-youtube-subtitles    # Subtitle extraction (blocked)
- POST /transcribe-audio             # Whisper API integration ✓
```

## Key Technologies Used

### Frontend
- **Next.js 15.3.3** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@ffmpeg/ffmpeg** - Client-side audio processing
- **Framer Motion** - Animations

### Backend
- **Express.js** - API server
- **yt-dlp** - YouTube downloader (blocked by YouTube)
- **OpenAI Whisper API** - Audio transcription
- **ffmpeg** - Audio processing

## Implementation Details

### 1. YouTube URL Processing

```typescript
// YouTubeInput.tsx
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};
```

### 2. Audio Extraction Attempts

```typescript
// AudioExtractor.tsx - Skip extraction due to blocking
const SKIP_EXTRACTION = true; // Always skip for now

if (SKIP_EXTRACTION) {
  // Extract video info without downloading
  const videoIdMatch = videoUrl.match(/[?&]v=([^&]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';
  
  // Pass signal to use YouTube player instead
  onAudioExtracted('youtube-player', `YouTube Video ${videoId}`);
  return;
}
```

### 3. Whisper Transcription

```javascript
// server.js - Transcribe endpoint
app.post('/transcribe-audio', async (req, res) => {
  const { audioUrl, language = 'ja' } = req.body;
  
  // Download audio to temp file
  const response = await axios({
    method: 'GET',
    url: audioUrl,
    responseType: 'stream'
  });
  
  // Send to OpenAI Whisper
  const form = new FormData();
  form.append('file', fs.createReadStream(tempFilePath));
  form.append('model', 'whisper-1');
  form.append('language', language);
  form.append('response_format', 'verbose_json');
  
  const whisperResponse = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    form,
    {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        ...form.getHeaders()
      }
    }
  );
});
```

### 4. Subtitle Extraction Attempt

```javascript
// server.js - YouTube subtitle extraction
app.post('/extract-youtube-subtitles', async (req, res) => {
  // Get video info
  const infoCmd = `yt-dlp --dump-json --no-warnings "${url}"`;
  const videoInfo = JSON.parse(infoOutput);
  
  // Check for Japanese subtitles
  const subtitles = videoInfo.subtitles || {};
  const automaticCaptions = videoInfo.automatic_captions || {};
  
  if (subtitles.ja || automaticCaptions.ja) {
    // Download subtitles
    const subsCmd = `yt-dlp --write-subs --write-auto-subs --sub-lang ja --skip-download --sub-format json3 "${url}"`;
    // ... parse and return
  }
});
```

### 5. Client-Side Audio Processing

```typescript
// audioProcessor.ts - Using ffmpeg.wasm
export const processVideoAudio = async (
  videoBlob: Blob,
  onProgress?: (progress: AudioProcessingProgress) => void
): Promise<Blob> => {
  const ff = await loadFFmpeg();
  
  await ff.exec([
    '-i', inputFileName,
    '-vn', // No video
    '-acodec', 'libmp3lame',
    '-ac', '1', // Mono audio
    '-ab', '64k', // Reasonable bitrate for speech
    '-ar', '16000', // 16kHz sample rate
    '-f', 'mp3',
    outputFileName
  ]);
  
  return new Blob([audioData], { type: 'audio/mp3' });
};
```

### 6. Transcript Synchronization

```typescript
// TranscriptReader.tsx
export interface TranscriptLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words?: string[];
}

// Sync with video playback
const handleTimeUpdate = (currentTime: number) => {
  const activeIndex = transcript.findIndex(
    line => currentTime >= line.startTime && currentTime < line.endTime
  );
  setCurrentLineIndex(activeIndex);
};
```

## Error Handling

### YouTube Blocking
```javascript
// Parse common YouTube errors
if (stderrData.includes('Sign in to confirm') || stderrData.includes('bot')) {
  errorMsg = 'YouTube is blocking the server. This is a known issue with cloud hosting providers.';
} else if (stderrData.includes('429') || stderrData.includes('Too Many Requests')) {
  errorMsg = 'YouTube is rate limiting the server. Please try again later.';
}
```

### Fallback UI
```typescript
// SubtitleUploader.tsx - Manual upload fallback
const parseSRT = (content: string): TranscriptLine[] => {
  const blocks = content.trim().split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    // Parse timestamp: 00:00:00,000 --> 00:00:05,000
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);
    // ... create transcript entry
  }
};
```

## Security Considerations

1. **API Keys**
   - OpenAI API key stored in environment variables
   - Never exposed to frontend
   - Rate limiting implemented

2. **File Upload Limits**
   - 25MB max for audio files (Whisper API limit)
   - File type validation
   - Virus scanning recommended for production

3. **CORS Configuration**
   - Proper headers set for cross-origin requests
   - Whitelist specific domains in production

## Performance Optimizations

1. **FFmpeg Loading**
   - Singleton pattern to load once
   - Cached instance across components
   - Lazy loading from CDN

2. **Transcript Caching**
   - Store generated transcripts locally
   - Reuse for same video URLs
   - IndexedDB for persistence

3. **Audio Compression**
   - Mono channel (reduces size by 50%)
   - 16kHz sample rate (optimal for speech)
   - 64kbps bitrate (good quality/size ratio)

## Known Limitations

1. **YouTube Access**
   - Cloud servers blocked by YouTube
   - No direct browser access due to CORS
   - Requires user to provide audio separately

2. **Real-time Transcription**
   - Web Audio API limitations
   - No direct access to YouTube audio stream
   - Would require browser extension

3. **File Size Limits**
   - 25MB max for Whisper API
   - Client-side processing memory constraints
   - Network timeout considerations

## Future Technical Improvements

1. **Browser Extension Architecture**
   ```javascript
   // content-script.js
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     if (request.action === "captureAudio") {
       // Access media streams
       // Send to background script for processing
     }
   });
   ```

2. **WebRTC Audio Capture**
   ```typescript
   // Potential future implementation
   const stream = await navigator.mediaDevices.getDisplayMedia({
     audio: true,
     video: false
   });
   ```

3. **Progressive Transcription**
   - Stream audio in chunks
   - Display partial results
   - Update as more audio processes