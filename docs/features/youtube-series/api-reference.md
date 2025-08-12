# YouTube Series - API Reference

## API Endpoints

### 1. Sync YouTube Channel

Synchronizes videos from a YouTube channel to the database.

#### Endpoint
```
POST /api/admin/sync-youtube-channel
```

#### Authentication
- Required: Bearer token in Authorization header
- User must have admin privileges

#### Request Headers
```http
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "channelId": "firestore_document_id"
}
```

#### Response

##### Success (200)
```json
{
  "success": true,
  "channelTitle": "Channel Name",
  "videosAdded": 5,
  "videosUpdated": 3,
  "totalVideos": 8
}
```

##### Error Responses

###### Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```

###### Forbidden (403)
```json
{
  "error": "Admin access required"
}
```

###### Not Found (404)
```json
{
  "error": "Channel not found"
}
```

###### Quota Exceeded (403)
```json
{
  "error": "YouTube API quota exceeded or API key invalid"
}
```

###### Server Error (500)
```json
{
  "error": "Failed to sync channel videos"
}
```

#### Example Usage

```typescript
// Client-side implementation
async function syncChannel(channelId: string) {
  const token = await firebase.auth().currentUser?.getIdToken();
  
  const response = await fetch('/api/admin/sync-youtube-channel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ channelId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  return response.json();
}
```

### 2. YouTube Video Information

Fetches video information from YouTube API v3.

#### Endpoint
```
POST /api/youtube/v3
```

#### Request Body
```json
{
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "apiKey": "youtube_api_key"
}
```

#### Response

##### Success (200)
```json
{
  "success": true,
  "video": {
    "id": "VIDEO_ID",
    "title": "Video Title",
    "description": "Video description...",
    "channelId": "UC_CHANNEL_ID",
    "channelTitle": "Channel Name",
    "publishedAt": "2024-01-15T10:00:00Z",
    "duration": "PT10M30S",
    "thumbnails": {
      "default": { "url": "...", "width": 120, "height": 90 },
      "medium": { "url": "...", "width": 320, "height": 180 },
      "high": { "url": "...", "width": 480, "height": 360 }
    },
    "defaultLanguage": "ja",
    "defaultAudioLanguage": "ja"
  },
  "captions": [
    {
      "id": "caption_id",
      "language": "ja",
      "name": "Japanese",
      "audioTrackType": "primary",
      "isCC": false,
      "isAutoSynced": false,
      "isDraft": false
    }
  ],
  "transcript": {
    "available": true,
    "language": "ja",
    "name": "Japanese",
    "isAutoSynced": false,
    "message": "Caption track found. Use alternative methods to download content."
  },
  "shortUrl": "youtu.be/VIDEO_ID"
}
```

##### Error Responses

###### Bad Request (400)
```json
{
  "error": "URL is required"
}
```

```json
{
  "error": "API key is required"
}
```

```json
{
  "error": "Invalid YouTube URL"
}
```

###### Not Found (404)
```json
{
  "error": "Video not found"
}
```

###### Forbidden (403)
```json
{
  "error": "YouTube API quota exceeded or API key invalid"
}
```

#### Example Usage

```typescript
async function getVideoInfo(url: string) {
  const response = await fetch('/api/youtube/v3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      apiKey: 'YOUR_API_KEY'
    })
  });
  
  return response.json();
}
```

### 3. Extract Video Transcript

Extracts transcript/captions from a YouTube video using SupaData API.

#### Endpoint
```
POST /api/youtube/extract
```

#### Request Body
```json
{
  "videoId": "VIDEO_ID",
  "language": "ja"
}
```

#### Response

##### Success (200)
```json
{
  "success": true,
  "transcript": {
    "lang": "ja",
    "content": [
      {
        "text": "Japanese text content",
        "duration": 7080,
        "offset": 31400,
        "lang": "ja"
      }
    ]
  }
}
```

##### Error Response (500)
```json
{
  "error": "Failed to extract transcript"
}
```

## Database Collections

### 1. youtubeChannels Collection

#### Document Structure
```typescript
interface YouTubeChannel {
  // Identifiers
  id: string;                    // Auto-generated Firestore ID
  channelId: string;             // Channel identifier (from URL)
  youtubeChannelId?: string;     // Actual YouTube channel ID
  channelUrl: string;            // Full channel URL
  
  // Channel Information
  channelTitle: string;          // Channel display name
  description?: string;          // Channel description
  thumbnailUrl?: string;         // Channel avatar URL
  uploadsPlaylistId?: string;    // YouTube uploads playlist ID
  
  // Configuration
  monitoringEnabled: boolean;    // Enable automatic monitoring
  checkInterval: number;         // Hours between checks (1-168)
  autoCreateResource: boolean;   // Create resource entries
  resourceCategory: string;      // Default category
  resourceTags: string[];        // Default tags array
  isPremiumContent: boolean;     // Premium-only flag
  autoExtractTranscript: boolean;// Auto-extract transcripts
  shadowingEnabled: boolean;     // Enable shadowing feature
  
  // Source Information
  sourceVideoUrl?: string;       // Original video URL if provided
  sourceVideoId?: string;        // Original video ID if provided
  
  // Statistics
  videosImported: number;        // Count of imported videos
  totalViews: number;            // Aggregate view count
  totalShadowingSessions: number;// Total practice sessions
  
  // Timestamps
  createdAt: Timestamp;          // Creation timestamp
  updatedAt: Timestamp;          // Last update timestamp
  lastCheckedAt?: Timestamp;     // Last check attempt
  lastSyncedAt?: Timestamp;      // Last successful sync
}
```

#### Firestore Queries

##### Get All Active Channels
```typescript
const q = query(
  collection(db, 'youtubeChannels'),
  where('monitoringEnabled', '==', true),
  orderBy('channelTitle', 'asc')
);
```

##### Get Channel by ID
```typescript
const docRef = doc(db, 'youtubeChannels', channelId);
const docSnap = await getDoc(docRef);
```

##### Get Channels Needing Sync
```typescript
const cutoffTime = new Date();
cutoffTime.setHours(cutoffTime.getHours() - 24);

const q = query(
  collection(db, 'youtubeChannels'),
  where('monitoringEnabled', '==', true),
  where('lastSyncedAt', '<', Timestamp.fromDate(cutoffTime))
);
```

### 2. youtubeVideoResources Collection

#### Document Structure
```typescript
interface YouTubeVideoResource {
  // Identifiers
  id: string;                    // Format: channelId_videoId
  videoId: string;               // YouTube video ID
  channelId: string;             // Reference to youtubeChannels doc
  youtubeChannelId: string;      // YouTube channel ID
  
  // Video Information
  title: string;                 // Video title
  description: string;           // Video description
  thumbnailUrl: string;          // Video thumbnail URL
  publishedAt: Timestamp;        // YouTube publish date
  duration: number;              // Duration in seconds
  
  // YouTube Statistics
  viewCount: number;             // View count
  likeCount: number;             // Like count
  commentCount: number;          // Comment count
  
  // Resource Configuration
  resourceId?: string;           // Linked resource document
  resourceSlug?: string;         // URL slug
  resourceCategory: string;      // Content category
  resourceTags: string[];        // Tags array
  isPremiumContent: boolean;     // Premium flag
  shadowingEnabled: boolean;     // Shadowing available
  
  // Transcript Information
  transcriptCached: boolean;     // Transcript in cache
  transcriptLanguage?: string;   // Transcript language code
  transcriptLastUpdated?: Timestamp;
  
  // Platform Statistics
  shadowingSessionCount: number; // Practice count
  resourceViewCount: number;     // Resource views
  
  // Timestamps
  importedAt: Timestamp;         // Import timestamp
  updatedAt: Timestamp;          // Last update
}
```

#### Firestore Queries

##### Get Videos by Channel
```typescript
const q = query(
  collection(db, 'youtubeVideoResources'),
  where('channelId', '==', channelId),
  orderBy('publishedAt', 'desc'),
  limit(10)
);
```

##### Get Recent Videos
```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const q = query(
  collection(db, 'youtubeVideoResources'),
  where('importedAt', '>', Timestamp.fromDate(sevenDaysAgo)),
  orderBy('importedAt', 'desc')
);
```

##### Get Videos with Transcripts
```typescript
const q = query(
  collection(db, 'youtubeVideoResources'),
  where('transcriptCached', '==', true),
  where('shadowingEnabled', '==', true),
  orderBy('publishedAt', 'desc')
);
```

### 3. transcriptCache Collection

#### Document Structure
```typescript
interface TranscriptCache {
  id: string;                    // Video ID
  videoId: string;               // YouTube video ID
  language: string;              // Language code (e.g., 'ja')
  transcript: TranscriptEntry[]; // Transcript segments
  source: string;                // Source of transcript
  cachedAt: Timestamp;           // Cache timestamp
  accessCount: number;           // Access counter
  lastAccessedAt: Timestamp;     // Last access time
}

interface TranscriptEntry {
  text: string;                  // Segment text
  start: number;                 // Start time (ms)
  duration: number;              // Duration (ms)
  end?: number;                  // End time (ms)
}
```

## Helper Functions

### URL Parsing Utilities

```typescript
// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract channel ID from YouTube URL
function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/,
    /youtube\.com\/c\/([^\/\?]+)/,
    /youtube\.com\/user\/([^\/\?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds to display string
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

### Date Utilities

```typescript
// Check if video is "new" (added within last 7 days)
function isNewVideo(video: YouTubeVideoResource): boolean {
  if (!video.importedAt) return false;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return video.importedAt.toDate() > sevenDaysAgo;
}

// Check if channel needs sync
function needsSync(channel: YouTubeChannel): boolean {
  if (!channel.monitoringEnabled) return false;
  if (!channel.lastSyncedAt) return true;
  
  const hoursSinceSync = 
    (Date.now() - channel.lastSyncedAt.toMillis()) / (1000 * 60 * 60);
  
  return hoursSinceSync >= channel.checkInterval;
}
```

## Error Codes

### YouTube API Errors

| Code | Description | Action |
|------|-------------|--------|
| 403 | Quota exceeded | Wait 24 hours or upgrade quota |
| 404 | Video/Channel not found | Remove from system |
| 401 | Invalid API key | Check API key configuration |
| 400 | Invalid request | Check request parameters |

### Firestore Errors

| Code | Description | Action |
|------|-------------|--------|
| permission-denied | Insufficient permissions | Check security rules |
| resource-exhausted | Quota exceeded | Upgrade Firestore plan |
| not-found | Document not found | Handle gracefully |
| already-exists | Document already exists | Update instead of create |

### Application Errors

| Code | Description | Action |
|------|-------------|--------|
| ADMIN_REQUIRED | User is not admin | Redirect to home |
| CHANNEL_NOT_FOUND | Channel doesn't exist | Show error message |
| SYNC_IN_PROGRESS | Sync already running | Show loading state |
| INVALID_URL | URL format not recognized | Request valid URL |

## Rate Limits

### YouTube API v3 Quotas

- **Default quota**: 10,000 units per day
- **Cost per operation**:
  - Search: 100 units
  - List (channels): 1 unit
  - List (videos): 1 unit
  - List (playlists): 1 unit

### SupaData API Limits

- **Free tier**: 100 requests/month
- **Pro tier**: 1,000 requests/month
- **Mega tier**: 10,000 requests/month

### Firestore Limits

- **Document size**: 1 MB
- **Write rate**: 1 write/second per document
- **Collection listing**: 1 request/second
- **Batch writes**: 500 documents per batch

## Webhook Support

### YouTube PubSubHubbub

For real-time updates when new videos are published:

```typescript
// Subscribe to channel updates
async function subscribeToChannel(channelId: string) {
  const callbackUrl = `https://yourdomain.com/api/webhooks/youtube`;
  const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
  
  const params = new URLSearchParams({
    'hub.callback': callbackUrl,
    'hub.topic': topicUrl,
    'hub.mode': 'subscribe',
    'hub.verify': 'async'
  });
  
  await fetch('https://pubsubhubbub.appspot.com/subscribe', {
    method: 'POST',
    body: params
  });
}

// Handle webhook notification
export async function POST(request: NextRequest) {
  const body = await request.text();
  const xml = parseXML(body);
  
  const videoId = xml.entry.videoId;
  const channelId = xml.entry.channelId;
  
  // Process new video
  await processNewVideo(channelId, videoId);
  
  return new Response('OK', { status: 200 });
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
// Initialize client
class YouTubeSeriesClient {
  constructor(private apiKey: string) {}
  
  async syncChannel(channelId: string, token: string) {
    const response = await fetch('/api/admin/sync-youtube-channel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ channelId })
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getVideoInfo(url: string) {
    const response = await fetch('/api/youtube/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        apiKey: this.apiKey
      })
    });
    
    return response.json();
  }
}

// Usage
const client = new YouTubeSeriesClient('YOUR_API_KEY');
const info = await client.getVideoInfo('https://youtu.be/VIDEO_ID');
```

### Python

```python
import requests
import json

class YouTubeSeriesClient:
    def __init__(self, api_key, base_url='https://doshisensei.com'):
        self.api_key = api_key
        self.base_url = base_url
    
    def sync_channel(self, channel_id, token):
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
        
        data = {'channelId': channel_id}
        
        response = requests.post(
            f'{self.base_url}/api/admin/sync-youtube-channel',
            headers=headers,
            json=data
        )
        
        response.raise_for_status()
        return response.json()
    
    def get_video_info(self, url):
        data = {
            'url': url,
            'apiKey': self.api_key
        }
        
        response = requests.post(
            f'{self.base_url}/api/youtube/v3',
            json=data
        )
        
        response.raise_for_status()
        return response.json()

# Usage
client = YouTubeSeriesClient('YOUR_API_KEY')
info = client.get_video_info('https://youtu.be/VIDEO_ID')
```