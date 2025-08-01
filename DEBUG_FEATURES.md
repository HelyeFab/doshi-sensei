# Debug Guide for New Features

## Features Not Showing? Try These Steps:

### 1. Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear site data in DevTools > Application > Storage > Clear site data

### 2. Check Build Status
- Is the latest code deployed to Netlify?
- Check Netlify deploy logs for any errors

### 3. Feature Locations

#### YouTube Shadowing
1. Go to `/tools/youtube-shadowing`
2. Load any YouTube video (paste URL and click extract)
3. After transcript loads, you can:
   - Use shadowing mode for practice
   - View transcripts with furigana
   - Save sentences to your lists

#### Music Video Detection
1. In YouTube Shadowing, try these test videos:
   - Any video with "MV" or "Official Video" in title
   - Music category videos
2. Look for "Music Video Detected" banner above transcript

#### Visual Indicators in Transcript
- Highlighted line = Currently active
- Furigana = Reading assistance
- Click lines to jump to that section

### 4. Check Console for Errors
Open browser DevTools (F12) and check:
- Console tab for any errors
- Network tab for failed requests

### 5. Required Setup
- For YouTube transcripts: Add `SUPA_YOUTUBE_API_KEY` to `.env`
- For practice history: Must be logged in

### 6. Component Hierarchy
```
YouTubeShadowing.tsx
  └── TranscriptReader.tsx (when !showShadowingMode)
  └── EnhancedShadowingPlayer.tsx (when showShadowingMode)
```

### 7. Quick Test
1. Go to: `/tools/youtube-shadowing`
2. Paste: `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (or any video)
3. Click "Extract Transcript"
4. Use the shadowing mode or transcript reader

### 8. Database Check
The features use these Firestore collections:
- `transcriptCache` - Stores cached transcripts
- `userPracticeHistory` - Tracks video history
- `practiceHistory` - New unified practice tracking

### 9. If Still Not Working
1. Check if you're on the latest build
2. Try incognito/private mode
3. Check if JavaScript is enabled
4. Verify you're logged in (for practice history)