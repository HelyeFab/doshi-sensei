# YouTube Shadowing Feature - Implementation Journey

## Goal: Create a Miraa-like Experience

### What is Miraa?

[Miraa](https://miraa.app/) is a popular language learning app that revolutionized how people practice Japanese (and other languages) through YouTube content. Its key features include:

1. **Seamless YouTube Integration**
   - Users simply paste a YouTube URL
   - The app extracts audio and generates transcripts automatically
   - No manual downloading or file handling required

2. **Real-time Bilingual Subtitles**
   - AI-powered transcription for videos without subtitles
   - Bilingual display (Japanese + translation)
   - Perfect synchronization with video playback

3. **Echo/Shadowing Method**
   - **Listen** → **Understand** → **Imitate** → **Compare**
   - Users practice pronunciation by repeating after the speaker
   - Built-in recording and comparison features

4. **AI-Powered Learning**
   - Grammar explanations for complex phrases
   - Word definitions and pronunciations
   - Context-aware translations

## Our Implementation Journey

### Phase 1: Server-Side Audio Extraction ❌

**What we tried:**
- Created a backend server (`/home/mate/Dev/Render/yt-dl`) with yt-dlp
- Deployed to Render cloud hosting
- Endpoint: `POST /extract-audio` to download YouTube audio

**Result:**
- YouTube blocks cloud server IPs
- Error: "YouTube is blocking the server. This is a known issue with cloud hosting providers."

**Code:**
```javascript
// server.js - Extract audio endpoint
app.post('/extract-audio', async (req, res) => {
  const { url } = req.body;
  // ... yt-dlp configuration
  const ytDlp = spawn('yt-dlp', ytDlpArgs);
  // Failed with: "Sign in to confirm" / bot detection
});
```

### Phase 2: YouTube Subtitle Extraction 🟡

**What we tried:**
- Added endpoint: `POST /extract-youtube-subtitles`
- Used yt-dlp to fetch existing captions
- Focused on Japanese subtitles only

**Result:**
- Also blocked by YouTube when running on cloud servers
- Would work locally but not on Render/Vercel/etc.

**Code:**
```javascript
// Extract subtitles using yt-dlp
const infoCmd = `yt-dlp --dump-json --no-warnings "${url}"`;
const subsCmd = `yt-dlp --write-subs --write-auto-subs --sub-lang ${selectedLang} --skip-download --sub-format json3 --no-warnings -o "${outputPath}" "${url}"`;
```

### Phase 3: Client-Side Approach with ffmpeg.wasm 🟡

**What we tried:**
- Integrated ffmpeg.wasm for browser-based audio processing
- Created audio processor utilities
- Attempted real-time audio capture

**Inspiration from giimaku project:**
```typescript
// audioExtractor.ts from giimaku
export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ff = await loadFFmpeg();
  await ff.exec([
    '-i', inputFileName,
    '-vn', // No video
    '-acodec', 'libmp3lame',
    '-ac', '1', // Mono audio
    '-ab', '32k', // Lower bitrate
    '-ar', '16000', // Lower sample rate
    outputFileName
  ]);
};
```

**Challenges:**
- Can't directly access YouTube's audio stream from browser
- CORS restrictions prevent fetching video data
- Would need browser extension or desktop app

### Phase 4: Whisper API Integration ✅

**What we implemented:**
- Backend endpoint: `POST /transcribe-audio`
- Accepts audio URLs or files
- Returns timestamped Japanese transcripts

**Success:**
- Works perfectly with uploaded audio files
- High-quality transcriptions
- Proper timestamp synchronization

**Code:**
```javascript
// Whisper API integration
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
```

### Phase 5: Current Working Solution ✅

**What works now:**

1. **YouTube Player Integration**
   - Embedded YouTube player for video playback
   - No download needed for video display

2. **Multiple Transcript Sources**
   - Automatic subtitle extraction (when not blocked)
   - Manual subtitle upload (SRT/VTT files)
   - Audio file upload → Whisper transcription

3. **Shadowing Features**
   - Synchronized transcript display
   - Furigana support
   - Grammar highlighting
   - Word lookup

## Technical Limitations Discovered

### Why YouTube Blocks Automated Access

1. **IP-Based Detection**
   - Cloud providers (AWS, Google Cloud, Render) have known IP ranges
   - YouTube detects and blocks these IPs
   - Returns "Sign in to confirm" or bot detection errors

2. **Legal and Terms of Service**
   - YouTube's ToS prohibits automated downloading
   - They actively work to prevent it

3. **Technical Barriers**
   - CORS prevents direct browser access to video streams
   - YouTube uses various techniques (cipher signatures, throttling) to prevent downloads

### How Apps Like Miraa Likely Work

Based on our research, apps like Miraa probably use one or more of these approaches:

1. **Browser Extensions**
   - Can access page content and media streams
   - Bypass CORS restrictions
   - Example: Chrome extensions with `webRequest` API

2. **Desktop Applications**
   - Can capture system audio
   - Use local yt-dlp installation
   - No cloud server blocking issues

3. **Mobile Apps**
   - Android: Can use NewPipe-style extraction
   - iOS: More restricted, might use web views

4. **Proxy Services**
   - Residential proxy networks
   - Constantly rotating IPs
   - Higher costs but more reliable

## Recommended User Workflow

Given the technical limitations, here's the best workflow for users:

### Option 1: For Videos with Subtitles
1. Paste YouTube URL
2. App attempts to extract subtitles
3. If successful, start shadowing immediately

### Option 2: For Videos without Subtitles
1. Download audio using:
   - Browser extension (recommended)
   - yt-dlp on desktop
   - Online converter tools
2. Upload audio to our app
3. Get AI-generated transcript
4. Practice with synchronized playback

### Option 3: Manual Subtitle Upload
1. Get subtitles from YouTube's transcript feature
2. Copy and paste into our app
3. Start practicing immediately

## Future Improvements

1. **Browser Extension**
   - Build a companion extension for seamless audio extraction
   - Direct integration with the web app
   - No server blocking issues

2. **Desktop App**
   - Electron app with built-in yt-dlp
   - System audio capture
   - Local processing with ffmpeg

3. **Real-time Transcription**
   - WebRTC audio capture
   - Streaming transcription
   - Lower latency

## Conclusion

While we couldn't replicate Miraa's seamless experience due to YouTube's blocking of cloud servers, we created a robust alternative that:
- Works reliably with uploaded content
- Provides high-quality AI transcriptions
- Offers all the shadowing practice features
- Gives users more control over their content

The key lesson: **Client-side processing is powerful, but accessing YouTube's content requires special approaches that web apps alone cannot provide.**