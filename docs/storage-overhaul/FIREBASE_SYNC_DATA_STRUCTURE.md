# Firebase Sync Data Structure

## Overview

The premium sync feature stores user data in Firebase Firestore with a clear separation between different types of resources. This document outlines the exact data structure that appears in Firebase.

## Firestore Collections Structure

```
firestore-root/
├── userSync/
│   └── {userId}/
│       ├── manifest (document)
│       ├── userResources/
│       │   ├── {resourceId} (document)
│       │   ├── {resourceId} (document)
│       │   └── ...
│       └── syncQueue/
│           ├── {queueId} (document)
│           └── ...
```

## Document Structures

### 1. Sync Manifest (`/userSync/{userId}/manifest`)

The manifest tracks all resources synced by a user and their metadata.

```json
{
  "userId": "user123",
  "lastSyncTimestamp": 1704067200000,
  "deviceId": "device-abc-123",
  "resources": {
    "article-1": {
      "type": "article",
      "version": "1.0.0",
      "checksum": "sha256-abc123...",
      "lastModified": 1704067200000,
      "size": 102400
    },
    "story-5": {
      "type": "story",
      "version": "1.0.0",
      "checksum": "sha256-def456...",
      "lastModified": 1704067200000,
      "size": 204800
    },
    "kanji-100": {
      "type": "kanji",
      "version": "1.0.0",
      "checksum": "sha256-ghi789...",
      "lastModified": 1704067200000,
      "size": 5120
    }
  },
  "totalSize": 312320,
  "resourceCount": 3
}
```

### 2. User Resources (`/userSync/{userId}/userResources/{resourceId}`)

Each synced resource is stored as a separate document.

#### Article Example
```json
{
  "resource": {
    "id": "article-1",
    "type": "article",
    "data": {
      "id": "article-1",
      "title": "Introduction to Japanese Particles",
      "content": "Japanese particles are essential...",
      "slug": "intro-japanese-particles",
      "author": "Sensei Tanaka",
      "publishedAt": 1703462400000,
      "readingTime": 15,
      "imageUrls": [
        "https://example.com/particle-chart.jpg"
      ],
      "audioUrl": "https://example.com/audio/particles.mp3",
      "tags": ["grammar", "particles", "beginner"]
    },
    "metadata": {
      "size": 102400,
      "cachedAt": 1704067200000,
      "lastAccessed": 1704153600000,
      "version": "1.0.0",
      "checksum": "sha256-abc123...",
      "expiresAt": 1704672000000
    },
    "assets": [] // Binary assets are stored separately in Firebase Storage
  },
  "timestamp": "2024-01-01T00:00:00Z" // Firestore Timestamp
}
```

#### Story Example
```json
{
  "resource": {
    "id": "story-5",
    "type": "story",
    "data": {
      "id": "story-5",
      "title": "The Tale of the Bamboo Cutter",
      "slug": "bamboo-cutter",
      "theme": "folklore",
      "readingTime": 20,
      "sections": [
        {
          "id": "section-1",
          "content": "むかしむかし、竹取の翁という...",
          "vocabulary": [
            {
              "word": "竹",
              "reading": "たけ",
              "meaning": "bamboo"
            }
          ]
        }
      ],
      "totalSections": 5,
      "totalVocabulary": 50,
      "difficulty": "intermediate"
    },
    "metadata": {
      "size": 204800,
      "cachedAt": 1704067200000,
      "lastAccessed": 1704153600000,
      "version": "1.0.0",
      "checksum": "sha256-def456...",
      "expiresAt": 1704672000000
    },
    "assets": []
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Kanji Example
```json
{
  "resource": {
    "id": "kanji-100",
    "type": "kanji",
    "data": {
      "character": "愛",
      "meanings": ["love", "affection"],
      "readings": {
        "on": ["アイ"],
        "kun": ["あい", "いと.しい", "め.でる"]
      },
      "jlpt": 3,
      "grade": 4,
      "strokes": 13,
      "examples": [
        {
          "word": "愛情",
          "reading": "あいじょう",
          "meaning": "love, affection"
        }
      ]
    },
    "metadata": {
      "size": 5120,
      "cachedAt": 1704067200000,
      "lastAccessed": 1704153600000,
      "version": "1.0.0",
      "checksum": "sha256-ghi789...",
      "expiresAt": 1704672000000
    },
    "assets": []
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 3. Sync Queue (`/userSync/{userId}/syncQueue/{queueId}`)

Queued operations for offline sync.

```json
{
  "id": "queue-item-123",
  "operation": "upload",
  "resourceId": "article-2",
  "resourceType": "article",
  "timestamp": 1704067200000,
  "retryCount": 0,
  "lastError": null,
  "status": "pending"
}
```

## Resource Types

The sync system supports the following resource types:
- `article` - News articles and blog posts
- `story` - Interactive stories with vocabulary
- `kanji` - Kanji character data
- `verb` - Verb conjugation data
- `adjective` - Adjective conjugation data
- `audio` - Audio files for pronunciation

## Storage Limits by User Type

| User Type | Articles | Stories | Kanji | Verbs | Adjectives | Audio |
|-----------|----------|---------|-------|-------|------------|--------|
| Free      | 3        | 3       | ∞     | ∞     | ∞          | ∞      |
| Premium   | 50       | 50      | ∞     | ∞     | ∞          | ∞      |

## Firebase Storage

Binary assets (images, audio files) are stored separately in Firebase Storage:

```
gs://doshi-sensei.appspot.com/
└── userSync/
    └── {userId}/
        └── resources/
            ├── images/
            │   └── {resourceId}-{imageName}
            └── audio/
                └── {resourceId}-{audioName}
```

## Security Rules

The Firebase security rules ensure:
1. Only authenticated premium users can sync
2. Users can only access their own synced data
3. Resource structure is validated on write
4. The `isPremiumUser()` function checks subscription status

## Sync Process

1. **Initial Sync**: Uploads all local resources to Firebase
2. **Incremental Sync**: Compares manifests and syncs only changes
3. **Conflict Resolution**: Uses last-write-wins strategy based on `lastModified`
4. **Batch Operations**: Resources are uploaded/downloaded in batches to optimize performance

## Migration Considerations

When migrating from local-only storage to sync:
1. Existing local data is preserved
2. First sync uploads all local resources
3. Subsequent syncs only transfer changes
4. No data loss during migration

## Best Practices

1. **Resource IDs**: Use consistent IDs across devices (e.g., `article-{slug}`, `story-{id}`)
2. **Checksums**: Always verify checksums to ensure data integrity
3. **Timestamps**: Use server timestamps for consistency
4. **Cleanup**: Expired resources are cleaned up during sync
5. **Error Handling**: Failed operations are queued for retry