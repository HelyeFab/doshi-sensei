# YouTube Shadowing Feature Documentation

## Overview
The YouTube Shadowing feature enables Japanese learners to practice shadowing (listening and repeating) with YouTube videos, uploaded audio files, and video files. It includes transcript extraction, caching, and now user-editable transcripts for premium users.

## Core Components

### 1. YouTube Shadowing Page
- **Location**: `/src/app/tools/youtube-shadowing/`
- **Main Component**: `YouTubeShadowing.tsx`
- **Features**:
  - YouTube URL input with SupaData API integration
  - Audio file upload with Whisper transcription
  - Video file upload with ffmpeg.wasm extraction
  - Manual subtitle upload support

### 2. Transcript Extraction
- **API Route**: `/src/app/api/youtube/extract/route.ts`
- **Primary Service**: SupaData AI (https://supadata.ai)
- **Fallback Chain**: SupaData → ytdl-core → get_video_info
- **Key Achievement**: Solved the "biggest wall" - extracting Japanese transcripts from videos without Japanese captions

### 3. Transcript Caching System
- **Service**: `/src/utils/transcriptCache.ts`
- **Collection**: `transcriptCache` in Firestore
- **Benefits**:
  - One-time extraction cost per video
  - Community sharing of transcripts
  - Instant access for cached videos

### 4. Popular Videos Dashboard
- **Location**: `/src/app/popular-videos/`
- **Component**: `PopularVideos.tsx`
- **Features**:
  - Shows videos by unique user count (community engagement)
  - My History tab with delete functionality
  - Filters by content type (YouTube, Audio, Video)
  - Search functionality

### 5. Practice History Tracking
- **Service**: `/src/services/practiceHistory/PracticeHistoryService.ts`
- **Storage**: IndexedDB (all users) + Firebase sync (authenticated)
- **Collection**: `userPracticeHistory` in Firestore
- **Tracks**:
  - Video ID, title, URL
  - Practice count and timestamps
  - Duration and metadata

### 6. User-Editable Transcripts (NEW - January 2025)
- **Service**: `/src/services/userTranscripts/UserTranscriptService.ts`
- **Components**:
  - `EditableTranscriptSegment.tsx` - Click-to-edit UI
  - `EditableTranscriptDisplay.tsx` - Full editable transcript viewer
- **Collection**: `userTranscripts` in Firestore
- **Premium Feature**: Only premium users can edit and save transcript corrections

## Recent Updates (January 2025)

### User-Editable Transcripts
- **Problem**: AI-generated transcripts may contain errors that learners can't judge
- **Solution**: Premium users can now edit transcripts and save corrections
- **Implementation**:
  1. Click any transcript segment to edit inline
  2. Visual confidence indicators show transcript reliability
  3. Edits persist across sessions for the same user
  4. Original transcript preserved, edits stored separately

### Confidence Scoring System
- **Visual Indicators**:
  - Solid green: High confidence (90%+)
  - Dotted yellow: Medium confidence (70-90%)
  - Dotted red: Low confidence (<70%)
  - Dotted blue: User edited
- **Future Enhancement**: Will integrate with lyrics APIs for music videos

### Popular Videos Redesign
- **Changed From**: Tracking transcript cache hits
- **Changed To**: Tracking unique users per video
- **Rationale**: Better reflects actual community engagement
- **Result**: Videos popular with many users bubble up naturally

### My Videos Integration
- **Moved To**: Immersion section on homepage
- **Features**: View saved videos and practice history
- **Access**: Available to all authenticated users

## Technical Architecture

### Data Flow
1. User inputs YouTube URL
2. Check transcript cache
3. If miss: Extract via SupaData API
4. Save to transcript cache
5. Load user's edits if premium
6. Display with confidence indicators
7. Allow editing if premium user

### Storage Structure
```typescript
// Transcript Cache
{
  videoUrl: string,
  videoTitle: string,
  transcript: TranscriptLine[],
  metadata: {
    youtubeVideoId: string,
    channelName: string,
    thumbnailUrl: string,
    duration: number
  },
  createdAt: Timestamp,
  lastAccessed: Timestamp,
  accessCount: number
}

// User Transcripts (Premium)
{
  videoId: string,
  userId: string,
  originalTranscript: TranscriptSegment[],
  userEdits: {
    [segmentId]: {
      originalText: string,
      editedText: string,
      editedAt: Timestamp,
      confidence: number
    }
  },
  lastModified: Timestamp
}
```

## Firestore Security Rules
- `transcriptCache`: Public read, authenticated create/update
- `userPracticeHistory`: Users can only access their own data
- `userTranscripts`: Premium users only, own data access

## Environment Variables
- `SUPA_YOUTUBE_API_KEY`: SupaData API key for transcript extraction
- `OPENAI_API_KEY`: For Whisper transcription of uploaded audio

## Future Enhancements

### Lyrics API Integration (Planned)
- **Purpose**: Validate music video transcripts against official lyrics
- **APIs to Consider**:
  - Genius API
  - Musixmatch API
  - LyricFind API
- **Implementation**: Background validation with confidence score updates

### Community Features (Planned)
- Shared annotations at timestamps
- Vocabulary lists from videos
- Difficulty ratings
- Curated playlists

## Usage Limits
- **Guest**: 20 YouTube extractions/day
- **Free**: 50 YouTube extractions/day
- **Premium**: Unlimited + transcript editing

## Related Files
- `/src/app/tools/my-videos/` - User's video library
- `/src/app/api/translate/` - Translation API for subtitles
- `/src/app/api/openai/` - Whisper transcription service