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
      console.log('🆔 [CACHE] Original URL:', params.videoUrl);
      console.log('🆔 [CACHE] Normalized URL:', normalizedUrl);
      console.log('🆔 [CACHE] Extracting video ID from normalized URL...');
      const videoId = this.extractYouTubeVideoId(normalizedUrl);
      console.log('🆔 [CACHE] Extracted video ID:', videoId);
      if (videoId) {
        const contentId = `youtube_${videoId}`;
        console.log('🆔 [CACHE] Generated content ID:', contentId);
        return contentId;
      } else {
        console.log('❌ [CACHE] Failed to extract video ID, falling back to hash');
        // Fallback to a hash of the URL if we can't extract the ID
        let hash = 0;
        for (let i = 0; i < normalizedUrl.length; i++) {
          const char = normalizedUrl.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const fallbackId = `youtube_fallback_${Math.abs(hash).toString(16)}`;
        console.log('🆔 [CACHE] Generated fallback content ID:', fallbackId);
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
    console.log('🔧 [CACHE] Extracting video ID from:', url);
    
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
        console.log('✅ [CACHE] Extracted video ID:', match[1], 'using pattern:', pattern.source);
        return match[1];
      }
    }
    
    console.log('❌ [CACHE] Failed to extract video ID from URL:', url);
    return null;
  }

  /**
   * Get cached transcript from Firestore
   */
  static async getCachedTranscript(contentId: string): Promise<CachedTranscript | null> {
    try {
      console.log('🔍 [CACHE] Looking up transcript in Firestore');
      console.log('🔍 [CACHE] Collection:', this.COLLECTION_NAME);
      console.log('🔍 [CACHE] Document ID:', contentId);
      
      // Ensure Firestore is available - REQUIRED
      if (!db) {
        console.error('❌ [CACHE] CRITICAL: Firestore not initialized - caching is mandatory');
        throw new Error('Firestore is required for transcript caching');
      }
      
      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('❌ [CACHE] Document does not exist in Firestore');
        console.log('❌ [CACHE] Tried to find:', contentId);
        return null;
      }

      const data = docSnap.data() as CachedTranscript;
      
      // Check if cache is expired
      const createdAt = data.createdAt?.toDate();
      if (createdAt) {
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > this.CACHE_DURATION_DAYS) {
          console.log('Cached transcript expired');
          return null;
        }
      }

      // Update access count and last accessed time
      await updateDoc(docRef, {
        lastAccessed: serverTimestamp(),
        accessCount: increment(1)
      });

      console.log('✅ [CACHE] Found cached transcript!');
      console.log('✅ [CACHE] Document data:', {
        id: data.id,
        contentId: data.contentId,
        videoUrl: data.videoUrl,
        videoTitle: data.videoTitle,
        transcriptLength: data.transcript?.length,
        accessCount: data.accessCount + 1
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
        console.log('💾 [CACHE] Document ID:', params.contentId);
        console.log('💾 [CACHE] Video URL:', params.videoUrl);
        console.log('💾 [CACHE] Video Title:', params.videoTitle);
        
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
        
        const cacheData: any = {
          id: params.contentId,
          contentId: params.contentId,
          contentType: params.contentType,
          videoUrl: params.videoUrl,
          videoTitle: params.videoTitle,
          transcript: params.transcript,
          language: params.language,
          createdAt: serverTimestamp(),
          lastAccessed: serverTimestamp(),
          accessCount: 1
        };
        
        // Only add optional fields if they're defined (Firestore doesn't accept undefined values)
        if (params.duration !== undefined) {
          cacheData.duration = params.duration;
        }
        if (params.userId !== undefined) {
          cacheData.createdBy = params.userId;
        }
        if (Object.keys(cleanMetadata).length > 0) {
          cacheData.metadata = cleanMetadata;
        }

        const docRef = doc(db, this.COLLECTION_NAME, params.contentId);
        await setDoc(docRef, cacheData);

        console.log('✅ [CACHE] Transcript saved to cache successfully');
        console.log('✅ [CACHE] Saved with Document ID:', params.contentId);
        console.log('✅ [CACHE] Content type:', params.contentType);
        console.log('✅ [CACHE] Video title:', params.videoTitle);
        return; // Success - exit the function
      } catch (error: any) {
        console.error(`❌ [CACHE] Error saving transcript (attempt ${attempt}/${MAX_RETRIES}):`, error?.message || error);
        
        // If this is the last attempt, throw the error
        if (attempt === MAX_RETRIES) {
          console.error('❌ [CACHE] All retry attempts exhausted');
          throw new Error(`Failed to save transcript to cache after ${MAX_RETRIES} attempts: ${error?.message || error}`);
        }
        
        // Wait before retrying
        console.log(`🔄 [CACHE] Retrying save in ${RETRY_DELAY}ms...`);
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
      
      console.log('💾 [CACHE] Updating with formatted transcript');
      console.log('💾 [CACHE] Document ID:', contentId);
      console.log('💾 [CACHE] Formatted lines:', formattedTranscript.length);
      
      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      
      await updateDoc(docRef, {
        formattedTranscript,
        'metadata.formattedAt': serverTimestamp(),
        'metadata.formattingModel': 'gpt-4',
        'metadata.wasFormatted': true
      });
      
      console.log('✅ [CACHE] Formatted transcript saved successfully');
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
        console.warn('⚠️ [CACHE] Firestore not initialized, cannot delete transcript');
        return;
      }
      
      console.log('🗑️ [CACHE] Attempting to delete cached transcript');
      console.log('🗑️ [CACHE] Document ID:', contentId);
      
      const { deleteDoc } = await import('firebase/firestore');
      const docRef = doc(db, this.COLLECTION_NAME, contentId);
      
      // Try to delete regardless of whether document exists
      // (deleteDoc is idempotent - won't error if doc doesn't exist)
      await deleteDoc(docRef);
      console.log('✅ [CACHE] Cached transcript deleted successfully');
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
      console.log('Debug function only available in development mode');
      return;
    }
    
    try {
      console.log('🔍 [CACHE DEBUG] Fetching all cached transcripts...');
      const { getDocs, collection: firestoreCollection } = await import('firebase/firestore');
      const querySnapshot = await getDocs(firestoreCollection(db, this.COLLECTION_NAME));
      
      console.log(`🔍 [CACHE DEBUG] Found ${querySnapshot.size} cached transcripts:`);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`💾 Document ID: ${doc.id}`);
        console.log(`   - Video URL: ${data.videoUrl}`);
        console.log(`   - Video Title: ${data.videoTitle}`);
        console.log(`   - Content Type: ${data.contentType}`);
        console.log(`   - Access Count: ${data.accessCount}`);
        console.log(`   - Created At: ${data.createdAt?.toDate?.()?.toISOString()}`);
        console.log('---');
      });
    } catch (error) {
      console.error('❌ [CACHE DEBUG] Error listing cached transcripts:', error);
    }
  }
}