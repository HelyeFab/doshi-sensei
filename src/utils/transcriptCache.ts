import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';

// Import Firebase - it will be null on server side
import { db } from '@/lib/firebase';
import { TranscriptLine } from '@/app/tools/youtube-shadowing/YouTubeShadowing';

interface CachedTranscript {
  id: string;
  contentId: string; // Hash of the content identifier
  contentType: 'youtube' | 'audio' | 'video';
  videoUrl?: string;
  videoTitle?: string;
  transcript: TranscriptLine[];
  formattedTranscript?: TranscriptLine[]; // AI-formatted version
  language: string;
  duration?: number;
  createdAt: Timestamp;
  lastAccessed: Timestamp;
  accessCount: number;
  createdBy?: string; // User ID who created it
  metadata?: {
    youtubeVideoId?: string;
    channelName?: string;
    uploadDate?: string;
    formattedAt?: Timestamp; // When AI formatting was done
    formattingModel?: string; // Which AI model was used
    wasFormatted?: boolean; // Whether formatting was applied
  };
}

export class TranscriptCacheManager {
  private static COLLECTION_NAME = 'transcriptCache';
  private static CACHE_DURATION_DAYS = 90; // Cache for 90 days

  /**
   * Normalize a YouTube URL to a standard format
   * This ensures consistent video IDs regardless of URL format
   */
  static normalizeYouTubeUrl(url: string): string {
    const videoId = this.extractYouTubeVideoId(url);
    if (videoId) {
      // Always return the standard watch URL format
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  }

  /**
   * Generate a unique content ID for caching
   * For YouTube: Use video ID
   * For uploaded files: Use hash of file name + size + duration
   */
  static generateContentId(params: {
    type: 'youtube' | 'audio' | 'video';
    videoUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
  }): string {
    if (params.type === 'youtube' && params.videoUrl) {
      // Normalize the URL first - decode any URI encoding
      const normalizedUrl = decodeURIComponent(params.videoUrl);
      
      // Extract YouTube video ID

      const videoId = this.extractYouTubeVideoId(normalizedUrl);

      if (videoId) {
        const contentId = `youtube_${videoId}`;

        return contentId;
      } else {

        // Fallback to a hash of the URL if we can't extract the ID
        let hash = 0;
        for (let i = 0; i < normalizedUrl.length; i++) {
          const char = normalizedUrl.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const fallbackId = `youtube_fallback_${Math.abs(hash).toString(16)}`;

        return fallbackId;
      }
    }

    // For uploaded files, create a simple hash using browser-compatible method
    const contentString = `${params.type}_${params.fileName}_${params.fileSize}_${params.duration}`;
    
    // Simple hash function for browser
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `file_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Extract YouTube video ID from URL
   * Handles all common YouTube URL formats
   */
  private static extractYouTubeVideoId(url: string): string | null {

    // Clean the URL first - remove any trailing slashes or query parameters after the video ID
    const cleanUrl = url.trim();
    
    // Comprehensive patterns for all YouTube URL formats
    const patterns = [
      // Standard watch URLs: youtube.com/watch?v=VIDEO_ID or youtube.com/watch?v=VIDEO_ID&other=params
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[&\?].*)?/,
      // Short URLs: youtu.be/VIDEO_ID or youtu.be/VIDEO_ID?t=123
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[\?].*)?/,
      // Embed URLs: youtube.com/embed/VIDEO_ID
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:[\?].*)?/,
      // Mobile URLs: m.youtube.com/watch?v=VIDEO_ID
      /(?:https?:\/\/)?(?:www\.)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[&\?].*)?/,
      // YouTube Music: music.youtube.com/watch?v=VIDEO_ID
      /(?:https?:\/\/)?music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:[&\?].*)?/,
      // YouTube Shorts: youtube.com/shorts/VIDEO_ID
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:[\?].*)?/,
      // Old format: youtube.com/v/VIDEO_ID
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})(?:[\?].*)?/
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {

        return match[1];
      }
    }

    return null;
  }

  /**
   * Get cached transcript from Firestore
   */
  static async getCachedTranscript(contentId: string): Promise<CachedTranscript | null> {
    try {

      // Ensure Firestore is available - REQUIRED
      if (!db) {
        console.error('❌ [CACHE] CRITICAL: Firestore not initialized - caching is mandatory');
        throw new Error('Firestore is required for transcript caching');
      }
      
      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {

        return null;
      }

      const data = docSnap.data() as CachedTranscript;
      
      // Check if cache is expired
      const createdAt = data.createdAt?.toDate();
      if (createdAt) {
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > this.CACHE_DURATION_DAYS) {

          return null;
        }
      }

      // Update access count and last accessed time
      await updateDoc(docRef, {
        lastAccessed: serverTimestamp(),
        accessCount: increment(1)
      });

      return data;
    } catch (error: any) {
      console.error('❌ [CACHE] Error getting cached transcript:', error?.message || error);
      console.error('❌ [CACHE] Error type:', error?.constructor?.name);
      console.error('❌ [CACHE] Error code:', error?.code);
      
      // Re-throw for critical errors, but return null for non-critical ones
      if (error?.message?.includes('Firestore is required')) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Save transcript to Firestore cache
   * Note: Caller should check authentication before attempting to save
   */
  static async saveTranscriptToCache(params: {
    contentId: string;
    contentType: 'youtube' | 'audio' | 'video';
    videoUrl?: string;
    videoTitle?: string;
    transcript: TranscriptLine[];
    language: string;
    duration?: number;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    // Retry mechanism for cache saves
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds for saves
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`💾 [CACHE] Saving transcript to Firestore (attempt ${attempt}/${MAX_RETRIES})`);

        // Check Firestore availability
        if (!db) {
          throw new Error('Firestore is required but not initialized');
        }

        // Clean metadata to remove undefined values
        const cleanMetadata: any = {};
        if (params.metadata) {
          Object.keys(params.metadata).forEach(key => {
            if (params.metadata[key] !== undefined) {
              cleanMetadata[key] = params.metadata[key];
            }
          });
        }
        
        // Build cache data carefully to avoid undefined values
        const cacheData: any = {
          id: params.contentId,
          contentId: params.contentId,
          contentType: params.contentType,
          transcript: params.transcript || [],
          language: params.language || 'ja',
          createdAt: serverTimestamp(),
          lastAccessed: serverTimestamp(),
          accessCount: 1
        };
        
        // Only add optional fields if they're defined (Firestore doesn't accept undefined values)
        if (params.videoUrl !== undefined && params.videoUrl !== null) {
          cacheData.videoUrl = params.videoUrl;
        }
        if (params.videoTitle !== undefined && params.videoTitle !== null) {
          cacheData.videoTitle = params.videoTitle;
        }
        if (params.duration !== undefined && params.duration !== null) {
          cacheData.duration = params.duration;
        }
        if (params.userId !== undefined && params.userId !== null) {
          cacheData.createdBy = params.userId;
        }
        if (Object.keys(cleanMetadata).length > 0) {
          cacheData.metadata = cleanMetadata;
        }
        
        // Validate required fields
        if (!cacheData.contentId || !cacheData.contentType) {
          throw new Error('Missing required fields: contentId or contentType');
        }

        const docRef = doc(db, this.COLLECTION_NAME, params.contentId);
        await setDoc(docRef, cacheData);

        return; // Success - exit the function
      } catch (error: any) {
        console.error(`❌ [CACHE] Error saving transcript (attempt ${attempt}/${MAX_RETRIES}):`, error?.message || error);
        
        // If this is the last attempt, throw the error
        if (attempt === MAX_RETRIES) {
          console.error('❌ [CACHE] All retry attempts exhausted');
          // Include more context about the error
          const errorMessage = error?.message || String(error);
          if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            throw new Error(`Firestore permission denied. Please ensure you are logged in.`);
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            throw new Error(`Network error while saving to cache. Please check your connection.`);
          } else if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
            throw new Error(`Invalid data: Some required fields are missing.`);
          } else {
            throw new Error(`Failed to save transcript to cache: ${errorMessage}`);
          }
        }
        
        // Wait before retrying

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  /**
   * Update cached transcript with AI-formatted version
   */
  static async updateWithFormattedTranscript(
    contentId: string, 
    formattedTranscript: TranscriptLine[]
  ): Promise<void> {
    try {
      if (!db) {
        throw new Error('Firestore is required but not initialized');
      }

      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      
      await updateDoc(docRef, {
        formattedTranscript,
        'metadata.formattedAt': serverTimestamp(),
        'metadata.formattingModel': 'gpt-4',
        'metadata.wasFormatted': true
      });

    } catch (error) {
      console.error('❌ [CACHE] Failed to save formatted transcript:', error);
      throw error;
    }
  }

  /**
   * Delete cached transcript from Firestore
   */
  static async deleteCachedTranscript(contentId: string): Promise<void> {
    try {
      if (!db) {

        return;
      }

      const { deleteDoc } = await import('firebase/firestore');
      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      
      // Try to delete regardless of whether document exists
      // (deleteDoc is idempotent - won't error if doc doesn't exist)
      await deleteDoc(docRef);

    } catch (error) {
      console.error('❌ [CACHE] Failed to delete cached transcript:', error);
      // Don't throw - this is a non-critical operation
    }
  }
  
  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalCached: number;
    totalAccessCount: number;
    popularVideos: Array<{ title: string; accessCount: number }>;
  }> {
    // This would require a more complex query
    // For now, return a placeholder
    return {
      totalCached: 0,
      totalAccessCount: 0,
      popularVideos: []
    };
  }

  /**
   * Debug function to list all cached transcripts
   * Only for development debugging
   */
  static async debugListAllCachedTranscripts(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {

      return;
    }
    
    try {

      const { getDocs, collection: firestoreCollection } = await import('firebase/firestore');
      const querySnapshot = await getDocs(firestoreCollection(db, this.COLLECTION_NAME));

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        console.log(`   - Created At: ${data.createdAt?.toDate?.()?.toISOString()}`);

      });
    } catch (error) {
      console.error('❌ [CACHE DEBUG] Error listing cached transcripts:', error);
    }
  }
}