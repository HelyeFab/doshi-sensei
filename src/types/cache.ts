// Cache-related type definitions for the storage overhaul

export interface CachedResource {
  id: string;
  type: ResourceType;
  data: any;
  metadata: ResourceMetadata;
  assets?: ResourceAssets;
}

export type ResourceType = 'article' | 'story' | 'kanji' | 'verb' | 'adjective' | 'audio';

export interface ResourceMetadata {
  size: number;
  cachedAt: number;
  lastAccessed: number;
  version: string;
  checksum: string;
  expiresAt?: number;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

export interface ResourceAssets {
  images: Map<string, Blob>;
  audio: Map<string, Blob>;
  documents?: Map<string, Blob>;
}

// Article-specific types
export interface CachedArticle extends CachedResource {
  type: 'article';
  data: {
    id: string;
    title: string;
    content: string;
    slug: string;
    author?: string;
    publishedAt?: number;
    readingTime?: number;
    imageUrls?: string[];
    audioUrl?: string;
    tags?: string[];
  };
}

// Story-specific types
export interface CachedStory extends CachedResource {
  type: 'story';
  data: {
    id: string;
    title: string;
    content: string;
    level: string;
    imageUrl?: string;
    audioUrl?: string;
    vocabulary?: string[];
  };
}

// Kanji-specific types
export interface CachedKanji extends CachedResource {
  type: 'kanji';
  data: {
    character: string;
    meaning: string;
    onyomi: string[];
    kunyomi: string[];
    jlpt: number;
    strokeCount: number;
    radicals?: string[];
    examples?: KanjiExample[];
  };
}

export interface KanjiExample {
  word: string;
  reading: string;
  meaning: string;
}

// Verb-specific types
export interface CachedVerb extends CachedResource {
  type: 'verb';
  data: {
    id: string;
    kanji: string;
    kana: string;
    romaji: string;
    meaning: string;
    type: 'godan' | 'ichidan' | 'irregular';
    jlpt?: number;
    conjugations?: VerbConjugation[];
  };
}

export interface VerbConjugation {
  form: string;
  positive: string;
  negative: string;
}

// Adjective-specific types
export interface CachedAdjective extends CachedResource {
  type: 'adjective';
  data: {
    id: string;
    kanji: string;
    kana: string;
    romaji: string;
    meaning: string;
    type: 'i-adjective' | 'na-adjective';
    jlpt?: number;
  };
}

// Audio-specific types
export interface CachedAudio extends CachedResource {
  type: 'audio';
  data: {
    id: string;
    url: string;
    duration?: number;
    format?: string;
    relatedContent?: {
      type: ResourceType;
      id: string;
    };
  };
}

// Cache management types
export interface CacheStats {
  totalSize: number;
  itemCount: number;
  oldestItem: number;
  newestItem: number;
  byType: Record<ResourceType, {
    count: number;
    size: number;
  }>;
}

export interface CacheConfig {
  maxSizeBytes: number;
  maxAge: number;
  evictionStrategy: 'lru' | 'fifo' | 'lfu';
  compressionEnabled: boolean;
}

export interface CacheQuery {
  type?: ResourceType;
  ids?: string[];
  minLastAccessed?: number;
  maxAge?: number;
  limit?: number;
  offset?: number;
}

// Sync-related types
export interface SyncQueueItem {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  action: 'upload' | 'download' | 'delete';
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncManifest {
  userId: string;
  lastSyncedAt: number;
  resources: {
    type: ResourceType;
    id: string;
    version: string;
    checksum: string;
  }[];
}

// Storage limit types
export interface StorageLimits {
  guest: ResourceLimits;
  free: ResourceLimits;
  premium: ResourceLimits;
}

export interface ResourceLimits {
  article: number;
  story: number;
  kanji: number;
  verb: number;
  adjective: number;
  audio: number;
}

// Cache events
export interface CacheEvent {
  type: 'added' | 'updated' | 'evicted' | 'synced';
  resourceType: ResourceType;
  resourceId: string;
  timestamp: number;
  details?: any;
}

// Error types
export interface CacheError extends Error {
  code: CacheErrorCode;
  resourceType?: ResourceType;
  resourceId?: string;
}

export type CacheErrorCode = 
  | 'QUOTA_EXCEEDED'
  | 'INVALID_RESOURCE'
  | 'SYNC_FAILED'
  | 'CHECKSUM_MISMATCH'
  | 'VERSION_CONFLICT'
  | 'NETWORK_ERROR'
  | 'STORAGE_UNAVAILABLE';

// Helper type guards
export function isCachedArticle(resource: CachedResource): resource is CachedArticle {
  return resource.type === 'article';
}

export function isCachedStory(resource: CachedResource): resource is CachedStory {
  return resource.type === 'story';
}

export function isCachedKanji(resource: CachedResource): resource is CachedKanji {
  return resource.type === 'kanji';
}

export function isCachedVerb(resource: CachedResource): resource is CachedVerb {
  return resource.type === 'verb';
}

export function isCachedAdjective(resource: CachedResource): resource is CachedAdjective {
  return resource.type === 'adjective';
}

export function isCachedAudio(resource: CachedResource): resource is CachedAudio {
  return resource.type === 'audio';
}