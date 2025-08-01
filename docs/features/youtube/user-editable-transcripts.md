# User-Editable Transcripts Implementation Guide

## Overview
This document details the implementation of user-editable transcripts for the YouTube Shadowing feature, allowing premium users to correct AI-generated transcripts and save their edits persistently.

## Problem Statement
- AI-generated transcripts (from SupaData, YouTube, or Whisper) may contain errors
- Language learners often can't judge transcript accuracy themselves
- Errors in learning materials can reinforce incorrect understanding
- Need a way to improve transcript quality over time

## Solution Architecture

### 1. UserTranscriptService
**Location**: `/src/services/userTranscripts/UserTranscriptService.ts`

**Key Methods**:
```typescript
// Get user's edited transcript
getUserTranscript(videoId: string): Promise<UserTranscript | null>

// Save or update edits
saveUserTranscript(
  videoId: string,
  originalTranscript: TranscriptSegment[],
  userEdits: { [segmentId: string]: UserEdit },
  metadata?: UserTranscript['metadata']
): Promise<void>

// Update single segment
updateSegmentEdit(
  videoId: string,
  segmentId: string,
  originalText: string,
  editedText: string,
  confidence?: number
): Promise<void>

// Merge edits with original
mergeTranscriptWithEdits(
  originalTranscript: TranscriptSegment[],
  userEdits: { [segmentId: string]: UserEdit }
): TranscriptWithConfidence[]
```

### 2. UI Components

#### EditableTranscriptSegment
**Location**: `/src/components/transcript/EditableTranscriptSegment.tsx`

**Features**:
- Click-to-edit inline editing
- Keyboard shortcuts (Enter to save, Escape to cancel)
- Visual confidence indicators
- Premium-only access control
- Hover tooltips showing confidence percentage

#### EditableTranscriptDisplay
**Location**: `/src/app/tools/youtube-shadowing/components/EditableTranscriptDisplay.tsx`

**Features**:
- Full transcript viewer with segment-by-segment editing
- Save all / Reset functionality
- Confidence legend
- Active line highlighting during playback
- Premium upgrade prompt for free users

### 3. Data Models

```typescript
interface UserEdit {
  originalText: string;
  editedText: string;
  editedAt: Timestamp;
  confidence?: number; // 0-1
}

interface UserTranscript {
  videoId: string;
  userId: string;
  videoTitle?: string;
  videoUrl?: string;
  originalTranscript: TranscriptSegment[];
  userEdits: {
    [segmentId: string]: UserEdit;
  };
  lastModified: Timestamp;
  createdAt: Timestamp;
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    duration?: number;
    thumbnailUrl?: string;
    isMusic?: boolean;
    lyricsValidated?: boolean;
  };
}

interface TranscriptWithConfidence extends TranscriptSegment {
  confidence: number; // 0-1
  isUserEdited?: boolean;
  validationSource?: 'lyrics_api' | 'community' | 'ai' | 'original';
}
```

### 4. Firestore Structure

**Collection**: `userTranscripts`
**Document ID**: `{userId}_{videoId}`

**Security Rules**:
```javascript
// Premium users can read their own transcript edits
allow read: if request.auth != null && 
  (isAdmin() || 
   (resource != null && resource.data.userId == request.auth.uid && isPremiumUser(request.auth.uid)));

// Premium users can create/update/delete their own edits
allow create, update: if request.auth != null && 
  isPremiumUser(request.auth.uid) &&
  request.resource.data.userId == request.auth.uid;
```

## Implementation Flow

### Loading Transcripts
1. Original transcript loads from cache or API
2. Check if user has premium access
3. If premium, fetch user's edits from Firestore
4. Merge edits with original transcript
5. Display with confidence indicators

### Editing Process
1. User clicks on transcript segment
2. Inline textarea appears with current text
3. User makes changes
4. On save:
   - Update local state immediately
   - Save to Firestore in background
   - Update confidence to 1.0 (user verified)
   - Show visual feedback

### Confidence Scoring
Base confidence levels:
- SupaData transcript: 0.8
- YouTube auto-captions: 0.7
- Whisper transcription: 0.85
- User edited: 1.0

Future enhancements:
- +0.2 for lyrics API match
- +0.1 for community verification
- -0.2 for very short segments

## Visual Design

### Confidence Indicators
```css
/* High confidence (90%+) */
.confidence-high { /* No decoration */ }

/* Medium confidence (70-90%) */
.confidence-medium {
  border-bottom: 1px dotted #eab308; /* yellow */
}

/* Low confidence (<70%) */
.confidence-low {
  border-bottom: 2px dotted #ef4444; /* red */
}

/* User edited */
.user-edited {
  border-bottom: 2px dotted #3b82f6; /* blue */
}
```

### Edit Mode
- Smooth transition to textarea
- Auto-select text on focus
- Save/Cancel buttons appear
- Disabled state while saving

## Integration Points

### YouTube Shadowing Component
```typescript
// Replace TranscriptReader with EditableTranscriptDisplay
<EditableTranscriptDisplay
  transcript={session.transcript}
  videoId={extractVideoId(session.videoUrl)}
  videoTitle={session.videoTitle}
  videoUrl={session.videoUrl}
  metadata={{...}}
  currentLineIndex={session.currentLineIndex}
  showFurigana={showFurigana}
  onTranscriptUpdate={(updatedTranscript) => {
    updateSession({ ...session, transcript: updatedTranscript });
  }}
/>
```

### Premium Access Control
- Uses `useSubscription2` hook
- Edit functionality hidden for free users
- Upgrade prompt shown on hover/click

## Performance Considerations

### Optimizations
1. **Debounced Saves**: Batch multiple edits before saving
2. **Local First**: Update UI immediately, sync in background
3. **Lazy Loading**: Only load user transcripts when needed
4. **Caching**: Cache merged transcripts in memory

### Firestore Usage
- One document per user per video
- Efficient queries using compound ID
- Minimal data transfer (only edits, not full transcript)

## Future Enhancements

### Phase 1: Lyrics Validation
- Auto-detect music videos
- Query lyrics APIs (Genius, Musixmatch)
- Update confidence based on match
- Show "Lyrics Verified" badge

### Phase 2: Community Features
- Allow sharing edited transcripts
- Voting system for edits
- Aggregate confidence from multiple users
- "Community Verified" badge

### Phase 3: AI Enhancement
- GPT-4 validation for suspicious segments
- Grammar checking for Japanese text
- Context-aware corrections
- Suggested edits based on patterns

## Testing Checklist

- [ ] Free user sees transcripts but can't edit
- [ ] Premium user can click to edit any segment
- [ ] Edits save successfully to Firestore
- [ ] Edits persist across sessions
- [ ] Confidence indicators display correctly
- [ ] Reset function restores original
- [ ] Performance with long transcripts
- [ ] Offline behavior (queued saves)

## Migration Notes

### From TranscriptReader to EditableTranscriptDisplay
1. Import new component
2. Replace component usage
3. Add required props (videoId, metadata)
4. Handle onTranscriptUpdate callback
5. Test with existing transcripts

### Database Migration
- No migration needed (new collection)
- Backward compatible with existing system
- Original transcripts remain in cache