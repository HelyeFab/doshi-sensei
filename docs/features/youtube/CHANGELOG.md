# YouTube Feature Changelog

## [2025-01-31] User-Editable Transcripts

### Added
- **UserTranscriptService**: Complete service for managing user transcript edits
- **EditableTranscriptSegment**: Click-to-edit UI component with inline editing
- **EditableTranscriptDisplay**: Full transcript viewer with editing capabilities
- **Confidence Scoring System**: Visual indicators for transcript reliability
  - Green: High confidence (90%+)
  - Yellow: Medium confidence (70-90%)
  - Red: Low confidence (<70%)
  - Blue: User edited
- **Firestore Rules**: Added `userTranscripts` collection with premium-only access
- **Premium Feature**: Only premium users can edit and save transcript corrections

### Changed
- Replaced `TranscriptReader` with `EditableTranscriptDisplay` in YouTube Shadowing
- Updated transcript display to show confidence indicators
- Added hover tooltips showing confidence percentages

### Technical
- Created `/src/services/userTranscripts/UserTranscriptService.ts`
- Created `/src/components/transcript/EditableTranscriptSegment.tsx`
- Created `/src/app/tools/youtube-shadowing/components/EditableTranscriptDisplay.tsx`
- Added `/src/types/transcript.ts` for shared types
- Updated Firestore rules to include userTranscripts collection

---

## [2025-01-31] Popular Videos Redesign & My Videos Relocation

### Changed
- **Popular Videos Logic**: Now tracks unique users instead of cache access count
  - Shows real community engagement
  - Videos popular with many users bubble up naturally
- **Removed Trending Tab**: Eliminated redundancy with Most Popular
- **My Videos Location**: Moved from Tools & Resources to Immersion section

### Fixed
- My History tab now properly loads with `isInitial=true`
- Delete button now shows for all videos in My History tab (removed unnecessary ownership check)
- Fixed Firebase permission errors for practice history

### Technical
- Updated `/src/app/popular-videos/PopularVideos.tsx` to aggregate from `userPracticeHistory`
- Modified `/src/app/Home.tsx` to show My Videos in Immersion section

---

## [2025-01-30] Practice History Fixes

### Fixed
- **Firebase Permission Errors**: Updated Firestore rules to allow reading non-existent documents
- **Duration Parsing**: Added ISO 8601 duration parser for YouTube videos
- **Thumbnail Storage**: Added thumbnail metadata to transcript cache saves
- **Authentication Flow**: Created auth helper to ensure Firebase Auth is ready

### Added
- Comprehensive debugging logs for practice history operations
- Duration parser for YouTube's PT5M30S format to seconds conversion

### Technical
- Updated `/firestore.rules` to fix userPracticeHistory permissions
- Created `/src/utils/auth-helper.ts` for Firebase Auth utilities
- Enhanced `/src/services/practiceHistory/PracticeHistoryService.ts` with validation

---

## [2025-01] SupaData Integration

### Added
- **SupaData AI Integration**: Primary method for transcript extraction
- **Environment Variable**: `SUPA_YOUTUBE_API_KEY`
- **Fallback Chain**: SupaData → ytdl-core → get_video_info → alternative endpoints

### Achievement
- Solved the "biggest wall" - extracting Japanese transcripts from videos without Japanese captions
- Request Japanese subtitles specifically with `lang: 'ja'` parameter

### Technical
- Updated `/src/app/api/youtube/extract/route.ts` with SupaData integration
- Response format includes duration and offset in milliseconds

---

## [2025-01] Initial YouTube Shadowing Feature

### Added
- **YouTube URL Input**: Extract transcripts from YouTube videos
- **Audio Upload**: Transcribe uploaded audio files with Whisper
- **Video Upload**: Extract audio with ffmpeg.wasm and transcribe
- **Transcript Caching**: Community-shared transcript cache in Firestore
- **Popular Videos Dashboard**: Discover what others are practicing
- **Practice History**: Track personal learning progress

### Features
- Synchronized highlighting during playback
- Furigana support for kanji
- Grammar explanations
- Shadowing practice mode
- Multiple input methods

### Technical
- Created `/src/app/tools/youtube-shadowing/` directory structure
- Implemented `/src/utils/transcriptCache.ts` for caching logic
- Added `transcriptCache` collection to Firestore
- Integrated with Three-Pillar Architecture for access control