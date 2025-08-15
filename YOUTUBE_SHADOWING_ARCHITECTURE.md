# YouTube Shadowing Feature - Complete Architecture

## Overview
The YouTube Shadowing feature is a comprehensive language learning tool that allows users to practice Japanese pronunciation and listening skills using YouTube videos, uploaded audio, or video files. It includes transcript extraction, caching, AI formatting, and community sharing features.

## Core Components

### 1. Main Component (`YouTubeShadowing.tsx`)
- **Location**: `/src/app/tools/youtube-shadowing/YouTubeShadowing.tsx`
- **Purpose**: Main orchestrator for the shadowing experience
- **Key Features**:
  - Session management (video URL, transcript, audio)
  - Access control integration (daily limits for free users)
  - Practice history tracking for authenticated users
  - URL parameter handling for deep linking
  - Blob URL cleanup for memory management

### 2. Input Components

#### YouTubeInput
- Accepts YouTube URLs
- Validates URL format
- Triggers transcript extraction

#### AudioUploader  
- Direct audio file upload (.mp3, .wav, etc.)
- File size validation (100MB limit)
- Creates blob URLs for playback

#### VideoUploader
- Video file upload (.mp4, .webm, .mov)
- Audio extraction using ffmpeg.wasm
- File size limit: 500MB
- Progress tracking during processing

### 3. Transcript Extraction System

#### API Route (`/api/youtube/extract/route.ts`)
**Extraction Methods (in order of priority):**

1. **Transcript Cache Check**
   - Firestore collection: `transcriptCache`
   - Content ID generation based on YouTube video ID
   - 90-day cache duration
   - Increments access count on cache hits

2. **YouTube Data API v3**
   - Gets video metadata (title, channel, duration, thumbnails)
   - Requires API key in environment variables
   - Used for enriching cached transcripts

3. **SupaData AI Integration** ⭐ (Primary method)
   - URL: `https://api.supadata.ai/v1/transcript`
   - Env var: `SUPA_YOUTUBE_API_KEY`
   - Specifically requests Japanese subtitles (`lang: 'ja'`)
   - Retry logic with exponential backoff
   - Rate limit handling (429 status)
   - Response format includes timing data in milliseconds

4. **YouTube-Transcript.io** (Fallback)
   - Alternative transcript extraction service
   - Free tier available with rate limits
   - Optional API key for higher limits

5. **youtube-captions-scraper** (Fallback)
   - Direct scraping from YouTube
   - Less reliable but free
   - No API key required

6. **ytdl-core** (Last resort)
   - Direct YouTube data extraction
   - Can be blocked by YouTube
   - Includes subtitle extraction attempts

### 4. AI Transcript Formatting

#### Purpose
Improves transcript quality by:
- Adding proper punctuation
- Fixing sentence boundaries
- Correcting auto-generated errors
- Maintaining timing alignment

#### Implementation
- Endpoint: `/api/ai/format-transcript`
- Only applied to Japanese transcripts
- Cached alongside original transcript
- User can toggle between original and formatted versions

### 5. Transcript Caching System (`transcriptCache.ts`)

#### Cache Structure
```typescript
{
  contentId: string,        // Unique ID (youtube_VIDEO_ID)
  contentType: 'youtube' | 'audio' | 'video',
  videoUrl: string,
  videoTitle: string,
  transcript: TranscriptLine[],
  formattedTranscript?: TranscriptLine[], // AI-formatted version
  language: string,
  duration: number,
  accessCount: number,       // Incremented on each access
  createdAt: Timestamp,
  lastAccessed: Timestamp,
  metadata: {
    youtubeVideoId: string,
    channelName: string,
    thumbnailUrl: string,
    method: string          // Which extraction method was used
  }
}
```

#### Key Features
- Automatic cache hit detection
- Access count tracking for popularity
- Only YouTube videos are cached (not user uploads)
- Cache expiry after 90 days
- Firestore indexes for efficient queries

### 6. Player Components

#### EnhancedShadowingPlayer
**Features:**
- YouTube iframe API integration
- Local video/audio playback
- Synchronized transcript highlighting
- Repeat practice mode (configurable repeats)
- Playback speed control
- Furigana support with caching
- Grammar explanations via AI
- Toggle between video and transcript view

**Repeat System:**
- Configurable repeat count (1-10)
- Pause between repeats (adjustable)
- Auto-advance to next line option
- Visual indicators for current repeat

#### Audio Processing
- Uses Web Audio API for precise timing
- Volume control
- Speed adjustment without pitch distortion

### 7. Popular Videos Feature (`/popular-videos`)

#### Purpose
Community discovery of popular content with cached transcripts

#### Implementation
- Aggregates from `userPracticeHistory` collection
- Counts unique users per video
- Shows trending (last 7 days) and all-time popular
- Direct links to practice with cached transcripts
- Thumbnail display from YouTube metadata

#### Benefits
- Saves API calls (one extraction serves many users)
- Community-driven content discovery
- Shows impact metrics (users saved from API calls)

### 8. Practice History Service

#### Storage Structure
```typescript
{
  id: string,               // userId_videoId
  videoUrl: string,
  videoTitle: string,
  videoId: string,
  thumbnailUrl: string,
  channelName: string,
  lastPracticed: Date,
  firstPracticed: Date,
  practiceCount: number,
  contentType: 'youtube' | 'audio' | 'video',
  duration: number,
  totalPracticeTime: number
}
```

#### Features
- Tracks all practice sessions
- Only for authenticated users
- Increments practice count on revisits
- Used for "My Videos" history tab
- Powers popular videos aggregation

## Data Flow

### New YouTube Video Flow
1. User enters YouTube URL
2. System generates content ID from video ID
3. Check transcript cache
4. If cache miss:
   - Get video metadata from YouTube API
   - Try SupaData AI for transcript
   - Fallback to other methods if needed
   - Format transcript with AI (if Japanese)
   - Save to cache (authenticated users only)
5. If cache hit:
   - Increment access count
   - Return cached transcript
6. Initialize player with transcript
7. Save to practice history (authenticated users)

### File Upload Flow
1. User uploads audio/video file
2. For video: Extract audio using ffmpeg.wasm
3. Create blob URLs for playback
4. Send to Whisper API for transcription
5. Format transcript if needed
6. Initialize player (no caching for uploads)

## Access Control Integration

### Three-Tier System
- **Guest**: 5 uses per day
- **Free**: 10 uses per day  
- **Premium**: Unlimited

### Feature Tracking
- Feature key: `youtube_shadowing`
- Tracks via `useAccess` hook
- Shows remaining uses in UI
- Upgrade prompts when limit reached

## Performance Optimizations

### Caching Strategy
- Content-based IDs ensure consistency
- 90-day cache duration balances freshness and efficiency
- Access count tracking identifies popular content
- Firestore indexes optimize queries

### Memory Management
- Blob URL cleanup on component unmount
- Proper cleanup of YouTube iframe
- Audio element disposal
- Timeout cleanup on unmount

### Loading States
- Progressive loading (metadata → transcript → player)
- Skeleton loaders during fetch
- Error boundaries for graceful failures

## Security Considerations

### API Key Management
- All API keys in environment variables
- Server-side only API calls
- Rate limit handling and backoff

### User Data
- Practice history only for authenticated users
- No PII in cached transcripts
- User-scoped practice history

### Input Validation
- YouTube URL validation
- File type and size validation
- Transcript format validation

## Future Enhancements

### Planned Features
1. Offline mode with cached transcripts
2. Collaborative transcript editing
3. Difficulty ratings
4. Curated playlists
5. Export practice history
6. Social sharing of practice sessions

### Performance Improvements
1. Implement transcript prefetching
2. Add WebWorker for audio processing
3. Optimize Firestore queries with pagination
4. Add CDN for popular video thumbnails

### AI Enhancements
1. Auto-difficulty assessment
2. Personalized video recommendations
3. Grammar pattern extraction
4. Vocabulary frequency analysis

## Dependencies

### External Services
- **SupaData AI**: Primary transcript extraction ($29/month for 10,000 credits)
- **YouTube Data API v3**: Video metadata
- **OpenAI Whisper**: Audio transcription for uploads
- **Firestore**: Transcript caching and practice history

### Key Libraries
- **@distube/ytdl-core**: YouTube data extraction
- **ffmpeg.wasm**: Client-side video processing
- **youtube-captions-scraper**: Fallback transcript extraction
- **framer-motion**: Animations
- **react-firebase-hooks**: Auth state management

## Monitoring & Analytics

### Tracked Metrics
- API usage per service (stored in `apiUsageLogs`)
- Cache hit rate
- Popular videos by access count
- User practice patterns
- Feature usage limits

### Error Tracking
- API failures logged with context
- Fallback method success rates
- User-facing error messages
- Console logging for debugging

## Conclusion

The YouTube Shadowing feature represents a sophisticated integration of multiple services and technologies to provide a seamless language learning experience. The caching system and community features significantly reduce API costs while improving user experience. The architecture is designed to be resilient with multiple fallback options and graceful degradation.