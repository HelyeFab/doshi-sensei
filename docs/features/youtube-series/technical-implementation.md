# YouTube Series - Technical Implementation

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   └── youtube-series/
│   │       ├── page.tsx
│   │       └── AdminYouTubeSeriesPage.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   └── sync-youtube-channel/
│   │   │       └── route.ts
│   │   └── youtube/
│   │       ├── v3/
│   │       │   └── route.ts
│   │       └── extract/
│   │           └── route.ts
│   └── tools/
│       └── youtube-series/
│           ├── page.tsx
│           ├── YouTubeSeriesPage.tsx
│           └── [channelId]/
│               └── page.tsx
├── types/
│   └── youtube-series.ts
├── lib/
│   ├── firebase.ts
│   └── firebase-admin.ts
└── utils/
    └── youtube-helpers.ts
```

## Core Components

### 1. Admin Interface (`AdminYouTubeSeriesPage.tsx`)

```typescript
// Key responsibilities:
// - Channel CRUD operations
// - Video synchronization triggers
// - Configuration management

const AdminYouTubeSeriesPage = () => {
  // State management
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [formData, setFormData] = useState<YouTubeChannelFormData>({...});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Core functions
  const loadChannels = async () => {
    // Fetch channels from Firestore
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // Process form submission
    // Handle both channel and video URLs
    // Extract channel information
    // Save to Firestore
  };

  const syncChannel = async (channelId: string) => {
    // Trigger video synchronization
    // Call sync API endpoint
    // Update UI with results
  };

  // URL parsing utilities
  const extractVideoIdFromUrl = (url: string): string | null => {
    // Extract video ID from various YouTube URL formats
  };

  const extractChannelIdFromUrl = (url: string): string => {
    // Extract channel identifier from URL
  };
};
```

### 2. User Interface (`YouTubeSeriesPage.tsx`)

```typescript
// Key responsibilities:
// - Display curated channels
// - Show recent videos
// - Enable user interactions

const YouTubeSeriesPage = () => {
  // State management
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoMap>({});
  const [loading, setLoading] = useState(true);

  // Data fetching
  const loadChannelsAndVideos = async () => {
    // Query active channels
    const channelsQuery = query(
      collection(db, 'youtubeChannels'),
      where('monitoringEnabled', '==', true),
      orderBy('channelTitle', 'asc')
    );
    
    // Fetch recent videos for each channel
    for (const channel of channelsList) {
      const videosQuery = query(
        collection(db, 'youtubeVideoResources'),
        where('channelId', '==', channel.id),
        orderBy('publishedAt', 'desc')
      );
    }
  };

  // Utility functions
  const isNewVideo = (video: YouTubeVideoResource): boolean => {
    // Check if video was added recently
  };

  const formatDuration = (seconds: number): string => {
    // Convert seconds to readable format
  };
};
```

### 3. Sync API Route (`/api/admin/sync-youtube-channel/route.ts`)

```typescript
// Key responsibilities:
// - Authenticate admin users
// - Fetch channel data from YouTube
// - Import videos to Firestore
// - Handle errors and quotas

export async function POST(request: NextRequest) {
  // 1. Authentication
  const token = await verifyAdminToken(request);
  
  // 2. Extract channel information
  const { channelId } = await request.json();
  const channelData = await getChannelFromFirestore(channelId);
  
  // 3. Determine YouTube channel ID
  let youtubeChannelId = await resolveYouTubeChannelId(channelData);
  
  // 4. Fetch channel details from YouTube API
  const channelInfo = await fetchChannelInfo(youtubeChannelId);
  
  // 5. Fetch recent videos
  const videos = await fetchChannelVideos(channelInfo.uploadsPlaylistId);
  
  // 6. Process and store videos
  for (const video of videos) {
    await processAndStoreVideo(video, channelId);
  }
  
  // 7. Update channel statistics
  await updateChannelStats(channelId, results);
  
  return NextResponse.json(results);
}
```

## Data Models

### TypeScript Types (`types/youtube-series.ts`)

```typescript
// Channel data structure
export interface YouTubeChannel {
  id: string;
  channelId: string;
  channelUrl: string;
  youtubeChannelId?: string;
  channelTitle: string;
  description?: string;
  thumbnailUrl?: string;
  
  // Configuration
  monitoringEnabled: boolean;
  checkInterval: number;
  autoCreateResource: boolean;
  resourceCategory: string;
  resourceTags: string[];
  isPremiumContent: boolean;
  autoExtractTranscript: boolean;
  shadowingEnabled: boolean;
  
  // Metadata
  sourceVideoUrl?: string;
  sourceVideoId?: string;
  uploadsPlaylistId?: string;
  
  // Statistics
  videosImported: number;
  totalViews: number;
  totalShadowingSessions: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastCheckedAt?: Timestamp;
  lastSyncedAt?: Timestamp;
}

// Video data structure
export interface YouTubeVideoResource {
  id: string;
  videoId: string;
  channelId: string;
  youtubeChannelId: string;
  
  // Video Information
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: Timestamp;
  duration: number;
  
  // Statistics
  viewCount: number;
  likeCount: number;
  commentCount: number;
  
  // Resource Configuration
  resourceId?: string;
  resourceSlug?: string;
  resourceCategory: string;
  resourceTags: string[];
  isPremiumContent: boolean;
  shadowingEnabled: boolean;
  
  // Transcript Data
  transcriptCached: boolean;
  transcriptLanguage?: string;
  transcriptLastUpdated?: Timestamp;
  
  // Usage Statistics
  shadowingSessionCount: number;
  resourceViewCount: number;
  
  // Timestamps
  importedAt: Timestamp;
  updatedAt: Timestamp;
}

// Form data for channel creation
export interface YouTubeChannelFormData {
  channelUrl: string;
  monitoringEnabled: boolean;
  checkInterval: number;
  autoCreateResource: boolean;
  resourceCategory: string;
  resourceTags: string;
  isPremiumContent: boolean;
  autoExtractTranscript: boolean;
  shadowingEnabled: boolean;
}
```

## API Integration

### YouTube Data API v3

```typescript
// Configuration
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

// Fetch channel information
async function fetchChannelInfo(channelId: string) {
  const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
    params: {
      part: 'snippet,contentDetails',
      id: channelId,
      key: API_KEY
    }
  });
  
  return {
    title: response.data.items[0].snippet.title,
    description: response.data.items[0].snippet.description,
    thumbnailUrl: response.data.items[0].snippet.thumbnails.high.url,
    uploadsPlaylistId: response.data.items[0].contentDetails.relatedPlaylists.uploads
  };
}

// Fetch videos from playlist
async function fetchChannelVideos(playlistId: string, maxResults = 10) {
  // Get playlist items
  const playlistResponse = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
    params: {
      part: 'snippet,contentDetails',
      playlistId: playlistId,
      maxResults: maxResults,
      key: API_KEY
    }
  });
  
  // Get detailed video information
  const videoIds = playlistResponse.data.items.map(item => item.contentDetails.videoId);
  const videosResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
    params: {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
      key: API_KEY
    }
  });
  
  return videosResponse.data.items;
}
```

### SupaData API Integration

```typescript
// For transcript extraction
async function extractTranscript(videoId: string) {
  const response = await fetch('https://api.supadata.ai/v1/youtube/transcript', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPA_YOUTUBE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      video_id: videoId,
      lang: 'ja'
    })
  });
  
  return response.json();
}
```

## Database Operations

### Firestore Queries

```typescript
// Load active channels
const loadActiveChannels = async () => {
  const q = query(
    collection(db, 'youtubeChannels'),
    where('monitoringEnabled', '==', true),
    orderBy('channelTitle', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as YouTubeChannel));
};

// Load channel videos
const loadChannelVideos = async (channelId: string, limit = 10) => {
  const q = query(
    collection(db, 'youtubeVideoResources'),
    where('channelId', '==', channelId),
    orderBy('publishedAt', 'desc'),
    limit(limit)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as YouTubeVideoResource));
};

// Save/Update video
const saveVideo = async (videoData: YouTubeVideoResource) => {
  const docId = `${videoData.channelId}_${videoData.videoId}`;
  const docRef = doc(db, 'youtubeVideoResources', docId);
  
  const existingDoc = await getDoc(docRef);
  if (existingDoc.exists()) {
    // Update existing
    await updateDoc(docRef, {
      ...videoData,
      updatedAt: Timestamp.now()
    });
  } else {
    // Create new
    await setDoc(docRef, {
      ...videoData,
      importedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
};
```

### Firestore Indexes

Required indexes in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "youtubeChannels",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "monitoringEnabled", "order": "ASCENDING" },
        { "fieldPath": "channelTitle", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "youtubeVideoResources",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "youtubeVideoResources",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "shadowingEnabled", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Authentication & Authorization

### Admin Authentication

```typescript
// Verify admin status
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(token);
  
  // Check admin status in Firestore
  const userDoc = await getDoc(doc(db, 'users', decodedToken.uid));
  const userData = userDoc.data();
  
  if (!userData?.isAdmin) {
    throw new Error('Admin access required');
  }
  
  return decodedToken;
}
```

### User Authorization

```typescript
// Check content access
function canAccessContent(user: User | null, content: YouTubeVideoResource) {
  // Guest users
  if (!user) {
    return false;
  }
  
  // Premium content check
  if (content.isPremiumContent && !user.isPremium) {
    return false;
  }
  
  // Daily limit check
  if (user.dailyUsage >= user.dailyLimit) {
    return false;
  }
  
  return true;
}
```

## Error Handling

### API Error Handling

```typescript
// YouTube API errors
try {
  const response = await fetchFromYouTube();
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      // Quota exceeded
      console.error('YouTube API quota exceeded');
      return { error: 'API quota exceeded', retryAfter: 86400 };
    }
    if (error.response?.status === 404) {
      // Resource not found
      console.error('YouTube resource not found');
      return { error: 'Resource not found' };
    }
  }
  throw error;
}

// Firestore errors
try {
  await saveToFirestore(data);
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('Firestore permission denied');
    return { error: 'Permission denied' };
  }
  if (error.code === 'resource-exhausted') {
    console.error('Firestore quota exceeded');
    return { error: 'Database quota exceeded' };
  }
  throw error;
}
```

## Performance Optimizations

### 1. Batch Operations

```typescript
// Batch write videos
const batch = writeBatch(db);
videos.forEach(video => {
  const docRef = doc(db, 'youtubeVideoResources', video.id);
  batch.set(docRef, video);
});
await batch.commit();
```

### 2. Caching Strategy

```typescript
// Client-side caching with React Query
const { data, error, isLoading } = useQuery({
  queryKey: ['youtube-channels'],
  queryFn: fetchChannels,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// Server-side caching
const cacheKey = `channel_${channelId}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const data = await fetchFromAPI();
await cache.set(cacheKey, data, { ttl: 3600 });
return data;
```

### 3. Lazy Loading

```typescript
// Lazy load video thumbnails
const VideoThumbnail = ({ src, alt }) => {
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef}>
      {isInView && <img src={src} alt={alt} loading="lazy" />}
    </div>
  );
};
```

## Testing

### Unit Tests

```typescript
// Test URL parsing
describe('URL Parsing', () => {
  test('extracts video ID from standard URL', () => {
    const url = 'https://youtube.com/watch?v=ABC123';
    expect(extractVideoId(url)).toBe('ABC123');
  });
  
  test('extracts channel ID from channel URL', () => {
    const url = 'https://youtube.com/channel/UC123456';
    expect(extractChannelId(url)).toBe('UC123456');
  });
  
  test('handles @username format', () => {
    const url = 'https://youtube.com/@username';
    expect(extractChannelId(url)).toBe('@username');
  });
});
```

### Integration Tests

```typescript
// Test sync process
describe('Channel Sync', () => {
  test('successfully syncs channel videos', async () => {
    const channelId = 'test-channel';
    const response = await syncChannel(channelId);
    
    expect(response.success).toBe(true);
    expect(response.videosAdded).toBeGreaterThan(0);
    expect(response.channelTitle).toBeDefined();
  });
  
  test('handles API quota errors', async () => {
    mockAPIQuotaExceeded();
    const response = await syncChannel('test-channel');
    
    expect(response.error).toBe('API quota exceeded');
    expect(response.retryAfter).toBe(86400);
  });
});
```

## Deployment Considerations

### Environment Variables

```bash
# Required for production
YOUTUBE_API_KEY=your_youtube_api_key
SUPA_YOUTUBE_API_KEY=your_supadata_key
FIREBASE_ADMIN_SDK=path_to_service_account
NEXT_PUBLIC_FIREBASE_CONFIG=firebase_config_json
```

### Security Rules

```javascript
// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // YouTube channels - read all, write admin only
    match /youtubeChannels/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // YouTube videos - read all, write admin only
    match /youtubeVideoResources/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

### Monitoring

```typescript
// Log sync operations
logger.info('Channel sync started', {
  channelId,
  timestamp: new Date().toISOString(),
  userId: adminUser.uid
});

// Track API usage
metrics.increment('youtube.api.calls');
metrics.gauge('youtube.api.quota.remaining', remainingQuota);

// Monitor errors
logger.error('Sync failed', {
  channelId,
  error: error.message,
  stack: error.stack
});
```