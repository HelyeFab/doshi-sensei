# YouTube Audio Extraction & Shadowing Feature Plan

## Overview
A comprehensive feature that allows users to practice Japanese through YouTube content by extracting audio, generating transcripts, and practicing shadowing (listen & repeat) with line-by-line playback.

## Core Features

### 1. YouTube Link Input
- Clean input interface on a dedicated page
- URL validation for YouTube links
- Support for youtube.com and youtu.be formats
- Error handling for invalid/private videos

### 2. Audio Extraction Service Integration
- Frontend calls our Express.js server endpoint
- Server uses yt-dlp to extract audio
- Returns mp3 file to frontend
- Store audio temporarily in browser or Firebase Storage

### 3. Transcription System
- **Option A**: Use YouTube's auto-generated captions (if available)
  - Extract via yt-dlp subtitle functionality
  - Parse VTT/SRT format with timestamps
- **Option B**: Speech-to-text API integration
  - Google Cloud Speech-to-Text API
  - OpenAI Whisper API
  - Include timestamp data for each segment

### 4. Line-by-Line Shadowing Interface
- Split transcript into manageable segments (sentences/phrases)
- Synchronized audio playback per line
- Interactive controls:
  - Play/pause current line
  - Repeat current line
  - Speed adjustment (0.5x, 0.75x, 1x)
  - Jump to any line
  - Loop mode for difficult sections

### 5. Recording & Comparison
- Browser-based audio recording using MediaRecorder API
- Record user's attempt for each line
- Side-by-side playback (original vs user recording)
- Visual waveform comparison
- Optional: Basic pitch/timing analysis

### 6. Vocabulary Management
- Click any word in transcript to:
  - See dictionary definition (using existing JMdict integration)
  - Add to personal vocabulary list
  - See furigana/readings
- Highlight unknown words based on user's level
- Batch add multiple words from session

## Technical Architecture

### Frontend Components Structure
```
/src/app/tools/youtube-shadowing/
├── page.tsx                        # Main page with URL input
├── layout.tsx                      # Page layout
└── components/
    ├── YouTubeInput.tsx           # URL input & validation
    ├── AudioExtractor.tsx         # Handles server communication
    ├── TranscriptDisplay.tsx      # Shows full transcript
    ├── ShadowingPlayer.tsx        # Line-by-line player
    ├── RecordingControls.tsx      # User recording interface
    ├── VocabularyHighlighter.tsx  # Word selection & lookup
    └── ProgressTracker.tsx        # Session progress & stats
```

### Data Flow
1. User pastes YouTube URL → Validate
2. Send to extraction server → Receive audio file
3. Extract/generate transcript with timestamps
4. Parse transcript into segments
5. Enable shadowing interface
6. Track progress & vocabulary

### State Management
```typescript
interface ShadowingSession {
  videoUrl: string;
  videoTitle: string;
  audioUrl: string;
  transcript: TranscriptLine[];
  currentLineIndex: number;
  recordings: UserRecording[];
  addedVocabulary: VocabularyItem[];
  sessionStats: SessionStats;
}

interface TranscriptLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words: Word[];
}

interface UserRecording {
  lineId: string;
  audioBlob: Blob;
  timestamp: Date;
}
```

## UI/UX Design

### Page Layout
1. **Input Screen**
   - Large, centered URL input
   - Recent sessions list
   - Example videos for beginners

2. **Shadowing Screen**
   - Top: Video info & controls
   - Center: Current line (large text)
   - Bottom: Full transcript (scrollable)
   - Floating: Recording controls

### Mobile Optimization
- Touch-friendly controls
- Swipe gestures for navigation
- Responsive text sizing
- Offline audio caching

### Visual Design
- Clean, focused interface
- High contrast for readability
- Visual progress indicators
- Smooth transitions between lines

## Integration Points

### 1. Features Registry
- Add `youtube_shadowing` feature
- Set limits (e.g., 5 videos/day for free users)
- Track usage metrics

### 2. Access Control
- Check user permissions
- Handle upgrade prompts
- Track monthly usage

### 3. Vocabulary System
- Connect to existing vocabulary lists
- Use current dictionary lookup
- Sync with spaced repetition

### 4. Progress Tracking
- Save session history
- Track completion rates
- Build mastery metrics
- Generate practice stats

## Implementation Phases

### Phase 1: Basic Infrastructure (Week 1)
- [ ] Create page structure
- [ ] Build YouTube input component
- [ ] Set up server communication
- [ ] Implement basic audio player

### Phase 2: Transcript Integration (Week 2)
- [ ] YouTube caption extraction
- [ ] Transcript parsing & display
- [ ] Line synchronization
- [ ] Basic navigation controls

### Phase 3: Shadowing Features (Week 3)
- [ ] Line-by-line playback
- [ ] Recording functionality
- [ ] Playback comparison
- [ ] Speed controls

### Phase 4: Vocabulary Integration (Week 4)
- [ ] Word selection UI
- [ ] Dictionary lookup integration
- [ ] Vocabulary list management
- [ ] Progress tracking

### Phase 5: Polish & Optimization
- [ ] Performance optimization
- [ ] Offline support
- [ ] Advanced features (pitch analysis)
- [ ] User testing & refinement

## Technical Considerations

### Performance
- Stream audio instead of full download
- Lazy load transcript sections
- Optimize recording storage
- Cache frequently used videos

### Security
- Validate all YouTube URLs
- Sanitize transcript content
- Secure audio storage
- Rate limiting on server

### Accessibility
- Keyboard navigation
- Screen reader support
- Adjustable font sizes
- High contrast mode

### Error Handling
- Network failures
- Invalid videos
- Missing transcripts
- Recording permissions

## Future Enhancements

### Advanced Features
- Multi-language support
- Collaborative shadowing
- AI pronunciation feedback
- Custom transcript editing
- Video clip extraction

### Gamification
- Shadowing challenges
- Accuracy scoring
- Leaderboards
- Achievement badges
- Streak tracking

### Content Library
- Curated video collections
- Difficulty ratings
- Topic categorization
- User recommendations
- Community submissions

## Success Metrics

### User Engagement
- Daily active users
- Average session length
- Lines practiced per session
- Vocabulary words added

### Learning Outcomes
- Shadowing accuracy improvements
- Vocabulary retention rates
- User progression tracking
- Listening comprehension gains

### Technical Performance
- Audio extraction success rate
- Transcript accuracy
- Page load times
- Error rates

## Development Notes

### API Keys Required
- YouTube Data API (optional, for metadata)
- Speech-to-text API (if not using YouTube captions)
- Firebase Storage (for audio caching)

### Third-party Libraries
- `react-player` for audio playback
- `wavesurfer.js` for waveform visualization
- `react-speech-kit` for recording
- `subtitle.js` for caption parsing

### Testing Strategy
- Unit tests for transcript parsing
- Integration tests for server communication
- E2E tests for full workflow
- Performance testing with large videos