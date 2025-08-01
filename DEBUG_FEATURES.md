# Debug Guide for New Features

## Features Not Showing? Try These Steps:

### 1. Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear site data in DevTools > Application > Storage > Clear site data

### 2. Check Build Status
- Is the latest code deployed to Netlify?
- Check Netlify deploy logs for any errors

### 3. Feature Locations

#### Editable Transcripts (Premium Only)
1. Go to `/tools/youtube-shadowing`
2. Load any YouTube video (paste URL and click extract)
3. After transcript loads, look for:
   - Edit controls header (premium users)
   - Colored underlines on text (confidence indicators)
   - Click any text to edit (premium only)

#### Music Video Detection
1. In YouTube Shadowing, try these test videos:
   - Any video with "MV" or "Official Video" in title
   - Music category videos
2. Look for "Music Video Detected" banner above transcript

#### Visual Indicators in Transcript
- No underline = High confidence (90%+)
- Yellow dotted = Medium (70-90%)
- Red dotted = Low (<70%)
- Blue dotted = User edited

### 4. Check Console for Errors
Open browser DevTools (F12) and check:
- Console tab for any errors
- Network tab for failed requests

### 5. Required Setup
- For lyrics validation: Add `GENIUS_ACCESS_TOKEN` to `.env`
- For edits: Must be logged in as premium user

### 6. Component Hierarchy
```
YouTubeShadowing.tsx
  └── EditableTranscriptDisplay.tsx (when !showShadowingMode)
      └── EditableTranscriptSegment.tsx (for each line)
```

### 7. Quick Test
1. Go to: `/tools/youtube-shadowing`
2. Paste: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (or any video)
3. Click "Extract Transcript"
4. Look for confidence indicators and edit controls

### 8. Database Check
The features use these Firestore collections:
- `userTranscripts` - Stores user edits (premium only)
- `lyricsCache` - Stores lyrics lookups
- `userPracticeHistory` - Tracks video history

### 9. If Still Not Working
1. Check if you're on the latest build
2. Try incognito/private mode
3. Check if JavaScript is enabled
4. Verify you're logged in (for premium features)