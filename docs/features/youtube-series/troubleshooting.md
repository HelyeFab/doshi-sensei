# YouTube Series - Troubleshooting & FAQ

## Common Issues and Solutions

### Admin Interface Issues

#### Issue: "Could not extract channel ID from URL"

**Symptoms:**
- Error message when adding a channel
- Channel URL not recognized

**Causes:**
- Invalid URL format
- Private or deleted channel
- Typo in URL

**Solutions:**
1. Use a video URL instead:
   ```
   https://youtube.com/watch?v=VIDEO_ID
   ```
2. Verify the channel exists by visiting it on YouTube
3. Try different URL formats:
   - `https://youtube.com/@channelhandle`
   - `https://youtube.com/channel/CHANNEL_ID`
   - `https://youtube.com/c/customname`

**Prevention:**
- Always copy URLs directly from YouTube
- Test the URL in a browser first

---

#### Issue: "YouTube API quota exceeded"

**Symptoms:**
- Sync operations fail with 403 error
- Message: "API quota exceeded"

**Causes:**
- Daily API limit reached (10,000 units)
- Too many sync operations in short time

**Solutions:**
1. **Immediate**: Wait 24 hours for quota reset (resets at midnight Pacific Time)
2. **Long-term**: 
   - Request quota increase from Google Cloud Console
   - Optimize sync frequency
   - Use caching more effectively

**Prevention:**
```javascript
// Implement rate limiting
const SYNC_DELAY = 5000; // 5 seconds between syncs
const MAX_SYNCS_PER_HOUR = 10;

// Track sync attempts
const syncAttempts = new Map();

function canSync(channelId) {
  const attempts = syncAttempts.get(channelId) || [];
  const recentAttempts = attempts.filter(
    time => Date.now() - time < 3600000
  );
  return recentAttempts.length < MAX_SYNCS_PER_HOUR;
}
```

---

#### Issue: Videos not appearing after sync

**Symptoms:**
- Sync reports success but no videos show
- Channel appears empty

**Causes:**
- All videos are private/unlisted
- Channel has no recent videos
- Database write permissions issue

**Solutions:**
1. Check YouTube directly for public videos
2. Verify Firestore write succeeded:
   ```bash
   # Check Firestore logs
   firebase functions:log
   ```
3. Manually check database:
   ```javascript
   // In browser console
   const videos = await getDocs(
     query(
       collection(db, 'youtubeVideoResources'),
       where('channelId', '==', 'CHANNEL_ID')
     )
   );
   console.log(videos.docs.length);
   ```

**Debug Query:**
```sql
-- Check if videos were written
SELECT * FROM youtubeVideoResources 
WHERE channelId = 'CHANNEL_ID'
ORDER BY importedAt DESC;
```

---

### User Interface Issues

#### Issue: "Failed to load YouTube series"

**Symptoms:**
- Error message on user page
- Channels not displaying

**Causes:**
- Network connectivity issue
- Firestore query failure
- No channels configured

**Solutions:**
1. Check network connection
2. Verify at least one channel exists with `monitoringEnabled: true`
3. Check browser console for errors
4. Clear browser cache and reload

**Debug Steps:**
```javascript
// Check in browser console
const channels = await getDocs(
  query(
    collection(db, 'youtubeChannels'),
    where('monitoringEnabled', '==', true)
  )
);
console.log('Active channels:', channels.docs.length);
```

---

#### Issue: Shadowing button disabled

**Symptoms:**
- "Practice Shadowing" button grayed out
- Can't access shadowing feature

**Causes:**
- No transcript available
- Shadowing disabled for channel
- User lacks permissions

**Solutions:**
1. Check if video has transcript:
   - Look for ✓ Transcript indicator
2. Verify channel settings:
   - Admin page → Channel → `shadowingEnabled: true`
3. Check user permissions:
   - Free users have daily limits
   - Premium required for some content

---

### API Issues

#### Issue: "Invalid YouTube URL"

**Symptoms:**
- API returns 400 error
- URL validation fails

**Causes:**
- Malformed URL
- Unsupported URL format
- Special characters in URL

**Solutions:**
```javascript
// Clean and validate URL
function cleanYouTubeUrl(url) {
  // Remove tracking parameters
  const cleanUrl = url.split('&')[0];
  
  // Validate format
  const validPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+$/,
    /^https?:\/\/youtu\.be\/[\w-]+$/,
    /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+$/,
    /^https?:\/\/(www\.)?youtube\.com\/channel\/[\w-]+$/
  ];
  
  const isValid = validPatterns.some(pattern => pattern.test(cleanUrl));
  
  if (!isValid) {
    throw new Error('Invalid YouTube URL format');
  }
  
  return cleanUrl;
}
```

---

#### Issue: Sync hangs or times out

**Symptoms:**
- Sync spinner runs indefinitely
- No response from API
- Request times out

**Causes:**
- Large channel with many videos
- Slow YouTube API response
- Network timeout

**Solutions:**
1. Implement timeout handling:
```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

2. Reduce videos per sync:
```javascript
// Limit to 5 videos per sync
const MAX_VIDEOS_PER_SYNC = 5;
```

---

### Database Issues

#### Issue: Firestore permission denied

**Symptoms:**
- Error: "Missing or insufficient permissions"
- Can't read/write data

**Causes:**
- Security rules misconfigured
- User not authenticated
- Admin check failing

**Solutions:**
1. Verify security rules:
```javascript
// firestore.rules
match /youtubeChannels/{document} {
  allow read: if true;
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid))
      .data.isAdmin == true;
}
```

2. Check user authentication:
```javascript
const user = firebase.auth().currentUser;
if (!user) {
  console.error('User not authenticated');
}
```

3. Verify admin status:
```javascript
const userDoc = await getDoc(doc(db, 'users', user.uid));
console.log('Is admin:', userDoc.data()?.isAdmin);
```

---

#### Issue: Duplicate videos in database

**Symptoms:**
- Same video appears multiple times
- Incorrect video counts

**Causes:**
- Document ID collision
- Sync running multiple times
- Race condition

**Solutions:**
1. Use composite document IDs:
```javascript
const docId = `${channelId}_${videoId}`;
```

2. Implement idempotent writes:
```javascript
const docRef = doc(db, 'youtubeVideoResources', docId);
const existing = await getDoc(docRef);

if (existing.exists()) {
  await updateDoc(docRef, updatedData);
} else {
  await setDoc(docRef, newData);
}
```

---

## Frequently Asked Questions

### General FAQs

**Q: How often are channels synced?**
A: Based on the `checkInterval` setting (default 24 hours). Manual sync available anytime.

**Q: Why can't I see a specific YouTube channel?**
A: Only admin-curated channels are available. Request additions through feedback.

**Q: What's the difference between channel URL and video URL?**
A: Both work! Video URLs automatically extract channel info, often more reliable.

**Q: Can I add private/unlisted videos?**
A: No, only public videos can be imported and displayed.

---

### Technical FAQs

**Q: What YouTube API quota is needed?**
A: Minimum 10,000 units/day. Each sync uses approximately:
- Channel info: 1 unit
- Video list: 1 unit per page
- Video details: 1 unit per video batch

**Q: How are transcripts extracted?**
A: Primary: SupaData API. Fallback: YouTube captions if available.

**Q: What happens if a video is deleted from YouTube?**
A: Remains in database but playback will fail. Consider periodic cleanup.

**Q: Can I bulk import multiple channels?**
A: Yes, but respect API quotas:
```javascript
for (const url of channelUrls) {
  await addChannel(url);
  await delay(5000); // 5 second delay
}
```

---

### Performance FAQs

**Q: Why is the page loading slowly?**
A: Possible causes:
- Large number of videos
- Slow network connection
- Missing database indexes

Solutions:
- Implement pagination
- Use lazy loading for thumbnails
- Ensure indexes are deployed

**Q: How can I optimize sync performance?**
A: 
- Sync during off-peak hours
- Limit videos per sync
- Use batch operations
- Enable caching

---

## Error Reference

### Error Codes and Meanings

| Code | Meaning | Solution |
|------|---------|----------|
| `QUOTA_EXCEEDED` | YouTube API limit reached | Wait 24 hours |
| `CHANNEL_NOT_FOUND` | Channel doesn't exist | Verify URL |
| `INVALID_URL` | URL format not recognized | Check URL format |
| `PERMISSION_DENIED` | Insufficient permissions | Check auth/admin |
| `NETWORK_ERROR` | Connection failed | Check internet |
| `TIMEOUT` | Request took too long | Retry later |
| `DUPLICATE_ENTRY` | Video already exists | Safe to ignore |
| `PARSE_ERROR` | Data format issue | Check API response |

---

## Debugging Tools

### Browser Console Commands

```javascript
// Check all channels
const channels = await getDocs(collection(db, 'youtubeChannels'));
channels.docs.forEach(doc => console.log(doc.id, doc.data()));

// Check videos for a channel
const videos = await getDocs(
  query(
    collection(db, 'youtubeVideoResources'),
    where('channelId', '==', 'CHANNEL_ID')
  )
);
console.log(`Found ${videos.docs.length} videos`);

// Check user permissions
const user = firebase.auth().currentUser;
const userDoc = await getDoc(doc(db, 'users', user.uid));
console.log('User data:', userDoc.data());

// Test sync function
const response = await fetch('/api/admin/sync-youtube-channel', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await user.getIdToken()}`
  },
  body: JSON.stringify({ channelId: 'CHANNEL_ID' })
});
console.log(await response.json());
```

### Monitoring Queries

```sql
-- Check sync history
SELECT channelId, lastSyncedAt, videosImported 
FROM youtubeChannels 
WHERE monitoringEnabled = true
ORDER BY lastSyncedAt DESC;

-- Find failed syncs
SELECT channelId, lastCheckedAt, lastSyncedAt
FROM youtubeChannels
WHERE lastCheckedAt > lastSyncedAt;

-- Popular videos
SELECT title, viewCount, shadowingSessionCount
FROM youtubeVideoResources
ORDER BY shadowingSessionCount DESC
LIMIT 10;
```

---

## Getting Help

### Support Channels

1. **Documentation**: Check all sections of this guide
2. **GitHub Issues**: Report bugs at repository
3. **Community Forum**: Ask questions
4. **Direct Support**: For critical issues

### Information to Provide

When reporting issues, include:

1. **Error messages** (exact text)
2. **Browser console logs**
3. **Network tab screenshots**
4. **Steps to reproduce**
5. **Browser and OS version**
6. **User role** (admin/free/premium)
7. **Channel/Video URLs** involved

### Log Collection Script

```javascript
// Run in browser console to collect debug info
const debugInfo = {
  timestamp: new Date().toISOString(),
  url: window.location.href,
  userAgent: navigator.userAgent,
  user: firebase.auth().currentUser?.uid,
  error: null,
  channels: 0,
  videos: 0
};

try {
  const channels = await getDocs(collection(db, 'youtubeChannels'));
  debugInfo.channels = channels.docs.length;
  
  const videos = await getDocs(collection(db, 'youtubeVideoResources'));
  debugInfo.videos = videos.docs.length;
} catch (error) {
  debugInfo.error = error.message;
}

console.log('Debug Info:', JSON.stringify(debugInfo, null, 2));
copy(JSON.stringify(debugInfo, null, 2));
console.log('Debug info copied to clipboard!');
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- Check API quota usage
- Monitor sync failures
- Review error logs

#### Weekly
- Clean up failed syncs
- Update popular channels
- Check for deleted videos

#### Monthly
- Archive old videos
- Optimize database indexes
- Review channel performance
- Update documentation

### Cleanup Scripts

```javascript
// Remove videos from deleted channels
async function cleanupOrphanedVideos() {
  const channels = await getDocs(collection(db, 'youtubeChannels'));
  const channelIds = new Set(channels.docs.map(d => d.id));
  
  const videos = await getDocs(collection(db, 'youtubeVideoResources'));
  const orphaned = videos.docs.filter(v => 
    !channelIds.has(v.data().channelId)
  );
  
  console.log(`Found ${orphaned.length} orphaned videos`);
  
  // Delete orphaned videos
  for (const video of orphaned) {
    await deleteDoc(video.ref);
  }
}

// Update video statistics
async function updateVideoStats() {
  const videos = await getDocs(collection(db, 'youtubeVideoResources'));
  
  for (const video of videos.docs) {
    const videoData = video.data();
    const videoId = videoData.videoId;
    
    // Fetch latest stats from YouTube
    const stats = await fetchVideoStats(videoId);
    
    await updateDoc(video.ref, {
      viewCount: stats.viewCount,
      likeCount: stats.likeCount,
      updatedAt: Timestamp.now()
    });
  }
}
```